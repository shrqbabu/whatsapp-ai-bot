"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaileysWorker = void 0;
const baileys_1 = __importStar(require("@whiskeysockets/baileys"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const pino_1 = __importDefault(require("pino"));
const qrcode_1 = __importDefault(require("qrcode"));
const index_js_1 = require("../config/index.js");
const sessionRepository_js_1 = require("../database/repositories/sessionRepository.js");
const logger_js_1 = require("../utils/logger.js");
const wsEmitter_js_1 = require("../websocket/wsEmitter.js");
const messageHandler_js_1 = require("./messageHandler.js");
class BaileysWorker {
    userId;
    sessionId;
    sessionDir;
    socket = null;
    qrCodeDataUrl = null;
    currentStatus = 'DISCONNECTED';
    reconnectAttempts = 0;
    maxReconnectAttempts = 5;
    isExplicitlyClosed = false;
    constructor(userId, sessionId) {
        this.userId = userId;
        this.sessionId = sessionId;
        this.sessionDir = node_path_1.default.join(index_js_1.config.resolvedStorageDir, userId);
        if (!node_fs_1.default.existsSync(this.sessionDir)) {
            node_fs_1.default.mkdirSync(this.sessionDir, { recursive: true });
        }
    }
    getSocket() {
        return this.socket;
    }
    getStatus() {
        return this.currentStatus;
    }
    getQRCode() {
        return this.qrCodeDataUrl;
    }
    async start() {
        return this.connect();
    }
    async connect() {
        this.isExplicitlyClosed = false;
        (0, logger_js_1.logEvent)({ userId: this.userId, sessionId: this.sessionId, event: 'WHATSAPP_CONNECTING' }, 'Initializing Baileys socket');
        await this.updateStatus('CONNECTING');
        try {
            const { state, saveCreds } = await (0, baileys_1.useMultiFileAuthState)(this.sessionDir);
            const { version } = await (0, baileys_1.fetchLatestBaileysVersion)();
            const baileysLogger = (0, pino_1.default)({ level: 'silent' });
            const sock = (0, baileys_1.default)({
                version,
                auth: state,
                logger: baileysLogger,
                printQRInTerminal: false,
                syncFullHistory: false,
                browser: ['WhatsApp AI Assistant', 'Chrome', '120.0.0'],
                connectTimeoutMs: 60000,
                keepAliveIntervalMs: 25000,
            });
            this.socket = sock;
            sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update;
                if (qr) {
                    (0, logger_js_1.logEvent)({ userId: this.userId, sessionId: this.sessionId, event: 'QR_GENERATED' }, 'New QR code generated for pairing');
                    try {
                        this.qrCodeDataUrl = await qrcode_1.default.toDataURL(qr, { margin: 2, scale: 8 });
                        await this.updateStatus('QR_REQUIRED');
                        wsEmitter_js_1.wsEmitter.sendToUser(this.userId, 'whatsapp.qr', {
                            qr: this.qrCodeDataUrl,
                        });
                    }
                    catch (qrErr) {
                        (0, logger_js_1.logError)({ userId: this.userId, sessionId: this.sessionId, event: 'QR_CONVERT_ERROR' }, qrErr, 'Failed to generate QR data URL');
                    }
                }
                if (connection === 'open') {
                    this.reconnectAttempts = 0;
                    this.qrCodeDataUrl = null;
                    const rawId = sock.user?.id || '';
                    const phoneNumber = rawId.split(':')[0] || rawId.split('@')[0] || null;
                    (0, logger_js_1.logEvent)({ userId: this.userId, sessionId: this.sessionId, phoneNumber, event: 'WHATSAPP_CONNECTED' }, `WhatsApp paired successfully: +${phoneNumber}`);
                    await this.updateStatus('CONNECTED', phoneNumber);
                    wsEmitter_js_1.wsEmitter.sendToUser(this.userId, 'whatsapp.connected', {
                        phoneNumber,
                    });
                }
                if (connection === 'close') {
                    const statusCode = lastDisconnect?.error?.output?.statusCode;
                    const shouldReconnect = statusCode !== baileys_1.DisconnectReason.loggedOut && !this.isExplicitlyClosed;
                    (0, logger_js_1.logEvent)({
                        userId: this.userId,
                        sessionId: this.sessionId,
                        statusCode,
                        shouldReconnect,
                        event: 'WHATSAPP_DISCONNECTED',
                    }, `WhatsApp connection closed. Status code: ${statusCode}`);
                    if (statusCode === baileys_1.DisconnectReason.loggedOut) {
                        (0, logger_js_1.logEvent)({ userId: this.userId, sessionId: this.sessionId, event: 'WHATSAPP_LOGGED_OUT' }, 'User was logged out of WhatsApp');
                        await this.cleanupAuth();
                        await this.updateStatus('LOGGED_OUT');
                        wsEmitter_js_1.wsEmitter.sendToUser(this.userId, 'whatsapp.logged_out', {});
                    }
                    else if (shouldReconnect) {
                        if (this.reconnectAttempts < this.maxReconnectAttempts) {
                            this.reconnectAttempts++;
                            const delay = Math.min(3000 * this.reconnectAttempts, 15000);
                            (0, logger_js_1.logEvent)({
                                userId: this.userId,
                                sessionId: this.sessionId,
                                attempt: this.reconnectAttempts,
                                delay,
                                event: 'WHATSAPP_RECONNECTING',
                            }, `Reconnecting WhatsApp (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);
                            await this.updateStatus('RECONNECTING');
                            wsEmitter_js_1.wsEmitter.sendToUser(this.userId, 'whatsapp.reconnecting', {
                                attempt: this.reconnectAttempts,
                                maxAttempts: this.maxReconnectAttempts,
                            });
                            setTimeout(() => {
                                if (!this.isExplicitlyClosed) {
                                    this.connect();
                                }
                            }, delay);
                        }
                        else {
                            (0, logger_js_1.logEvent)({ userId: this.userId, sessionId: this.sessionId, event: 'WHATSAPP_ERROR' }, 'Max reconnect attempts reached');
                            await this.updateStatus('ERROR');
                        }
                    }
                    else {
                        await this.updateStatus('DISCONNECTED');
                        wsEmitter_js_1.wsEmitter.sendToUser(this.userId, 'whatsapp.disconnected', {
                            reason: 'Disconnected by user or explicit close',
                        });
                    }
                }
            });
            sock.ev.on('creds.update', saveCreds);
            sock.ev.on('messages.upsert', async (upsert) => {
                try {
                    await messageHandler_js_1.MessageHandler.handleIncomingUpsert(this.userId, this.sessionId, upsert, sock);
                }
                catch (msgErr) {
                    (0, logger_js_1.logError)({ userId: this.userId, sessionId: this.sessionId, event: 'MESSAGE_HANDLER_ERROR' }, msgErr, 'Error processing incoming messages upsert');
                }
            });
        }
        catch (error) {
            (0, logger_js_1.logError)({ userId: this.userId, sessionId: this.sessionId, event: 'WHATSAPP_INIT_ERROR' }, error, 'Failed to start Baileys worker');
            await this.updateStatus('ERROR');
            throw error;
        }
    }
    async sendMessage(jid, text) {
        if (!this.socket) {
            throw new Error(`WhatsApp socket is not initialized for user ${this.userId}`);
        }
        return this.socket.sendMessage(jid, { text });
    }
    async disconnect() {
        this.isExplicitlyClosed = true;
        this.qrCodeDataUrl = null;
        if (this.socket) {
            try {
                this.socket.end(new Error('Explicit user disconnect'));
            }
            catch (e) {
                // Ignore end errors
            }
            this.socket = null;
        }
        await this.updateStatus('DISCONNECTED');
        wsEmitter_js_1.wsEmitter.sendToUser(this.userId, 'whatsapp.disconnected', { reason: 'User requested disconnect' });
    }
    async destroy() {
        await this.disconnect();
        await this.cleanupAuth();
        await this.updateStatus('DISCONNECTED', null);
    }
    async cleanupAuth() {
        try {
            if (node_fs_1.default.existsSync(this.sessionDir)) {
                node_fs_1.default.rmSync(this.sessionDir, { recursive: true, force: true });
            }
        }
        catch (e) {
            logger_js_1.logger.warn({ sessionDir: this.sessionDir, error: e }, 'Failed to clean up session directory');
        }
    }
    async updateStatus(status, phoneNumber) {
        this.currentStatus = status;
        await sessionRepository_js_1.SessionRepository.updateStatus(this.sessionId, status, phoneNumber);
        wsEmitter_js_1.wsEmitter.sendToUser(this.userId, 'whatsapp.status', {
            status,
            phoneNumber,
        });
    }
}
exports.BaileysWorker = BaileysWorker;
//# sourceMappingURL=baileysWorker.js.map