import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { runMigrations } from '../src/database/db.js';
import { ConversationsRepository } from '../src/database/repositories/conversationsRepository.js';
import { ContactsRepository } from '../src/database/repositories/contactsRepository.js';

describe('Multi-Tenant Session & Resource Isolation', () => {
  const app = createApp();

  let userAToken: string;
  let userAId: string;
  let userASessionId: string;

  let userBToken: string;
  let userBId: string;
  let userBSessionId: string;

  beforeAll(async () => {
    await runMigrations();

    // Register User A
    const resA = await request(app).post('/api/auth/register').send({
      email: `usera_${Date.now()}@example.com`,
      password: 'password123',
      fullName: 'User Alice',
    });
    userAToken = resA.body.data.token;
    userAId = resA.body.data.user.id;
    userASessionId = resA.body.data.session.id;

    // Register User B
    const resB = await request(app).post('/api/auth/register').send({
      email: `userb_${Date.now()}@example.com`,
      password: 'password123',
      fullName: 'User Bob',
    });
    userBToken = resB.body.data.token;
    userBId = resB.body.data.user.id;
    userBSessionId = resB.body.data.session.id;
  });

  it('allocates distinct isolated WhatsApp session IDs to different users', () => {
    expect(userASessionId).toBeDefined();
    expect(userBSessionId).toBeDefined();
    expect(userASessionId).not.toBe(userBSessionId);
  });

  it('prevents User B from accessing or reading User A conversations', async () => {
    // Create a contact and conversation under User A
    const contactA = await ContactsRepository.upsertContact({
      sessionId: userASessionId,
      userId: userAId,
      waJid: '919876543210@s.whatsapp.net',
      displayName: 'Alice Contact',
    });

    const conversationA = await ConversationsRepository.getOrCreateConversation({
      sessionId: userASessionId,
      userId: userAId,
      chatJid: '919876543210@s.whatsapp.net',
      chatName: 'Alice Chat',
      isGroup: false,
      contactId: contactA.id,
    });

    // User A can read their own conversation messages
    const resA = await request(app)
      .get(`/api/conversations/${conversationA.id}/messages`)
      .set('Authorization', `Bearer ${userAToken}`);
    expect(resA.status).toBe(200);

    // User B tries to read User A conversation messages -> MUST BE REJECTED
    const resB = await request(app)
      .get(`/api/conversations/${conversationA.id}/messages`)
      .set('Authorization', `Bearer ${userBToken}`);
    expect(resB.status).toBe(404);
  });

  it('prevents User B from taking over User A conversation', async () => {
    const contactA = await ContactsRepository.upsertContact({
      sessionId: userASessionId,
      userId: userAId,
      waJid: '919111111111@s.whatsapp.net',
      displayName: 'Target Contact',
    });

    const convA = await ConversationsRepository.getOrCreateConversation({
      sessionId: userASessionId,
      userId: userAId,
      chatJid: '919111111111@s.whatsapp.net',
      isGroup: false,
      contactId: contactA.id,
    });

    // User B attempts takeover on User A's conversation
    const res = await request(app)
      .post(`/api/conversations/${convA.id}/takeover`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ duration_minutes: 30 });

    expect(res.status).toBe(404);
  });

  it('keeps AI settings completely isolated between User A and User B', async () => {
    // User A updates their system prompt
    await request(app)
      .put('/api/ai/settings')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        system_prompt: 'Custom Prompt for User A Business',
        reply_delay: 5,
      });

    // User B fetches their AI settings
    const resB = await request(app)
      .get('/api/ai/settings')
      .set('Authorization', `Bearer ${userBToken}`);

    expect(resB.status).toBe(200);
    expect(resB.body.data.system_prompt).not.toBe('Custom Prompt for User A Business');
    expect(resB.body.data.reply_delay).toBe(3); // default is 3
  });
});
