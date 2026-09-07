import { WASocket, WAMessage } from '@whiskeysockets/baileys';
import { WhatsAppStatus } from '../database/repositories/sessionRepository.js';
export declare class BaileysWorker {
    readonly userId: string;
    readonly sessionId: string;
    readonly sessionDir: string;
    private socket;
    private qrCodeDataUrl;
    private currentStatus;
    private reconnectAttempts;
    private maxReconnectAttempts;
    private isExplicitlyClosed;
    constructor(userId: string, sessionId: string);
    getSocket(): WASocket | null;
    getStatus(): WhatsAppStatus;
    getQRCode(): string | null;
    start(): Promise<void>;
    connect(): Promise<void>;
    sendMessage(jid: string, text: string): Promise<WAMessage | undefined>;
    disconnect(): Promise<void>;
    destroy(): Promise<void>;
    private cleanupAuth;
    private updateStatus;
}
