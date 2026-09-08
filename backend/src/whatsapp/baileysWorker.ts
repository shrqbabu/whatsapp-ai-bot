import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  WASocket,
  WAMessage,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import fs from 'node:fs';
import path from 'node:path';
import pino from 'pino';
import QRCode from 'qrcode';
import { config } from '../config/index.js';
import { SessionRepository, WhatsAppStatus } from '../database/repositories/sessionRepository.js';
import { logError, logEvent, logger } from '../utils/logger.js';
import { wsEmitter } from '../websocket/wsEmitter.js';
import { MessageHandler } from './messageHandler.js';

export class BaileysWorker {
  readonly userId: string;
  readonly sessionId: string;
  readonly sessionDir: string;
  private socket: WASocket | null = null;
  private qrCodeDataUrl: string | null = null;
  private currentStatus: WhatsAppStatus = 'DISCONNECTED';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private isExplicitlyClosed = false;

  constructor(userId: string, sessionId: string) {
    this.userId = userId;
    this.sessionId = sessionId;
    this.sessionDir = path.join(config.resolvedStorageDir, userId);

    if (!fs.existsSync(this.sessionDir)) {
      fs.mkdirSync(this.sessionDir, { recursive: true });
    }
  }

  getSocket(): WASocket | null {
    return this.socket;
  }

  getStatus(): WhatsAppStatus {
    return this.currentStatus;
  }

  getQRCode(): string | null {
    return this.qrCodeDataUrl;
  }

  async start(): Promise<void> {
    return this.connect();
  }

