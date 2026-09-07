export interface ConversationEntity {
    id: string;
    session_id: string;
    user_id: string;
    contact_id: string | null;
    chat_jid: string;
    chat_name: string | null;
    is_group: boolean;
    takeover_active: boolean;
    takeover_until: string | null;
    last_message_at: string | null;
    last_message_preview: string | null;
    created_at: string;
    updated_at: string;
}
export declare class ConversationsRepository {
    static list(sessionId: string, limit?: number, offset?: number): Promise<ConversationEntity[]>;
    static listByUserId(userId: string, options?: {
        limit?: number;
        offset?: number;
        search?: string;
    }): Promise<{
        items: ConversationEntity[];
        total: number;
    }>;
    static findById(id: string, userId?: string): Promise<ConversationEntity | null>;
    static findByJid(sessionId: string, chatJid: string): Promise<ConversationEntity | null>;
    static upsert(sessionId: string, userId: string, chatJid: string, isGroup: boolean, contactId?: string | null, chatName?: string | null): Promise<ConversationEntity>;
    static getOrCreateConversation(data: {
        sessionId: string;
        userId: string;
        chatJid: string;
        chatName?: string | null;
        isGroup: boolean;
        contactId?: string | null;
    }): Promise<ConversationEntity>;
    static updateLastMessage(id: string, preview: string, timestamp?: string): Promise<void>;
    static setTakeover(id: string, active: boolean, untilOrMinutes?: string | number | null): Promise<ConversationEntity>;
    static isTakeoverActive(id: string): Promise<boolean>;
    private static mapEntity;
}
