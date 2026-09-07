"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardRepository = void 0;
const db_js_1 = require("../db.js");
const aiSettingsRepository_js_1 = require("./aiSettingsRepository.js");
const sessionRepository_js_1 = require("./sessionRepository.js");
class DashboardRepository {
    static async getMetrics(userId) {
        const db = (0, db_js_1.getDatabase)();
        const session = await sessionRepository_js_1.SessionRepository.getOrCreateByUserId(userId);
        const aiSettings = await aiSettingsRepository_js_1.AISettingsRepository.findBySessionId(session.id);
        const today = new Date().toISOString().split('T')[0];
        const todayMsgRow = await db.queryOne(`SELECT COUNT(*) as count FROM messages
       WHERE session_id = $1 AND created_at >= $2`, [session.id, today]);
        const todayAiRow = await db.queryOne(`SELECT COUNT(*) as count FROM messages
       WHERE session_id = $1 AND ai_generated = 1 AND created_at >= $2`, [session.id, today]);
        const activeConvRow = await db.queryOne(`SELECT COUNT(*) as count FROM conversations
       WHERE session_id = $1 AND last_message_at IS NOT NULL`, [session.id]);
        const pendingTakeoverRow = await db.queryOne(`SELECT COUNT(*) as count FROM conversations
       WHERE session_id = $1 AND takeover_active = 1`, [session.id]);
        return {
            whatsappStatus: session.status,
            aiEnabled: aiSettings ? Boolean(aiSettings.enabled) : true,
            todayMessages: Number(todayMsgRow?.count || 0),
            todayAiReplies: Number(todayAiRow?.count || 0),
            activeConversations: Number(activeConvRow?.count || 0),
            pendingTakeover: Number(pendingTakeoverRow?.count || 0),
            phoneNumber: session.phone_number,
        };
    }
    static async getStats(userId) {
        return this.getMetrics(userId);
    }
}
exports.DashboardRepository = DashboardRepository;
//# sourceMappingURL=dashboardRepository.js.map