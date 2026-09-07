import { AISettingsRepository } from '../database/repositories/aiSettingsRepository.js';
import { ContactsRepository } from '../database/repositories/contactsRepository.js';
import { ConversationsRepository } from '../database/repositories/conversationsRepository.js';
import { MessagesRepository } from '../database/repositories/messagesRepository.js';
import { AIService } from '../ai/aiService.js';
import { RulesEngine } from '../ai/rulesEngine.js';
import { MessageDebouncer } from '../queue/messageDebouncer.js';
import { logEvent, logger } from '../utils/logger.js';
import { wsEmitter } from '../websocket/wsEmitter.js';

export class MessageHandler {
  static async handleIncomingUpsert(
    userId: string,
    sessionId: string,
    upsert: { messages: any[]; type: string },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    sock?: any
  ): Promise<void> {
    if (!upsert.messages || upsert.messages.length === 0) return;

    for (const msg of upsert.messages) {
      try {
        await this.processSingleMessage(userId, sessionId, msg);
      } catch (error) {
        logger.error({ userId, sessionId, error }, 'Error processing message in upsert loop');
      }
    }
  }

  private static async processSingleMessage(
    userId: string,
    sessionId: string,
    msg: any
  ): Promise<void> {
    const key = msg.key;
    if (!key || !key.remoteJid) return;

    const chatJid: string = key.remoteJid;
    const isFromMe: boolean = Boolean(key.fromMe);
    const waMessageId: string = key.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const isGroup: boolean = chatJid.endsWith('@g.us');
    const senderJid: string = isGroup ? key.participant || chatJid : chatJid;

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
    const isDuplicate = await MessagesRepository.isDuplicate(sessionId, waMessageId);
    if (isDuplicate) {
      logEvent({ userId, sessionId, waMessageId, event: 'DUPLICATE_MESSAGE_IGNORED' }, 'Duplicate WhatsApp message');
      return;
    }

    logEvent(
      { userId, sessionId, chatJid, waMessageId, event: 'MESSAGE_RECEIVED' },
      `Incoming WhatsApp message from ${senderJid}: "${(text || '').slice(0, 40)}"`
    );

    // 5. Upsert Contact & Conversation
    const senderName = msg.pushName || senderJid.split('@')[0];
    const contact = await ContactsRepository.upsertContact({
      sessionId,
      userId,
      waJid: senderJid,
      displayName: senderName,
      phoneNumber: senderJid.split('@')[0],
    });

    const conversation = await ConversationsRepository.getOrCreateConversation({
      sessionId,
      userId,
      chatJid,
      chatName: isGroup ? (msg.pushName || 'Group Chat') : senderName,
      isGroup,
      contactId: contact.id,
    });

    // 6. Persist incoming message
    const now = new Date().toISOString();
    const savedMessage = await MessagesRepository.create({
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
    await ConversationsRepository.updateLastMessage(conversation.id, text || `[${messageType}]`, now);

    // 7. Notify Android App over Authenticated WebSocket
    wsEmitter.sendToUser(userId, 'message.received', {
      message: savedMessage,
      conversation: {
        ...conversation,
        last_message_preview: text || `[${messageType}]`,
        last_message_at: now,
      },
    });

    // 8. Evaluate Rules Engine
    const aiSettings = await AISettingsRepository.findBySessionId(sessionId);
    if (!aiSettings) return;

    const evaluation = await RulesEngine.evaluate({
      sessionId,
      isFromMe,
      text,
      isGroup,
      contact,
      conversation,
      aiSettings,
    });

    if (!evaluation.shouldReply) {
      logEvent(
        { userId, sessionId, conversationId: conversation.id, event: 'AI_SKIPPED' },
        `AI reply skipped: ${evaluation.reason}`
      );
      return;
    }

    // 9. If Outside Business Hours message is configured
    if (evaluation.outsideHoursMessage) {
      await AIService.processAutoReply({
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
    MessageDebouncer.enqueue({
      sessionId,
      userId,
      conversationId: conversation.id,
      chatJid,
      senderJid,
      text: text || '',
      debounceSeconds: aiSettings.debounce_delay,
      onExecute: async (combinedText: string) => {
        await AIService.processAutoReply({
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

  private static extractMessageContent(msg: any): { text: string | null; messageType: string } {
    const m = msg.message;
    if (!m) return { text: null, messageType: 'unsupported' };

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
