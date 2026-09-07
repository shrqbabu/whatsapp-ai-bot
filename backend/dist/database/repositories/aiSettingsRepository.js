"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AISettingsRepository = void 0;
const db_js_1 = require("../db.js");
class AISettingsRepository {
    static async findBySessionId(sessionId) {
        const db = (0, db_js_1.getDatabase)();
        const row = await db.queryOne('SELECT * FROM ai_settings WHERE session_id = $1 LIMIT 1', [sessionId]);
        if (!row)
            return null;
        return this.mapEntity(row);
    }
    static async findByUserId(userId) {
        const db = (0, db_js_1.getDatabase)();
        const row = await db.queryOne('SELECT * FROM ai_settings WHERE user_id = $1 LIMIT 1', [userId]);
        if (!row)
            return null;
        return this.mapEntity(row);
    }
    static async update(sessionId, data) {
        const db = (0, db_js_1.getDatabase)();
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
        await db.execute(`UPDATE ai_settings
       SET enabled = $1, system_prompt = $2, model = $3, reply_delay = $4, debounce_delay = $5,
           groups_enabled = $6, reply_only_when_mentioned = $7, business_hours_enabled = $8, updated_at = $9
       WHERE session_id = $10`, [
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
        ]);
        const result = await this.findBySessionId(sessionId);
        return result;
    }
    static mapEntity(row) {
        return {
            ...row,
            enabled: Boolean(row.enabled),
            groups_enabled: Boolean(row.groups_enabled),
            reply_only_when_mentioned: Boolean(row.reply_only_when_mentioned),
            business_hours_enabled: Boolean(row.business_hours_enabled),
        };
    }
}
exports.AISettingsRepository = AISettingsRepository;
//# sourceMappingURL=aiSettingsRepository.js.map