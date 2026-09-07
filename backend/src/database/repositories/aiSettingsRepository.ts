import { getDatabase } from '../db.js';

export interface AISettingsEntity {
  id: string;
  session_id: string;
  user_id: string;
  enabled: boolean;
  system_prompt: string;
  model: string;
  reply_delay: number;
  debounce_delay: number;
  groups_enabled: boolean;
  reply_only_when_mentioned: boolean;
  business_hours_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export class AISettingsRepository {
  static async findBySessionId(sessionId: string): Promise<AISettingsEntity | null> {
    const db = getDatabase();
    const row = await db.queryOne<any>(
      'SELECT * FROM ai_settings WHERE session_id = $1 LIMIT 1',
      [sessionId]
    );
    if (!row) return null;
    return this.mapEntity(row);
  }

  static async findByUserId(userId: string): Promise<AISettingsEntity | null> {
    const db = getDatabase();
    const row = await db.queryOne<any>(
      'SELECT * FROM ai_settings WHERE user_id = $1 LIMIT 1',
      [userId]
    );
    if (!row) return null;
    return this.mapEntity(row);
  }

  static async update(
    sessionId: string,
    data: Partial<{
      enabled: boolean;
      system_prompt: string;
      model: string;
      reply_delay: number;
      debounce_delay: number;
      groups_enabled: boolean;
      reply_only_when_mentioned: boolean;
      business_hours_enabled: boolean;
    }>
  ): Promise<AISettingsEntity> {
    const db = getDatabase();
    const existing = await this.findBySessionId(sessionId);
    const now = new Date().toISOString();

    if (!existing) {
      throw new Error(`AI settings not found for session ${sessionId}`);
    }

    const updated = {
      enabled: data.enabled !== undefined ? (data.enabled ? 1 : 0) : existing.enabled ? 1 : 0,
      system_prompt: data.system_prompt !== undefined ? data.system_prompt : existing.system_prompt,
      model: data.model !== undefined ? data.model : existing.model,
      reply_delay: data.reply_delay !== undefined ? data.reply_delay : existing.reply_delay,
      debounce_delay: data.debounce_delay !== undefined ? data.debounce_delay : existing.debounce_delay,
      groups_enabled: data.groups_enabled !== undefined ? (data.groups_enabled ? 1 : 0) : existing.groups_enabled ? 1 : 0,
      reply_only_when_mentioned: data.reply_only_when_mentioned !== undefined ? (data.reply_only_when_mentioned ? 1 : 0) : existing.reply_only_when_mentioned ? 1 : 0,
      business_hours_enabled: data.business_hours_enabled !== undefined ? (data.business_hours_enabled ? 1 : 0) : existing.business_hours_enabled ? 1 : 0,
    };

    await db.execute(
      `UPDATE ai_settings
       SET enabled = $1, system_prompt = $2, model = $3, reply_delay = $4, debounce_delay = $5,
           groups_enabled = $6, reply_only_when_mentioned = $7, business_hours_enabled = $8, updated_at = $9
       WHERE session_id = $10`,
      [
        updated.enabled,
        updated.system_prompt,
        updated.model,
        updated.reply_delay,
        updated.debounce_delay,
        updated.groups_enabled,
        updated.reply_only_when_mentioned,
        updated.business_hours_enabled,
        now,
        sessionId,
      ]
    );

    const result = await this.findBySessionId(sessionId);
    return result!;
  }

  private static mapEntity(row: any): AISettingsEntity {
    return {
      ...row,
      enabled: Boolean(row.enabled),
      groups_enabled: Boolean(row.groups_enabled),
      reply_only_when_mentioned: Boolean(row.reply_only_when_mentioned),
      business_hours_enabled: Boolean(row.business_hours_enabled),
    };
  }
}
