import { WAMessage } from '@whiskeysockets/baileys';
import { WhatsAppStatus } from '../database/repositories/sessionRepository.js';
import { BaileysWorker } from './baileysWorker.js';
export declare class WhatsAppSessionManager {
    private static workers;
    static getWorker(userId: string): Promise<BaileysWorker>;
    static connectSession(userId: string): Promise<{
        status: WhatsAppStatus;
        qr: string | null;
    }>;
    static disconnectSession(userId: string): Promise<void>;
    static destroySession(userId: string): Promise<void>;
    static getSessionStatus(userId: string): Promise<{
        status: WhatsAppStatus;
        phoneNumber: string | null;
        qr: string | null;
    }>;
    static getQRCode(userId: string): Promise<string | null>;
    static sendMessage(userId: string, toJid: string, text: string): Promise<WAMessage | undefined>;
    static restoreActiveSessions(): Promise<void>;
    static getActiveSessionCount(): number;
}
