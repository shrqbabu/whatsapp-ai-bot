import { randomUUID } from 'node:crypto';
import { getDatabase } from '../db.js';

export type WhatsAppStatus =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'QR_REQUIRED'
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'LOGGED_OUT'
  | 'ERROR';

export interface WhatsAppSessionEntity {
  id: string;
  user_id: string;
  phone_number: string | null;
  status: WhatsAppStatus;
  connected_at: string | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

export class SessionRepository {
  static async findByUserId(userId: string): Promise<WhatsAppSessionEntity | null> {
    const db = getDatabase();
    return db.queryOne<WhatsAppSessionEntity>(
      'SELECT * FROM whatsapp_sessions WHERE user_id = $1 LIMIT 1',
      [userId]
    );
  }

  static async findById(id: string): Promise<WhatsAppSessionEntity | null> {
    const db = getDatabase();
    return db.queryOne<WhatsAppSessionEntity>(
      'SELECT * FROM whatsapp_sessions WHERE id = $1 LIMIT 1',
      [id]
    );
  }

  static async getOrCreateByUserId(userId: string): Promise<WhatsAppSessionEntity> {
    const existing = await this.findByUserId(userId);
    if (existing) return existing;

    const db = getDatabase();
    const id = randomUUID();
    const now = new Date().toISOString();
    await db.execute(
      'INSERT INTO whatsapp_sessions (id, user_id, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)',
      [id, userId, 'DISCONNECTED', now, now]
    );

    // Initialize default AI settings for this session
    await db.execute(
      `INSERT INTO ai_settings (id, session_id, user_id, enabled, system_prompt, model, reply_delay, debounce_delay, groups_enabled, reply_only_when_mentioned, business_hours_enabled, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        randomUUID(),
        id,
        userId,
        1,
        'You are a friendly and professional customer support assistant. Reply politely and concisely. Use the same language as the customer.',
        'gpt-4o-mini',
        3,
        2,
        0,
        0,
        0,
        now,
        now,
      ]
    );

    // Initialize default 7-day business hours
    const days = [0, 1, 2, 3, 4, 5, 6];
    for (const day of days) {
      const isWeekend = day === 0 || day === 6;
      await db.execute(
        `INSERT INTO business_hours (id, session_id, user_id, day_of_week, enabled, start_time, end_time, timezone, outside_hours_action, outside_hours_message, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          randomUUID(),
          id,
          userId,
          day,
          isWeekend ? 0 : 1,
          '09:00',
          isWeekend ? '14:00' : '18:00',
          'UTC',
          'DO_NOTHING',
          'We are currently outside of business hours. We will reply as soon as we open.',
          now,
          now,
        ]
      );
    }

    const created = await this.findById(id);
    if (!created) throw new Error('Failed to create session');
    return created;
  }

  static async updateStatus(
    id: string,
    status: WhatsAppStatus,
    phoneNumber?: string | null
  ): Promise<void> {
    const db = getDatabase();
    const now = new Date().toISOString();
    if (status === 'CONNECTED') {
      await db.execute(
        `UPDATE whatsapp_sessions SET status = $1, phone_number = COALESCE($2, phone_number), connected_at = $3, last_seen_at = $4, updated_at = $5 WHERE id = $6`,
        [status, phoneNumber || null, now, now, now, id]
      );
    } else {
      await db.execute(
        `UPDATE whatsapp_sessions SET status = $1, phone_number = COALESCE($2, phone_number), last_seen_at = $3, updated_at = $4 WHERE id = $5`,
        [status, phoneNumber || null, now, now, id]
      );
    }
  }

  static async listAllActiveSessions(): Promise<WhatsAppSessionEntity[]> {
    const db = getDatabase();
    return db.query<WhatsAppSessionEntity>(
      "SELECT * FROM whatsapp_sessions WHERE status IN ('CONNECTED', 'CONNECTING', 'RECONNECTING')"
    );
  }
}