  async connect(): Promise<void> {
    this.isExplicitlyClosed = false;

    // Clean up any existing socket before reconnecting to prevent orphaned query timeouts
    if (this.socket) {
      try {
        this.socket.ev.removeAllListeners('connection.update');
        this.socket.ev.removeAllListeners('creds.update');
        this.socket.ev.removeAllListeners('messages.upsert');
        this.socket.end(undefined);
      } catch {
        // ignore cleanup error
      }
      this.socket = null;
    }

    logEvent(
      { userId: this.userId, sessionId: this.sessionId, event: 'WHATSAPP_CONNECTING' },
      'Initializing Baileys socket'
    );

    await this.updateStatus('CONNECTING');

    try {
      const { state, saveCreds } = await useMultiFileAuthState(this.sessionDir);
      const { version } = await fetchLatestBaileysVersion();

      const baileysLogger = pino({ level: 'silent' });

      const sock = makeWASocket({
        version,
        auth: state,
        logger: baileysLogger,
        printQRInTerminal: false,
        syncFullHistory: false,
        browser: ['WhatsApp AI Assistant', 'Chrome', '120.0.0'],
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 25000,
      });

      this.socket = sock;

      sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          logEvent(
            { userId: this.userId, sessionId: this.sessionId, event: 'QR_GENERATED' },
            'New QR code generated for pairing'
          );

          try {
            this.qrCodeDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 8 });
            await this.updateStatus('QR_REQUIRED');

            wsEmitter.sendToUser(this.userId, 'whatsapp.qr', {
              qr: this.qrCodeDataUrl,
            });
          } catch (qrErr) {
            logError(
              { userId: this.userId, sessionId: this.sessionId, event: 'QR_CONVERT_ERROR' },
              qrErr,
              'Failed to generate QR data URL'
            );
          }
        }

        if (connection === 'open') {
          this.reconnectAttempts = 0;
          this.qrCodeDataUrl = null;

          const rawId = sock.user?.id || '';
          const phoneNumber = rawId.split(':')[0] || rawId.split('@')[0] || null;

          logEvent(
            { userId: this.userId, sessionId: this.sessionId, phoneNumber, event: 'WHATSAPP_CONNECTED' },
            `WhatsApp paired successfully: +${phoneNumber}`
          );

          await this.updateStatus('CONNECTED', phoneNumber);

          wsEmitter.sendToUser(this.userId, 'whatsapp.connected', {
            phoneNumber,
          });
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut && !this.isExplicitlyClosed;

          logEvent(
            {
              userId: this.userId,
              sessionId: this.sessionId,
              statusCode,
              shouldReconnect,
              event: 'WHATSAPP_DISCONNECTED',
            },
            `WhatsApp connection closed. Status code: ${statusCode}`
          );

          if (statusCode === DisconnectReason.loggedOut) {
            logEvent(
              { userId: this.userId, sessionId: this.sessionId, event: 'WHATSAPP_LOGGED_OUT' },
              'User was logged out of WhatsApp'
            );
            await this.cleanupAuth();
            await this.updateStatus('LOGGED_OUT');
            wsEmitter.sendToUser(this.userId, 'whatsapp.logged_out', {});
          } else if (shouldReconnect) {
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
              this.reconnectAttempts++;
              const delay = Math.min(3000 * this.reconnectAttempts, 15000);
              logEvent(
                {
                  userId: this.userId,
                  sessionId: this.sessionId,
                  attempt: this.reconnectAttempts,
                  delay,
                  event: 'WHATSAPP_RECONNECTING',
                },
                `Reconnecting WhatsApp (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`
              );

              await this.updateStatus('RECONNECTING');
              wsEmitter.sendToUser(this.userId, 'whatsapp.reconnecting', {
                attempt: this.reconnectAttempts,
                maxAttempts: this.maxReconnectAttempts,
              });

              setTimeout(() => {
                if (!this.isExplicitlyClosed) {
                  this.connect();
                }
              }, delay);
            } else {
              logEvent(
                { userId: this.userId, sessionId: this.sessionId, event: 'WHATSAPP_ERROR' },
                'Max reconnect attempts reached'
              );
              await this.updateStatus('ERROR');
            }
          } else {
            await this.updateStatus('DISCONNECTED');
            wsEmitter.sendToUser(this.userId, 'whatsapp.disconnected', {
              reason: 'Disconnected by user or explicit close',
            });
          }
        }
      });

      sock.ev.on('creds.update', async () => {
        try {
          if (this.isExplicitlyClosed || this.currentStatus === 'LOGGED_OUT') {
            return;
          }
          if (!fs.existsSync(this.sessionDir)) {
            fs.mkdirSync(this.sessionDir, { recursive: true });
          }
          await saveCreds();
        } catch (credsErr) {
          logger.warn({ err: credsErr, sessionDir: this.sessionDir }, 'Failed to save creds or session directory was removed');
        }
      });

      sock.ev.on('messages.upsert', async (upsert) => {
        try {
          await MessageHandler.handleIncomingUpsert(this.userId, this.sessionId, upsert, sock);
        } catch (msgErr) {
          logError(
            { userId: this.userId, sessionId: this.sessionId, event: 'MESSAGE_HANDLER_ERROR' },
            msgErr,
            'Error processing incoming messages upsert'
          );
        }
      });
    } catch (error) {
      logError(
        { userId: this.userId, sessionId: this.sessionId, event: 'WHATSAPP_INIT_ERROR' },
        error,
        'Failed to start Baileys worker'
      );
      await this.updateStatus('ERROR');
      throw error;
    }
  }

  async sendMessage(jid: string, text: string): Promise<WAMessage | undefined> {
    if (!this.socket) {
      throw new Error(`WhatsApp socket is not initialized for user ${this.userId}`);
    }
    return this.socket.sendMessage(jid, { text });
  }

  async disconnect(): Promise<void> {
    this.isExplicitlyClosed = true;
    this.qrCodeDataUrl = null;
    if (this.socket) {
      try {
        this.socket.end(new Error('Explicit user disconnect'));
      } catch (e) {
        // Ignore end errors
      }
      this.socket = null;
    }
    await this.updateStatus('DISCONNECTED');
    wsEmitter.sendToUser(this.userId, 'whatsapp.disconnected', { reason: 'User requested disconnect' });
  }

  async destroy(): Promise<void> {
    await this.disconnect();
    await this.cleanupAuth();
    await this.updateStatus('DISCONNECTED', null);
  }

  private async cleanupAuth(): Promise<void> {
    try {
      this.isExplicitlyClosed = true;
      if (this.socket) {
        try {
          this.socket.ev.removeAllListeners('creds.update');
          this.socket.ev.removeAllListeners('messages.upsert');
          this.socket.ev.removeAllListeners('connection.update');
        } catch {
          // Ignore listener removal errors
        }
      }
      if (fs.existsSync(this.sessionDir)) {
        fs.rmSync(this.sessionDir, { recursive: true, force: true });
      }
    } catch (e) {
      logger.warn({ sessionDir: this.sessionDir, error: e }, 'Failed to clean up session directory');
    }
  }

  private async updateStatus(status: WhatsAppStatus, phoneNumber?: string | null): Promise<void> {
    this.currentStatus = status;
    await SessionRepository.updateStatus(this.sessionId, status, phoneNumber);
    wsEmitter.sendToUser(this.userId, 'whatsapp.status', {
      status,
      phoneNumber,
    });
  }
}
