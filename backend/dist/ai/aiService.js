"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIService = void 0;
const aiSettingsRepository_js_1 = require("../database/repositories/aiSettingsRepository.js");
const conversationsRepository_js_1 = require("../database/repositories/conversationsRepository.js");
const messagesRepository_js_1 = require("../database/repositories/messagesRepository.js");
const replyScheduler_js_1 = require("../queue/replyScheduler.js");
const logger_js_1 = require("../utils/logger.js");
const wsEmitter_js_1 = require("../websocket/wsEmitter.js");
const ProviderFactory_js_1 = require("./providers/ProviderFactory.js");
const sessionManager_js_1 = require("../whatsapp/sessionManager.js");
class AIService {
    static async processAutoReply(params) {
        const { userId, sessionId, conversation, chatJid, incomingText, senderName, fixedMessageText } = params;
        const aiSettings = await aiSettingsRepository_js_1.AISettingsRepository.findBySessionId(sessionId);
        if (!aiSettings) {
            (0, logger_js_1.logEvent)({ userId, sessionId, event: 'AI_SKIPPED' }, 'No AI settings found for session');
            return null;
        }
        wsEmitter_js_1.wsEmitter.sendToUser(userId, 'ai.processing', {
            conversationId: conversation.id,
            chatJid,
        });
        let replyText = '';
        if (fixedMessageText) {
            replyText = fixedMessageText;
        }
        else {
            try {
                const rawHistory = await messagesRepository_js_1.MessagesRepository.listByConversation(conversation.id, 10, 0);
                const conversationHistory = rawHistory
                    .filter((m) => m.text && m.text.trim().length > 0)
                    .map((m) => ({
                    role: m.is_from_me ? 'assistant' : 'user',
                    content: m.text,
                }));
                const provider = ProviderFactory_js_1.ProviderFactory.getProvider(aiSettings.model);
                replyText = await provider.generateReply({
                    systemPrompt: aiSettings.system_prompt,
                    conversationHistory,
                    incomingMessage: incomingText,
                    senderName,
                    modelName: aiSettings.model,
                });
            }
            catch (error) {
                (0, logger_js_1.logError)({ userId, sessionId, conversationId: conversation.id, event: 'AI_GENERATION_FAILED' }, error, 'Failed generating AI reply');
                return null;
            }
        }
        if (!replyText || replyText.trim().length === 0) {
            return null;
        }
        const delaySeconds = aiSettings.reply_delay || 0;
        (0, logger_js_1.logEvent)({ userId, sessionId, conversationId: conversation.id, event: 'AI_REPLY_SCHEDULED' }, `Scheduling reply in ${delaySeconds}s: "${replyText.slice(0, 50)}..."`);
        return replyScheduler_js_1.ReplyScheduler.schedule(delaySeconds, async () => {
            const isTakeover = await conversationsRepository_js_1.ConversationsRepository.isTakeoverActive(conversation.id);
            if (isTakeover) {
                (0, logger_js_1.logEvent)({ userId, sessionId, conversationId: conversation.id, event: 'AI_REPLY_ABORTED' }, 'Manual takeover was activated while reply delay was running');
                return null;
            }
            const sendResult = await sessionManager_js_1.WhatsAppSessionManager.sendMessage(userId, chatJid, replyText);
            const now = new Date().toISOString();
            const waMessageId = sendResult?.key?.id || `ai_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
            const sentMessage = await messagesRepository_js_1.MessagesRepository.create({
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
            await conversationsRepository_js_1.ConversationsRepository.updateLastMessage(conversation.id, replyText, now);
            wsEmitter_js_1.wsEmitter.sendToUser(userId, 'message.sent', {
                message: sentMessage,
                conversationId: conversation.id,
            });
            wsEmitter_js_1.wsEmitter.sendToUser(userId, 'ai.replied', {
                conversationId: conversation.id,
                messageId: sentMessage.id,
                text: replyText,
            });
            (0, logger_js_1.logEvent)({ userId, sessionId, conversationId: conversation.id, waMessageId, event: 'MESSAGE_SENT' }, `AI Auto-Reply sent to ${chatJid}`);
            return sentMessage;
        });
    }
}
exports.AIService = AIService;
//# sourceMappingURL=aiService.js.map