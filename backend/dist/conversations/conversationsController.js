"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationsController = exports.sendMessageSchema = exports.takeoverSchema = void 0;
const zod_1 = require("zod");
const conversationsRepository_js_1 = require("../database/repositories/conversationsRepository.js");
const messagesRepository_js_1 = require("../database/repositories/messagesRepository.js");
const sessionRepository_js_1 = require("../database/repositories/sessionRepository.js");
const sessionManager_js_1 = require("../whatsapp/sessionManager.js");
const errors_js_1 = require("../utils/errors.js");
const logger_js_1 = require("../utils/logger.js");
const wsEmitter_js_1 = require("../websocket/wsEmitter.js");
exports.takeoverSchema = zod_1.z.object({
    duration_minutes: zod_1.z.number().int().min(1).max(1440).optional().nullable(),
    durationMinutes: zod_1.z.number().int().min(1).max(1440).optional().nullable(),
});
exports.sendMessageSchema = zod_1.z.object({
    text: zod_1.z.string().min(1, 'Message text cannot be empty'),
});
class ConversationsController {
    static async listConversations(req, res, next) {
        try {
            const userId = req.user.userId;
            const session = await sessionRepository_js_1.SessionRepository.getOrCreateByUserId(userId);
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
            const offset = req.query.offset ? parseInt(req.query.offset, 10) : 0;
            const search = req.query.search;
            if (search) {
                const result = await conversationsRepository_js_1.ConversationsRepository.listByUserId(userId, { limit, offset, search });
                res.status(200).json({
                    success: true,
                    data: result.items,
                    pagination: {
                        total: result.total,
                        limit,
                        offset,
                    },
                });
            }
            else {
                const conversations = await conversationsRepository_js_1.ConversationsRepository.list(session.id, limit, offset);
                res.status(200).json({
                    success: true,
                    data: conversations,
                });
            }
        }
        catch (error) {
            next(error);
        }
    }
    static async getMessages(req, res, next) {
        try {
            const userId = req.user.userId;
            const conversationId = req.params.id;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
            const offset = req.query.offset ? parseInt(req.query.offset, 10) : 0;
            // Scoped to current authenticated user
            const conversation = await conversationsRepository_js_1.ConversationsRepository.findById(conversationId, userId);
            if (!conversation) {
                throw new errors_js_1.NotFoundError('Conversation not found');
            }
            const messages = await messagesRepository_js_1.MessagesRepository.listByConversation(conversationId, limit, offset);
            res.status(200).json({
                success: true,
                data: messages,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async takeover(req, res, next) {
        try {
            const userId = req.user.userId;
            const conversationId = req.params.id;
            const validated = exports.takeoverSchema.parse(req.body);
            const duration = validated.duration_minutes || validated.durationMinutes;
            // Scoped to current authenticated user
            const conversation = await conversationsRepository_js_1.ConversationsRepository.findById(conversationId, userId);
            if (!conversation) {
                throw new errors_js_1.NotFoundError('Conversation not found');
            }
            const updated = await conversationsRepository_js_1.ConversationsRepository.setTakeover(conversationId, true, duration);
            (0, logger_js_1.logEvent)({ userId, conversationId, event: 'TAKEOVER_ENABLED' }, 'Manual takeover enabled on chat');
            wsEmitter_js_1.wsEmitter.sendToUser(userId, 'takeover.changed', {
                conversationId,
                takeoverActive: true,
                takeoverUntil: updated.takeover_until,
            });
            res.status(200).json({
                success: true,
                data: updated,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async resume(req, res, next) {
        try {
            const userId = req.user.userId;
            const conversationId = req.params.id;
            // Scoped to current authenticated user
            const conversation = await conversationsRepository_js_1.ConversationsRepository.findById(conversationId, userId);
            if (!conversation) {
                throw new errors_js_1.NotFoundError('Conversation not found');
            }
            const updated = await conversationsRepository_js_1.ConversationsRepository.setTakeover(conversationId, false, null);
            (0, logger_js_1.logEvent)({ userId, conversationId, event: 'TAKEOVER_DISABLED' }, 'Manual takeover disabled, AI resumed on chat');
            wsEmitter_js_1.wsEmitter.sendToUser(userId, 'takeover.changed', {
                conversationId,
                takeoverActive: false,
                takeoverUntil: null,
            });
            res.status(200).json({
                success: true,
                data: updated,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async sendMessage(req, res, next) {
        try {
            const userId = req.user.userId;
            const conversationId = req.params.id;
            const validated = exports.sendMessageSchema.parse(req.body);
            // Scoped to current authenticated user
            const conversation = await conversationsRepository_js_1.ConversationsRepository.findById(conversationId, userId);
            if (!conversation) {
                throw new errors_js_1.NotFoundError('Conversation not found');
            }
            const session = await sessionRepository_js_1.SessionRepository.getOrCreateByUserId(userId);
            // Send through user's isolated Baileys session
            const sentWaMessage = await sessionManager_js_1.WhatsAppSessionManager.sendMessage(userId, conversation.chat_jid, validated.text);
            const waMessageId = sentWaMessage?.key?.id || `manual_${Date.now()}`;
            const now = new Date().toISOString();
            const savedMessage = await messagesRepository_js_1.MessagesRepository.create({
                conversation_id: conversationId,
                session_id: session.id,
                user_id: userId,
                wa_message_id: waMessageId,
                direction: 'OUTGOING',
                sender: 'me',
                receiver: conversation.chat_jid,
                message_type: 'text',
                text: validated.text,
                is_from_me: true,
                ai_generated: false,
                created_at: now,
            });
            await conversationsRepository_js_1.ConversationsRepository.updateLastMessage(conversationId, validated.text, now);
            wsEmitter_js_1.wsEmitter.sendToUser(userId, 'message.sent', { message: savedMessage });
            res.status(200).json({
                success: true,
                data: savedMessage,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.ConversationsController = ConversationsController;
//# sourceMappingURL=conversationsController.js.map