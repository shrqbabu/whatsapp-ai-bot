import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { runMigrations } from '../src/database/db.js';
import { RulesEngine } from '../src/ai/rulesEngine.js';
import { AISettingsRepository } from '../src/database/repositories/aiSettingsRepository.js';
import { ContactsRepository } from '../src/database/repositories/contactsRepository.js';
import { ConversationsRepository } from '../src/database/repositories/conversationsRepository.js';
import { BusinessHoursRepository } from '../src/database/repositories/businessHoursRepository.js';

describe('AI Rules Engine & Policy Enforcement', () => {
  const app = createApp();

  let userId: string;
  let sessionId: string;
  let userToken: string;

  beforeAll(async () => {
    await runMigrations();

    const res = await request(app).post('/api/auth/register').send({
      email: `rulestest_${Date.now()}@example.com`,
      password: 'password123',
      fullName: 'Rules Tester',
    });

    userId = res.body.data.user.id;
    sessionId = res.body.data.session.id;
    userToken = res.body.data.token;
  });

  it('ignores own messages (Loop Prevention)', async () => {
    const aiSettings = (await AISettingsRepository.findBySessionId(sessionId))!;
    const conv = await ConversationsRepository.getOrCreateConversation({
      sessionId,
      userId,
      chatJid: '919876543210@s.whatsapp.net',
      isGroup: false,
    });

    const result = await RulesEngine.evaluate({
      sessionId,
      isFromMe: true, // message from self
      text: 'Hello from me',
      isGroup: false,
      contact: null,
      conversation: conv,
      aiSettings,
    });

    expect(result.shouldReply).toBe(false);
  });

  it('does not reply when AI is globally disabled', async () => {
    await AISettingsRepository.update(sessionId, { enabled: false });
    const aiSettings = (await AISettingsRepository.findBySessionId(sessionId))!;

    const conv = await ConversationsRepository.getOrCreateConversation({
      sessionId,
      userId,
      chatJid: '919876543210@s.whatsapp.net',
      isGroup: false,
    });

    const result = await RulesEngine.evaluate({
      sessionId,
      isFromMe: false,
      text: 'Hello, need help',
      isGroup: false,
      contact: null,
      conversation: conv,
      aiSettings,
    });

    expect(result.shouldReply).toBe(false);

    // Re-enable for remaining tests
    await AISettingsRepository.update(sessionId, { enabled: true });
  });

  it('does not reply to blocked contacts', async () => {
    const contact = await ContactsRepository.upsertContact({
      sessionId,
      userId,
      waJid: '919000000001@s.whatsapp.net',
      displayName: 'Blocked Contact',
    });

    await ContactsRepository.updateContactRules(contact.id, sessionId, userId, { blocked: true });
    const updatedContact = (await ContactsRepository.findById(contact.id))!;
    const aiSettings = (await AISettingsRepository.findBySessionId(sessionId))!;

    const conv = await ConversationsRepository.getOrCreateConversation({
      sessionId,
      userId,
      chatJid: '919000000001@s.whatsapp.net',
      isGroup: false,
      contactId: contact.id,
    });

    const result = await RulesEngine.evaluate({
      sessionId,
      isFromMe: false,
      text: 'What are your prices?',
      isGroup: false,
      contact: updatedContact,
      conversation: conv,
      aiSettings,
    });

    expect(result.shouldReply).toBe(false);
  });

  it('does not reply to group messages if groups are disabled', async () => {
    const aiSettings = (await AISettingsRepository.findBySessionId(sessionId))!;
    expect(aiSettings.groups_enabled).toBe(false);

    const conv = await ConversationsRepository.getOrCreateConversation({
      sessionId,
      userId,
      chatJid: '123456789-group@g.us',
      isGroup: true,
    });

    const result = await RulesEngine.evaluate({
      sessionId,
      isFromMe: false,
      text: 'Group message from member',
      isGroup: true,
      contact: null,
      conversation: conv,
      aiSettings,
    });

    expect(result.shouldReply).toBe(false);
  });

  it('pauses AI auto-reply when manual takeover is active', async () => {
    const aiSettings = (await AISettingsRepository.findBySessionId(sessionId))!;
    const conv = await ConversationsRepository.getOrCreateConversation({
      sessionId,
      userId,
      chatJid: '919000000002@s.whatsapp.net',
      isGroup: false,
    });

    // Activate takeover
    const updatedConv = await ConversationsRepository.setTakeover(conv.id, true, 60);

    const result = await RulesEngine.evaluate({
      sessionId,
      isFromMe: false,
      text: 'Are you a human or a bot?',
      isGroup: false,
      contact: null,
      conversation: updatedConv,
      aiSettings,
    });

    expect(result.shouldReply).toBe(false);

    // Now resume AI
    const resumedConv = await ConversationsRepository.setTakeover(conv.id, false, null);

    const resumedResult = await RulesEngine.evaluate({
      sessionId,
      isFromMe: false,
      text: 'Are you a human or a bot?',
      isGroup: false,
      contact: null,
      conversation: resumedConv,
      aiSettings,
    });

    expect(resumedResult.shouldReply).toBe(true);
  });

  it('handles business hours outside schedule with custom message', async () => {
    await AISettingsRepository.update(sessionId, { business_hours_enabled: true });
    const aiSettings = (await AISettingsRepository.findBySessionId(sessionId))!;

    await BusinessHoursRepository.updateSchedule(sessionId, userId, [
      {
        day_of_week: 0,
        enabled: false,
        start_time: '09:00',
        end_time: '18:00',
        outside_hours_action: 'SEND_CUSTOM_MESSAGE',
        outside_hours_message: 'We are currently closed for the day.',
      },
      {
        day_of_week: 1,
        enabled: false,
        start_time: '09:00',
        end_time: '18:00',
        outside_hours_action: 'SEND_CUSTOM_MESSAGE',
        outside_hours_message: 'We are currently closed for the day.',
      },
      {
        day_of_week: 2,
        enabled: false,
        start_time: '09:00',
        end_time: '18:00',
        outside_hours_action: 'SEND_CUSTOM_MESSAGE',
        outside_hours_message: 'We are currently closed for the day.',
      },
      {
        day_of_week: 3,
        enabled: false,
        start_time: '09:00',
        end_time: '18:00',
        outside_hours_action: 'SEND_CUSTOM_MESSAGE',
        outside_hours_message: 'We are currently closed for the day.',
      },
      {
        day_of_week: 4,
        enabled: false,
        start_time: '09:00',
        end_time: '18:00',
        outside_hours_action: 'SEND_CUSTOM_MESSAGE',
        outside_hours_message: 'We are currently closed for the day.',
      },
      {
        day_of_week: 5,
        enabled: false,
        start_time: '09:00',
        end_time: '18:00',
        outside_hours_action: 'SEND_CUSTOM_MESSAGE',
        outside_hours_message: 'We are currently closed for the day.',
      },
      {
        day_of_week: 6,
        enabled: false,
        start_time: '09:00',
        end_time: '18:00',
        outside_hours_action: 'SEND_CUSTOM_MESSAGE',
        outside_hours_message: 'We are currently closed for the day.',
      },
    ]);

    const conv = await ConversationsRepository.getOrCreateConversation({
      sessionId,
      userId,
      chatJid: '919000000003@s.whatsapp.net',
      isGroup: false,
    });

    const result = await RulesEngine.evaluate({
      sessionId,
      isFromMe: false,
      text: 'Is anyone available right now?',
      isGroup: false,
      contact: null,
      conversation: conv,
      aiSettings,
    });

    expect(result.shouldReply).toBe(true);
    expect(result.outsideHoursMessage).toBe('We are currently closed for the day.');
  });
});
