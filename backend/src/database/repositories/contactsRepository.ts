import { randomUUID } from 'node:crypto';
import { getDatabase } from '../db.js';

export interface ContactEntity {
  id: string;
  session_id: string;
  user_id: string;
  wa_jid: string;
  display_name: string | null;
  phone_number: string | null;
  ai_enabled: boolean;
  blocked: boolean;
  created_at: string;
  updated_at: string;
}

export interface GroupRuleEntity {
  id: string;
  session_id: string;
  user_id: string;
  group_jid: string;
  ai_enabled: boolean;
  reply_only_when_mentioned: boolean;
  created_at: string;
  updated_at: string;
}

export class ContactsRepository {
  static async listContacts(sessionId: string): Promise<ContactEntity[]> {
    const db = getDatabase();
    const rows = await db.query<any>(
      `SELECT c.*, COALESCE(cr.ai_enabled, 1) as ai_enabled, COALESCE(cr.blocked, 0) as blocked
       FROM contacts c
       LEFT JOIN contact_rules cr ON c.id = cr.contact_id
       WHERE c.session_id = $1
       ORDER BY c.updated_at DESC`,
      [sessionId]
    );
    return rows.map(this.mapContact);
  }

  static async listByUserId(userId: string): Promise<ContactEntity[]> {
    const db = getDatabase();
    const rows = await db.query<any>(
      `SELECT c.*, COALESCE(cr.ai_enabled, 1) as ai_enabled, COALESCE(cr.blocked, 0) as blocked
       FROM contacts c
       LEFT JOIN contact_rules cr ON c.id = cr.contact_id
       WHERE c.user_id = $1
       ORDER BY c.updated_at DESC`,
      [userId]
    );
    return rows.map(this.mapContact);
  }

  static async findByJid(sessionId: string, waJid: string): Promise<ContactEntity | null> {
    const db = getDatabase();
    const row = await db.queryOne<any>(
      `SELECT c.*, COALESCE(cr.ai_enabled, 1) as ai_enabled, COALESCE(cr.blocked, 0) as blocked
       FROM contacts c
       LEFT JOIN contact_rules cr ON c.id = cr.contact_id
       WHERE c.session_id = $1 AND c.wa_jid = $2
       LIMIT 1`,
      [sessionId, waJid]
    );
    return row ? this.mapContact(row) : null;
  }

  static async findBySessionAndJid(sessionId: string, waJid: string): Promise<ContactEntity | null> {
    return this.findByJid(sessionId, waJid);
  }

  static async findById(id: string): Promise<ContactEntity | null> {
    const db = getDatabase();
    const row = await db.queryOne<any>(
      `SELECT c.*, COALESCE(cr.ai_enabled, 1) as ai_enabled, COALESCE(cr.blocked, 0) as blocked
       FROM contacts c
       LEFT JOIN contact_rules cr ON c.id = cr.contact_id
       WHERE c.id = $1
       LIMIT 1`,
      [id]
    );
    return row ? this.mapContact(row) : null;
  }

