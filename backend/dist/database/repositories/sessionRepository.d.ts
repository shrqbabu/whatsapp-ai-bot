export type WhatsAppStatus = 'DISCONNECTED' | 'CONNECTING' | 'QR_REQUIRED' | 'CONNECTED' | 'RECONNECTING' | 'LOGGED_OUT' | 'ERROR';
export interface WhatsAppSessionEntity {
    id: string;
    user_id: string;
    phone_number: string | null;
    status: WhatsAppStatus;
    connected_at: string | null;
    last_seen_at: string | null;
    created_at: string;
    updated_at: string;
}
export declare class SessionRepository {
    static findByUserId(userId: string): Promise<WhatsAppSessionEntity | null>;
    static findById(id: string): Promise<WhatsAppSessionEntity | null>;
    static getOrCreateByUserId(userId: string): Promise<WhatsAppSessionEntity>;
    static updateStatus(id: string, status: WhatsAppStatus, phoneNumber?: string | null): Promise<void>;
    static listAllActiveSessions(): Promise<WhatsAppSessionEntity[]>;
}
