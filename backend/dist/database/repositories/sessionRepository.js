"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionRepository = void 0;
const node_crypto_1 = require("node:crypto");
const db_js_1 = require("../db.js");
class SessionRepository {
    static async findByUserId(userId) {
        const db = (0, db_js_1.getDatabase)();
        return db.queryOne('SELECT * FROM whatsapp_sessions WHERE user_id = $1 LIMIT 1', [userId]);
    }
    static async findById(id) {
        const db = (0, db_js_1.getDatabase)();
        return db.queryOne('SELECT * FROM whatsapp_sessions WHERE id = $1 LIMIT 1', [id]);
    }
    static async getOrCreateByUserId(userId) {
        const existing = await this.findByUserId(userId);
        if (existing)
            return existing;
        const db = (0, db_js_1.getDatabase)();
        const id = (0, node_crypto_1.randomUUID)();
        const now = new Date().toISOString();
        await db.execute('INSERT INTO whatsapp_sessions (id, user_id, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)', [id, userId, 'DISCONNECTED', now, now]);
        // Initialize default AI settings for this session
        await db.execute(`INSERT INTO ai_settings (id, session_id, user_id, enabled, system_prompt, model, reply_delay, debounce_delay, groups_enabled, reply_only_when_mentioned, business_hours_enabled, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`, [
            (0, node_crypto_1.randomUUID)(),
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
        ]);
        // Initialize default 7-day business hours
        const days = [0, 1, 2, 3, 4, 5, 6];
        for (const day of days) {
            const isWeekend = day === 0 || day === 6;
            await db.execute(`INSERT INTO business_hours (id, session_id, user_id, day_of_week, enabled, start_time, end_time, timezone, outside_hours_action, outside_hours_message, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`, [
                (0, node_crypto_1.randomUUID)(),
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
            ]);
        }
        const created = await this.findById(id);
        if (!created)
            throw new Error('Failed to create session');
        return created;
    }
    static async updateStatus(id, status, phoneNumber) {
        const db = (0, db_js_1.getDatabase)();
        const now = new Date().toISOString();
        if (status === 'CONNECTED') {
            await db.execute(`UPDATE whatsapp_sessions SET status = $1, phone_number = COALESCE($2, phone_number), connected_at = $3, last_seen_at = $4, updated_at = $5 WHERE id = $6`, [status, phoneNumber || null, now, now, now, id]);
        }
        else {
            await db.execute(`UPDATE whatsapp_sessions SET status = $1, phone_number = COALESCE($2, phone_number), last_seen_at = $3, updated_at = $4 WHERE id = $5`, [status, phoneNumber || null, now, now, id]);
        }
    }
    static async listAllActiveSessions() {
        const db = (0, db_js_1.getDatabase)();
        return db.query("SELECT * FROM whatsapp_sessions WHERE status IN ('CONNECTED', 'CONNECTING', 'RECONNECTING')");
    }
}
exports.SessionRepository = SessionRepository;
//# sourceMappingURL=sessionRepository.js.map