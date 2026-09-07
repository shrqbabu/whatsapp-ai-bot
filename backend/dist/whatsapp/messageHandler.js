"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageHandler = void 0;
const aiSettingsRepository_js_1 = require("../database/repositories/aiSettingsRepository.js");
const contactsRepository_js_1 = require("../database/repositories/contactsRepository.js");
const conversationsRepository_js_1 = require("../database/repositories/conversationsRepository.js");
const messagesRepository_js_1 = require("../database/repositories/messagesRepository.js");
const aiService_js_1 = require("../ai/aiService.js");
const rulesEngine_js_1 = require("../ai/rulesEngine.js");
const messageDebouncer_js_1 = require("../queue/messageDebouncer.js");
const logger_js_1 = require("../utils/logger.js");
const wsEmitter_js_1 = require("../websocket/wsEmitter.js");
class MessageHandler {
    static async handleIncomingUpsert(userId, sessionId, upsert, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    sock) {
        if (!upsert.messages || upsert.messages.length === 0)
            return;
        for (const msg of upsert.messages) {
            try {
                await this.processSingleMessage(userId, sessionId, msg);
            }
            catch (error) {
                logger_js_1.logger.error({ userId, sessionId, error }, 'Error processing message in upsert loop');
            }
        }
    }
    static async processSingleMessage(userId, sessionId, msg) {
        const key = msg.key;
        if (!key || !key.remoteJid)
            return;
        const chatJid = key.remoteJid;
        const isFromMe = Boolean(key.fromMe);
        const waMessageId = key.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const isGroup = chatJid.endsWith('@g.us');
        const senderJid = isGroup ? key.participant || chatJid : chatJid;
        // 1. Safety & Loop Prevention: Ignore own messages
        if (isFromMe) {
            return;
        }
        // 2. Ignore status broadcast
        if (chatJid.includes('status@broadcast') || chatJid.endsWith('@broadcast')) {
            return;
        }
        // 3. Extract text and message type
        const { text, messageType } = this.extractMessageContent(msg);
        // 4. Deduplication Check
        const isDuplicate = await messagesRepository_js_1.MessagesRepository.isDuplicate(sessionId, waMessageId);
        if (isDuplicate) {
            (0, logger_js_1.logEvent)({ userId, sessionId, waMessageId, event: 'DUPLICATE_MESSAGE_IGNORED' }, 'Duplicate WhatsApp message');
            return;
        }
        (0, logger_js_1.logEvent)({ userId, sessionId, chatJid, waMessageId, event: 'MESSAGE_RECEIVED' }, `Incoming WhatsApp message from ${senderJid}: "${(text || '').slice(0, 40)}"`);
        // 5. Upsert Contact & Conversation
        const senderName = msg.pushName || senderJid.split('@')[0];
        const contact = await contactsRepository_js_1.ContactsRepository.upsertContact({
            sessionId,
            userId,
            waJid: senderJid,
            displayName: senderName,
            phoneNumber: senderJid.split('@')[0],
        });
        const conversation = await conversationsRepository_js_1.ConversationsRepository.getOrCreateConversation({
            sessionId,
            userId,
            chatJid,
            chatName: isGroup ? (msg.pushName || 'Group Chat') : senderName,
            isGroup,
            contactId: contact.id,
        });
        // 6. Persist incoming message
        const now = new Date().toISOString();
        const savedMessage = await messagesRepository_js_1.MessagesRepository.create({
            conversation_id: conversation.id,
            session_id: sessionId,
            user_id: userId,
            wa_message_id: waMessageId,
            direction: 'INCOMING',
            sender: senderJid,
            receiver: chatJid,
            message_type: messageType,
            text: text || null,
            is_from_me: false,
            ai_generated: false,
            created_at: now,
        });
        // Update conversation preview and timestamp
        await conversationsRepository_js_1.ConversationsRepository.updateLastMessage(conversation.id, text || `[${messageType}]`, now);
        // 7. Notify Android App over Authenticated WebSocket
        wsEmitter_js_1.wsEmitter.sendToUser(userId, 'message.received', {
            message: savedMessage,
            conversation: {
                ...conversation,
                last_message_preview: text || `[${messageType}]`,
                last_message_at: now,
            },
        });
        // 8. Evaluate Rules Engine
        const aiSettings = await aiSettingsRepository_js_1.AISettingsRepository.findBySessionId(sessionId);
        if (!aiSettings)
            return;
        const evaluation = await rulesEngine_js_1.RulesEngine.evaluate({
            sessionId,
            isFromMe,
            text,
            isGroup,
            contact,
            conversation,
            aiSettings,
        });
        if (!evaluation.shouldReply) {
            (0, logger_js_1.logEvent)({ userId, sessionId, conversationId: conversation.id, event: 'AI_SKIPPED' }, `AI reply skipped: ${evaluation.reason}`);
            return;
        }
        // 9. If Outside Business Hours message is configured
        if (evaluation.outsideHoursMessage) {
            await aiService_js_1.AIService.processAutoReply({
                userId,
                sessionId,
                conversation,
                chatJid,
                incomingText: text || '',
                senderName,
                fixedMessageText: evaluation.outsideHoursMessage,
            });
            return;
        }
        // 10. Intelligent Debounce for burst messages
        messageDebouncer_js_1.MessageDebouncer.enqueue({
            sessionId,
            userId,
            conversationId: conversation.id,
            chatJid,
            senderJid,
            text: text || '',
            debounceSeconds: aiSettings.debounce_delay,
            onExecute: async (combinedText) => {
                await aiService_js_1.AIService.processAutoReply({
                    userId,
                    sessionId,
                    conversation,
                    chatJid,
                    incomingText: combinedText,
                    senderName,
                });
            },
        });
    }
    static extractMessageContent(msg) {
        const m = msg.message;
        if (!m)
            return { text: null, messageType: 'unsupported' };
        if (m.conversation) {
            return { text: m.conversation, messageType: 'text' };
        }
        if (m.extendedTextMessage?.text) {
            return { text: m.extendedTextMessage.text, messageType: 'text' };
        }
        if (m.imageMessage) {
            return { text: m.imageMessage.caption || null, messageType: 'image' };
        }
        if (m.videoMessage) {
            return { text: m.videoMessage.caption || null, messageType: 'video' };
        }
        if (m.documentMessage) {
            return { text: m.documentMessage.caption || null, messageType: 'document' };
        }
        if (m.audioMessage) {
            return { text: null, messageType: 'audio' };
        }
        if (m.stickerMessage) {
            return { text: null, messageType: 'sticker' };
        }
        if (m.locationMessage) {
            return { text: null, messageType: 'location' };
        }
        if (m.contactMessage || m.contactsArrayMessage) {
            return { text: null, messageType: 'contact' };
        }
        return { text: null, messageType: 'unsupported' };
    }
}
exports.MessageHandler = MessageHandler;
//# sourceMappingURL=messageHandler.js.map