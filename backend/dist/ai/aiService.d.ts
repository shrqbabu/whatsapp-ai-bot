import { ConversationEntity } from '../database/repositories/conversationsRepository.js';
import { MessageEntity } from '../database/repositories/messagesRepository.js';
export declare class AIService {
    static processAutoReply(params: {
        userId: string;
        sessionId: string;
        conversation: ConversationEntity;
        chatJid: string;
        incomingText: string;
        senderName?: string;
        fixedMessageText?: string;
    }): Promise<MessageEntity | null>;
}
