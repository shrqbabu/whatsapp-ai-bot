import { randomUUID } from 'node:crypto';
import { getDatabase } from '../db.js';

export interface MessageEntity {
  id: string;
  conversation_id: string;
  session_id: string;
  user_id: string;
  wa_message_id: string;
  direction: 'INCOMING' | 'OUTGOING';
  sender: string;
  receiver: string;
  message_type: string;
  text: string | null;
  is_from_me: boolean;
  ai_generated: boolean;
  created_at: string;
}

export class MessagesRepository {
  static async existsByWaId(sessionId: string, waMessageId: string): Promise<boolean> {
    const db = getDatabase();
    const row = await db.queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM messages WHERE session_id = $1 AND wa_message_id = $2',
      [sessionId, waMessageId]
    );
    return Number(row?.count || 0) > 0;
  }

  static async isDuplicate(sessionId: string, waMessageId: string): Promise<boolean> {
    return this.existsByWaId(sessionId, waMessageId);
  }

  static async create(data: {
    conversation_id?: string;
    conversationId?: string;
    session_id?: string;
    sessionId?: string;
    user_id?: string;
    userId?: string;
    wa_message_id?: string;
    waMessageId?: string;
    direction: 'INCOMING' | 'OUTGOING';
    sender: string;
    receiver: string;
    message_type?: string;
    messageType?: string;
    text?: string | null;
    is_from_me?: boolean;
    isFromMe?: boolean;
    ai_generated?: boolean;
    aiGenerated?: boolean;
    created_at?: string;
    createdAt?: string;
  }): Promise<MessageEntity> {
    const db = getDatabase();
    const id = randomUUID();
    const convId = data.conversation_id || data.conversationId!;
    const sessId = data.session_id || data.sessionId!;
    const uId = data.user_id || data.userId!;
    const waId = data.wa_message_id || data.waMessageId!;
    const msgType = data.message_type || data.messageType || 'text';
    const fromMe = data.is_from_me !== undefined ? data.is_from_me : Boolean(data.isFromMe);
    const aiGen = data.ai_generated !== undefined ? data.ai_generated : Boolean(data.aiGenerated);
    const now = data.created_at || data.createdAt || new Date().toISOString();

    await db.execute(
      `INSERT INTO messages (id, conversation_id, session_id, user_id, wa_message_id, direction, sender, receiver, message_type, text, is_from_me, ai_generated, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        id,
        convId,
        sessId,
        uId,
        waId,
        data.direction,
        data.sender,
        data.receiver,
        msgType,
        data.text || null,
        fromMe ? 1 : 0,
        aiGen ? 1 : 0,
        now,
      ]
    );

    const created = await db.queryOne<any>('SELECT * FROM messages WHERE id = $1', [id]);
    return this.mapEntity(created);
  }

  static async listByConversation(
    conversationId: string,
    limit = 50,
    offset = 0
  ): Promise<MessageEntity[]> {
    const db = getDatabase();
    const rows = await db.query<any>(
      `SELECT * FROM messages
       WHERE conversation_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [conversationId, limit, offset]
    );
    return rows.map(this.mapEntity).reverse(); // Return in chronological order
  }

  static async getRecentContext(conversationId: string, maxMessages = 10): Promise<MessageEntity[]> {
    const db = getDatabase();
    const rows = await db.query<any>(
      `SELECT * FROM messages
       WHERE conversation_id = $1 AND message_type = 'text' AND text IS NOT NULL
       ORDER BY created_at DESC
       LIMIT $2`,
      [conversationId, maxMessages]
    );
    return rows.map(this.mapEntity).reverse();
  }

  static async countTodayMessages(sessionId: string): Promise<number> {
    const db = getDatabase();
    const today = new Date().toISOString().split('T')[0];
    const row = await db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM messages
       WHERE session_id = $1 AND created_at >= $2`,
      [sessionId, today]
    );
    return Number(row?.count || 0);
  }

  static async countTodayAiReplies(sessionId: string): Promise<number> {
    const db = getDatabase();
    const today = new Date().toISOString().split('T')[0];
    const row = await db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM messages
       WHERE session_id = $1 AND ai_generated = 1 AND created_at >= $2`,
      [sessionId, today]
    );
    return Number(row?.count || 0);
  }

  private static mapEntity(row: any): MessageEntity {
    return {
      ...row,
      is_from_me: Boolean(row.is_from_me),
      ai_generated: Boolean(row.ai_generated),
    };
  }
}
