import { AISettingsRepository } from '../database/repositories/aiSettingsRepository.js';
import { ConversationsRepository } from '../database/repositories/conversationsRepository.js';
import { MessagesRepository } from '../database/repositories/messagesRepository.js';
import { ReplyScheduler } from '../queue/replyScheduler.js';
import { logError, logEvent } from '../utils/logger.js';
import { wsEmitter } from '../websocket/wsEmitter.js';
import { ProviderFactory } from './providers/ProviderFactory.js';
import { WhatsAppSessionManager } from '../whatsapp/sessionManager.js';
export class AIService {
    static async processAutoReply(params) {
        const { userId, sessionId, conversation, chatJid, incomingText, senderName, fixedMessageText } = params;
        const aiSettings = await AISettingsRepository.findBySessionId(sessionId);
        if (!aiSettings) {
            logEvent({ userId, sessionId, event: 'AI_SKIPPED' }, 'No AI settings found for session');
            return null;
        }
        wsEmitter.sendToUser(userId, 'ai.processing', {
            conversationId: conversation.id,
            chatJid,
        });
        let replyText = '';
        if (fixedMessageText) {
            replyText = fixedMessageText;
        }
        else {
            try {
                const rawHistory = await MessagesRepository.listByConversation(conversation.id, 10, 0);
                const conversationHistory = rawHistory
                    .filter((m) => m.text && m.text.trim().length > 0)
                    .map((m) => ({
                    role: m.is_from_me ? 'assistant' : 'user',
                    content: m.text,
                }));
                const provider = ProviderFactory.getProvider(aiSettings.model);
                replyText = await provider.generateReply({
                    systemPrompt: aiSettings.system_prompt,
                    conversationHistory,
                    incomingMessage: incomingText,
                    senderName,
                    modelName: aiSettings.model,
                    apiKey: aiSettings.api_key,
                    apiBaseUrl: aiSettings.api_base_url,
                });
            }
            catch (error) {
                logError({ userId, sessionId, conversationId: conversation.id, event: 'AI_GENERATION_FAILED' }, error, 'Failed generating AI reply');
                return null;
            }
        }
        if (!replyText || replyText.trim().length === 0) {
            return null;
        }
        const delaySeconds = aiSettings.reply_delay || 0;
        logEvent({ userId, sessionId, conversationId: conversation.id, event: 'AI_REPLY_SCHEDULED' }, `Scheduling reply in ${delaySeconds}s: "${replyText.slice(0, 50)}..."`);
        return ReplyScheduler.schedule(delaySeconds, async () => {
            const isTakeover = await ConversationsRepository.isTakeoverActive(conversation.id);
            if (isTakeover) {
                logEvent({ userId, sessionId, conversationId: conversation.id, event: 'AI_REPLY_ABORTED' }, 'Manual takeover was activated while reply delay was running');
                return null;
            }
            const sendResult = await WhatsAppSessionManager.sendMessage(userId, chatJid, replyText);
            const now = new Date().toISOString();
            const waMessageId = sendResult?.key?.id || `ai_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
            const sentMessage = await MessagesRepository.create({
                conversation_id: conversation.id,
                session_id: sessionId,
                user_id: userId,
                wa_message_id: waMessageId,
                direction: 'OUTGOING',
                sender: 'me',
                receiver: chatJid,
                message_type: 'text',
                text: replyText,
                is_from_me: true,
                ai_generated: !fixedMessageText,
                created_at: now,
            });
            await ConversationsRepository.updateLastMessage(conversation.id, replyText, now);
            wsEmitter.sendToUser(userId, 'message.sent', {
                message: sentMessage,
                conversationId: conversation.id,
            });
            wsEmitter.sendToUser(userId, 'ai.replied', {
                conversationId: conversation.id,
                messageId: sentMessage.id,
                text: replyText,
            });
            logEvent({ userId, sessionId, conversationId: conversation.id, waMessageId, event: 'MESSAGE_SENT' }, `AI Auto-Reply sent to ${chatJid}`);
            return sentMessage;
        });
    }
}
//# sourceMappingURL=aiService.js.map