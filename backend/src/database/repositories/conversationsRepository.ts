import { randomUUID } from 'node:crypto';
import { getDatabase } from '../db.js';

export interface ConversationEntity {
  id: string;
  session_id: string;
  user_id: string;
  contact_id: string | null;
  chat_jid: string;
  chat_name: string | null;
  is_group: boolean;
  takeover_active: boolean;
  takeover_until: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  created_at: string;
  updated_at: string;
}

export class ConversationsRepository {
  static async list(sessionId: string, limit = 50, offset = 0): Promise<ConversationEntity[]> {
    const db = getDatabase();
    const rows = await db.query<any>(
      `SELECT * FROM conversations
       WHERE session_id = $1
       ORDER BY last_message_at DESC NULLS LAST, updated_at DESC
       LIMIT $2 OFFSET $3`,
      [sessionId, limit, offset]
    );
    return rows.map(this.mapEntity);
  }

  static async listByUserId(
    userId: string,
    options: { limit?: number; offset?: number; search?: string } = {}
  ): Promise<{ items: ConversationEntity[]; total: number }> {
    const db = getDatabase();
    const limit = options.limit || 20;
    const offset = options.offset || 0;

    let whereClause = 'WHERE user_id = $1';
    const params: unknown[] = [userId];

    if (options.search) {
      whereClause +=
        ' AND (LOWER(chat_name) LIKE $2 OR LOWER(chat_jid) LIKE $2 OR LOWER(last_message_preview) LIKE $2)';
      params.push(`%${options.search.toLowerCase()}%`);
    }

    const countRow = await db.queryOne<any>(
      `SELECT COUNT(*) as total FROM conversations ${whereClause}`,
      params
    );
    const total = Number(countRow?.total || 0);

    const rows = await db.query<any>(
      `SELECT * FROM conversations ${whereClause} ORDER BY COALESCE(last_message_at, created_at) DESC LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    return {
      items: rows.map(this.mapEntity),
      total,
    };
  }

  static async findById(id: string, userId?: string): Promise<ConversationEntity | null> {
    const db = getDatabase();
    let sql = 'SELECT * FROM conversations WHERE id = $1';
    const params: any[] = [id];
    if (userId) {
      sql += ' AND user_id = $2';
      params.push(userId);
    }
    const row = await db.queryOne<any>(sql, params);
    if (!row) return null;
    return this.mapEntity(row);
  }

  static async findByJid(sessionId: string, chatJid: string): Promise<ConversationEntity | null> {
    const db = getDatabase();
    const row = await db.queryOne<any>(
      'SELECT * FROM conversations WHERE session_id = $1 AND chat_jid = $2 LIMIT 1',
      [sessionId, chatJid]
    );
    if (!row) return null;
    return this.mapEntity(row);
  }

  static async upsert(
    sessionId: string,
    userId: string,
    chatJid: string,
    isGroup: boolean,
    contactId?: string | null,
    chatName?: string | null
  ): Promise<ConversationEntity> {
    const db = getDatabase();
    const existing = await this.findByJid(sessionId, chatJid);
    const now = new Date().toISOString();

    if (existing) {
      if (chatName && chatName !== existing.chat_name) {
        await db.execute(
          'UPDATE conversations SET chat_name = $1, updated_at = $2 WHERE id = $3',
          [chatName, now, existing.id]
        );
      }
      return (await this.findById(existing.id))!;
    }

    const id = randomUUID();
    await db.execute(
      `INSERT INTO conversations (id, session_id, user_id, contact_id, chat_jid, chat_name, is_group, takeover_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8, $9)`,
      [id, sessionId, userId, contactId || null, chatJid, chatName || null, isGroup ? 1 : 0, now, now]
    );

    return (await this.findById(id))!;
  }

  static async getOrCreateConversation(data: {
    sessionId: string;
    userId: string;
    chatJid: string;
    chatName?: string | null;
    isGroup: boolean;
    contactId?: string | null;
  }): Promise<ConversationEntity> {
    return this.upsert(
      data.sessionId,
      data.userId,
      data.chatJid,
      data.isGroup,
      data.contactId,
      data.chatName
    );
  }

  static async updateLastMessage(id: string, preview: string, timestamp?: string): Promise<void> {
    const db = getDatabase();
    const now = timestamp || new Date().toISOString();
    await db.execute(
      'UPDATE conversations SET last_message_preview = $1, last_message_at = $2, updated_at = $3 WHERE id = $4',
      [preview.slice(0, 200), now, now, id]
    );
  }

  static async setTakeover(
    id: string,
    active: boolean,
    untilOrMinutes?: string | number | null
  ): Promise<ConversationEntity> {
    const db = getDatabase();
    const now = new Date();
    const nowIso = now.toISOString();
    let takeoverUntil: string | null = null;

    if (active) {
      if (typeof untilOrMinutes === 'number' && untilOrMinutes > 0) {
        takeoverUntil = new Date(now.getTime() + untilOrMinutes * 60 * 1000).toISOString();
      } else if (typeof untilOrMinutes === 'string') {
        takeoverUntil = untilOrMinutes;
      }
    }

    await db.execute(
      'UPDATE conversations SET takeover_active = $1, takeover_until = $2, updated_at = $3 WHERE id = $4',
      [active ? 1 : 0, active ? takeoverUntil : null, nowIso, id]
    );

    return (await this.findById(id))!;
  }

  static async isTakeoverActive(id: string): Promise<boolean> {
    const conv = await this.findById(id);
    if (!conv || !conv.takeover_active) return false;

    // Check expiration if set
    if (conv.takeover_until) {
      const until = new Date(conv.takeover_until).getTime();
      const now = Date.now();
      if (now > until) {
        // Expired, reset takeover
        await this.setTakeover(id, false);
        return false;
      }
    }

    return true;
  }

  private static mapEntity(row: any): ConversationEntity {
    return {
      ...row,
      is_group: Boolean(row.is_group),
      takeover_active: Boolean(row.takeover_active),
    };
  }
}
