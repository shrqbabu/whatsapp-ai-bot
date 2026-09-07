export interface MessageEntity {
    id: string;
    conversation_id: string;
    session_id: string;
    user_id: string;
    wa_message_id: string;
    direction: 'INCOMING' | 'OUTGOING';
    sender: string;
    receiver: string;
    message_type: string;
    text: string | null;
    is_from_me: boolean;
    ai_generated: boolean;
    created_at: string;
}
export declare class MessagesRepository {
    static existsByWaId(sessionId: string, waMessageId: string): Promise<boolean>;
    static isDuplicate(sessionId: string, waMessageId: string): Promise<boolean>;
    static create(data: {
        conversation_id?: string;
        conversationId?: string;
        session_id?: string;
        sessionId?: string;
        user_id?: string;
        userId?: string;
        wa_message_id?: string;
        waMessageId?: string;
        direction: 'INCOMING' | 'OUTGOING';
        sender: string;
        receiver: string;
        message_type?: string;
        messageType?: string;
        text?: string | null;
        is_from_me?: boolean;
        isFromMe?: boolean;
        ai_generated?: boolean;
        aiGenerated?: boolean;
        created_at?: string;
        createdAt?: string;
    }): Promise<MessageEntity>;
    static listByConversation(conversationId: string, limit?: number, offset?: number): Promise<MessageEntity[]>;
    static getRecentContext(conversationId: string, maxMessages?: number): Promise<MessageEntity[]>;
    static countTodayMessages(sessionId: string): Promise<number>;
    static countTodayAiReplies(sessionId: string): Promise<number>;
    private static mapEntity;
}
