import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { ConversationsRepository } from '../database/repositories/conversationsRepository.js';
import { MessagesRepository } from '../database/repositories/messagesRepository.js';
import { SessionRepository } from '../database/repositories/sessionRepository.js';
import { WhatsAppSessionManager } from '../whatsapp/sessionManager.js';
import { NotFoundError } from '../utils/errors.js';
import { logEvent } from '../utils/logger.js';
import { wsEmitter } from '../websocket/wsEmitter.js';

export const takeoverSchema = z.object({
  duration_minutes: z.number().int().min(1).max(1440).optional().nullable(),
  durationMinutes: z.number().int().min(1).max(1440).optional().nullable(),
});

export const sendMessageSchema = z.object({
  text: z.string().min(1, 'Message text cannot be empty'),
});

export class ConversationsController {
  static async listConversations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const session = await SessionRepository.getOrCreateByUserId(userId);
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
      const search = req.query.search as string | undefined;

      if (search) {
        const result = await ConversationsRepository.listByUserId(userId, { limit, offset, search });
        res.status(200).json({
          success: true,
          data: result.items,
          pagination: {
            total: result.total,
            limit,
            offset,
          },
        });
      } else {
        const conversations = await ConversationsRepository.list(session.id, limit, offset);
        res.status(200).json({
          success: true,
          data: conversations,
        });
      }
    } catch (error) {
      next(error);
    }
  }

  static async getMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const conversationId = req.params.id as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

      // Scoped to current authenticated user
      const conversation = await ConversationsRepository.findById(conversationId, userId);
      if (!conversation) {
        throw new NotFoundError('Conversation not found');
      }

      const messages = await MessagesRepository.listByConversation(conversationId, limit, offset);

      res.status(200).json({
        success: true,
        data: messages,
      });
    } catch (error) {
      next(error);
    }
  }

  static async takeover(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const conversationId = req.params.id as string;
      const validated = takeoverSchema.parse(req.body);
      const duration = validated.duration_minutes || validated.durationMinutes;

      // Scoped to current authenticated user
      const conversation = await ConversationsRepository.findById(conversationId, userId);
      if (!conversation) {
        throw new NotFoundError('Conversation not found');
      }

      const updated = await ConversationsRepository.setTakeover(
        conversationId,
        true,
        duration
      );

      logEvent(
        { userId, conversationId, event: 'TAKEOVER_ENABLED' },
        'Manual takeover enabled on chat'
      );

      wsEmitter.sendToUser(userId, 'takeover.changed', {
        conversationId,
        takeoverActive: true,
        takeoverUntil: updated.takeover_until,
      });

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  static async resume(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const conversationId = req.params.id as string;

      // Scoped to current authenticated user
      const conversation = await ConversationsRepository.findById(conversationId, userId);
      if (!conversation) {
        throw new NotFoundError('Conversation not found');
      }

      const updated = await ConversationsRepository.setTakeover(
        conversationId,
        false,
        null
      );

      logEvent(
        { userId, conversationId, event: 'TAKEOVER_DISABLED' },
        'Manual takeover disabled, AI resumed on chat'
      );

      wsEmitter.sendToUser(userId, 'takeover.changed', {
        conversationId,
        takeoverActive: false,
        takeoverUntil: null,
      });

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  static async sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const conversationId = req.params.id as string;
      const validated = sendMessageSchema.parse(req.body);

      // Scoped to current authenticated user
      const conversation = await ConversationsRepository.findById(conversationId, userId);
      if (!conversation) {
        throw new NotFoundError('Conversation not found');
      }

      const session = await SessionRepository.getOrCreateByUserId(userId);

      // Send through user's isolated Baileys session
      const sentWaMessage = await WhatsAppSessionManager.sendMessage(
        userId,
        conversation.chat_jid,
        validated.text
      );

      const waMessageId = sentWaMessage?.key?.id || `manual_${Date.now()}`;
      const now = new Date().toISOString();

      const savedMessage = await MessagesRepository.create({
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

      await ConversationsRepository.updateLastMessage(conversationId, validated.text, now);

      wsEmitter.sendToUser(userId, 'message.sent', { message: savedMessage });

      res.status(200).json({
        success: true,
        data: savedMessage,
      });
    } catch (error) {
      next(error);
    }
  }
}
