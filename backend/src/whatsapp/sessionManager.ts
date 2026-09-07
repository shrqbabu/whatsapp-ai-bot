import { WAMessage } from '@whiskeysockets/baileys';
import { SessionRepository, WhatsAppStatus } from '../database/repositories/sessionRepository.js';
import { logEvent, logger } from '../utils/logger.js';
import { BaileysWorker } from './baileysWorker.js';

export class WhatsAppSessionManager {
  private static workers: Map<string, BaileysWorker> = new Map();

  static async getWorker(userId: string): Promise<BaileysWorker> {
    let worker = this.workers.get(userId);
    if (!worker) {
      const session = await SessionRepository.getOrCreateByUserId(userId);
      worker = new BaileysWorker(userId, session.id);
      this.workers.set(userId, worker);
    }
    return worker;
  }

  static async connectSession(userId: string): Promise<{
    status: WhatsAppStatus;
    qr: string | null;
  }> {
    const worker = await this.getWorker(userId);
    await worker.connect();
    return {
      status: worker.getStatus(),
      qr: worker.getQRCode(),
    };
  }

  static async disconnectSession(userId: string): Promise<void> {
    const worker = this.workers.get(userId);
    if (worker) {
      await worker.disconnect();
    } else {
      const session = await SessionRepository.findByUserId(userId);
      if (session) {
        await SessionRepository.updateStatus(session.id, 'DISCONNECTED');
      }
    }
    logEvent({ userId, event: 'SESSION_DISCONNECTED' }, 'User disconnected WhatsApp session');
  }

  static async destroySession(userId: string): Promise<void> {
    const worker = this.workers.get(userId);
    if (worker) {
      await worker.destroy();
      this.workers.delete(userId);
    } else {
      const session = await SessionRepository.findByUserId(userId);
      if (session) {
        await SessionRepository.updateStatus(session.id, 'DISCONNECTED', null);
      }
    }
    logEvent({ userId, event: 'SESSION_DESTROYED' }, 'User destroyed and reset WhatsApp session');
  }

  static async getSessionStatus(userId: string): Promise<{
    status: WhatsAppStatus;
    phoneNumber: string | null;
    qr: string | null;
  }> {
    const session = await SessionRepository.getOrCreateByUserId(userId);
    const worker = this.workers.get(userId);

    const status = worker ? worker.getStatus() : session.status;
    const qr = worker ? worker.getQRCode() : null;

    return {
      status,
      phoneNumber: session.phone_number,
      qr,
    };
  }

  static async getQRCode(userId: string): Promise<string | null> {
    const worker = this.workers.get(userId);
    return worker ? worker.getQRCode() : null;
  }

  static async sendMessage(
    userId: string,
    toJid: string,
    text: string
  ): Promise<WAMessage | undefined> {
    const worker = await this.getWorker(userId);
    return worker.sendMessage(toJid, text);
  }

  static async restoreActiveSessions(): Promise<void> {
    try {
      const activeSessions = await SessionRepository.listAllActiveSessions();
      logEvent(
        { count: activeSessions.length, event: 'RESTORE_SESSIONS_INIT' },
        `Found ${activeSessions.length} active WhatsApp sessions to restore`
      );

      for (const session of activeSessions) {
        try {
          const worker = await this.getWorker(session.user_id);
          worker.connect().catch((err) => {
            logger.error({ err, userId: session.user_id }, 'Failed background session restore');
          });
        } catch (sessionErr) {
          logger.error({ sessionErr, userId: session.user_id }, 'Error restoring session instance');
        }
      }
    } catch (err) {
      logger.error({ err }, 'Error querying active sessions during restore');
    }
  }

  static getActiveSessionCount(): number {
    return this.workers.size;
  }
}