  static async upsertContact(params: {
    sessionId: string;
    userId: string;
    waJid: string;
    displayName?: string | null;
    phoneNumber?: string | null;
  }): Promise<ContactEntity> {
    const db = getDatabase();
    const existing = await this.findByJid(params.sessionId, params.waJid);
    const now = new Date().toISOString();

    if (existing) {
      if (params.displayName && params.displayName !== existing.display_name) {
        await db.execute(
          'UPDATE contacts SET display_name = $1, updated_at = $2 WHERE id = $3',
          [params.displayName, now, existing.id]
        );
      }
      return (await this.findById(existing.id))!;
    }

    const id = randomUUID();
    await db.execute(
      `INSERT INTO contacts (id, session_id, user_id, wa_jid, display_name, phone_number, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        params.sessionId,
        params.userId,
        params.waJid,
        params.displayName || null,
        params.phoneNumber || null,
        now,
        now,
      ]
    );

    // Create default contact rule
    const ruleId = randomUUID();
    await db.execute(
      `INSERT INTO contact_rules (id, session_id, user_id, contact_id, ai_enabled, blocked, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 1, 0, $5, $6)`,
      [ruleId, params.sessionId, params.userId, id, now, now]
    );

    return (await this.findById(id))!;
  }

  static async updateContactRules(
    contactId: string,
    sessionId: string,
    userId: string,
    rules: { ai_enabled?: boolean; blocked?: boolean }
  ): Promise<ContactEntity> {
    const db = getDatabase();
    const now = new Date().toISOString();
    const existing = await this.findById(contactId);
    if (!existing) {
      throw new Error(`Contact ${contactId} not found`);
    }

    const aiEnabled = rules.ai_enabled !== undefined ? (rules.ai_enabled ? 1 : 0) : existing.ai_enabled ? 1 : 0;
    const blocked = rules.blocked !== undefined ? (rules.blocked ? 1 : 0) : existing.blocked ? 1 : 0;

    const existingRule = await db.queryOne<any>(
      'SELECT id FROM contact_rules WHERE contact_id = $1',
      [contactId]
    );

    if (existingRule) {
      await db.execute(
        'UPDATE contact_rules SET ai_enabled = $1, blocked = $2, updated_at = $3 WHERE contact_id = $4',
        [aiEnabled, blocked, now, contactId]
      );
    } else {
      await db.execute(
        `INSERT INTO contact_rules (id, session_id, user_id, contact_id, ai_enabled, blocked, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [randomUUID(), sessionId, userId, contactId, aiEnabled, blocked, now, now]
      );
    }

    return (await this.findById(contactId))!;
  }

  static async updateRule(
    userId: string,
    contactId: string,
    rules: { ai_enabled?: boolean; blocked?: boolean }
  ): Promise<ContactEntity> {
    const existing = await this.findById(contactId);
    if (!existing) throw new Error('Contact not found');
    return this.updateContactRules(contactId, existing.session_id, userId, rules);
  }

  static async getGroupRule(sessionId: string, groupJid: string): Promise<GroupRuleEntity | null> {
    const db = getDatabase();
    const row = await db.queryOne<any>(
      'SELECT * FROM group_rules WHERE session_id = $1 AND group_jid = $2 LIMIT 1',
      [sessionId, groupJid]
    );
    if (!row) return null;
    return {
      ...row,
      ai_enabled: Boolean(row.ai_enabled),
      reply_only_when_mentioned: Boolean(row.reply_only_when_mentioned),
    };
  }

  static async upsertGroupRule(
    sessionId: string,
    userId: string,
    groupJid: string,
    rules: { ai_enabled?: boolean; reply_only_when_mentioned?: boolean }
  ): Promise<GroupRuleEntity> {
    const db = getDatabase();
    const now = new Date().toISOString();
    const existing = await this.getGroupRule(sessionId, groupJid);

    if (existing) {
      const aiEnabled = rules.ai_enabled !== undefined ? (rules.ai_enabled ? 1 : 0) : existing.ai_enabled ? 1 : 0;
      const replyOnly = rules.reply_only_when_mentioned !== undefined ? (rules.reply_only_when_mentioned ? 1 : 0) : existing.reply_only_when_mentioned ? 1 : 0;
      await db.execute(
        'UPDATE group_rules SET ai_enabled = $1, reply_only_when_mentioned = $2, updated_at = $3 WHERE session_id = $4 AND group_jid = $5',
        [aiEnabled, replyOnly, now, sessionId, groupJid]
      );
    } else {
      await db.execute(
        `INSERT INTO group_rules (id, session_id, user_id, group_jid, ai_enabled, reply_only_when_mentioned, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          randomUUID(),
          sessionId,
          userId,
          groupJid,
          rules.ai_enabled ? 1 : 0,
          rules.reply_only_when_mentioned !== undefined ? (rules.reply_only_when_mentioned ? 1 : 0) : 1,
          now,
          now,
        ]
      );
    }

    return (await this.getGroupRule(sessionId, groupJid))!;
  }

  static async setGroupRule(
    userId: string,
    sessionId: string,
    groupJid: string,
    rules: { ai_enabled?: boolean; reply_only_when_mentioned?: boolean }
  ): Promise<GroupRuleEntity> {
    return this.upsertGroupRule(sessionId, userId, groupJid, rules);
  }

  private static mapContact(row: any): ContactEntity {
    return {
      ...row,
      ai_enabled: Boolean(row.ai_enabled),
      blocked: Boolean(row.blocked),
    };
  }
}
