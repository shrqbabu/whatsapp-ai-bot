import { beforeAll, describe, expect, it } from 'vitest';
import { AIService } from '../src/ai/aiService.js';
import { MockAIProvider } from '../src/ai/providers/MockAIProvider.js';
import { ProviderFactory } from '../src/ai/providers/ProviderFactory.js';
import { runMigrations } from '../src/database/db.js';
import { AISettingsRepository } from '../src/database/repositories/aiSettingsRepository.js';
import { ConversationsRepository } from '../src/database/repositories/conversationsRepository.js';
import { MessagesRepository } from '../src/database/repositories/messagesRepository.js';
import { SessionRepository } from '../src/database/repositories/sessionRepository.js';
import { UserRepository } from '../src/database/repositories/userRepository.js';
import { WhatsAppSessionManager } from '../src/whatsapp/sessionManager.js';

describe('AI Auto-Reply Pipeline & Context Builder Suite', () => {
  let userId: string;
  let sessionId: string;
  let conversation: any;
  let mockProvider: MockAIProvider;

  beforeAll(async () => {
    await runMigrations();

    const user = await UserRepository.create({
      email: `pipeline_${Date.now()}@example.com`,
      password_hash: 'hash',
      full_name: 'Pipeline Tester',
    });
    userId = user.id;

    const session = await SessionRepository.getOrCreateByUserId(userId);
    sessionId = session.id;

    // Fast reply delay for testing
    await AISettingsRepository.update(sessionId, {
      reply_delay: 0,
      system_prompt: 'You are an AI support bot.',
    });

    conversation = await ConversationsRepository.getOrCreateConversation({
      sessionId,
      userId,
      chatJid: '919555555555@s.whatsapp.net',
      isGroup: false,
    });

    // Mock WhatsApp Session Manager sendMessage
    WhatsAppSessionManager.sendMessage = async () => {
      return {
        key: {
          id: `mock_wa_${Date.now()}`,
          remoteJid: conversation.chat_jid,
          fromMe: true,
        },
      } as any;
    };

    mockProvider = new MockAIProvider();
    ProviderFactory.setGlobalProvider(mockProvider);
  });

  it('should generate an AI reply and persist it as an outgoing message with ai_generated = true', async () => {
    mockProvider.setCustomReply(() => 'Hello! This is a mock AI response.');

    const result = await AIService.processAutoReply({
      userId,
      sessionId,
      conversation,
      chatJid: conversation.chat_jid,
      incomingText: 'Hello there!',
      senderName: 'Test Customer',
    });

    expect(result).not.toBeNull();
    expect(result?.text).toBe('Hello! This is a mock AI response.');
    expect(result?.is_from_me).toBe(true);
    expect(result?.ai_generated).toBe(true);
    expect(result?.direction).toBe('OUTGOING');

    // Verify it is stored in database
    const messages = await MessagesRepository.listByConversation(conversation.id);
    const found = messages.find((m) => m.text === 'Hello! This is a mock AI response.');
    expect(found).toBeDefined();
    expect(found?.ai_generated).toBe(true);
  });

  it('should not send response if AI provider returns empty content', async () => {
    mockProvider.setCustomReply(() => '');

    const result = await AIService.processAutoReply({
      userId,
      sessionId,
      conversation,
      chatJid: conversation.chat_jid,
      incomingText: 'Empty test',
      senderName: 'Test Customer',
    });

    expect(result).toBeNull();
  });
});
