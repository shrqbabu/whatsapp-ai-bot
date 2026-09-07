import { getDatabase } from '../db.js';
import { AISettingsRepository } from './aiSettingsRepository.js';
import { SessionRepository } from './sessionRepository.js';

export interface DashboardMetrics {
  whatsappStatus: string;
  aiEnabled: boolean;
  todayMessages: number;
  todayAiReplies: number;
  activeConversations: number;
  pendingTakeover: number;
  phoneNumber: string | null;
}

export class DashboardRepository {
  static async getMetrics(userId: string): Promise<DashboardMetrics> {
    const db = getDatabase();
    const session = await SessionRepository.getOrCreateByUserId(userId);
    const aiSettings = await AISettingsRepository.findBySessionId(session.id);

    const today = new Date().toISOString().split('T')[0];

    const todayMsgRow = await db.queryOne<any>(
      `SELECT COUNT(*) as count FROM messages
       WHERE session_id = $1 AND created_at >= $2`,
      [session.id, today]
    );

    const todayAiRow = await db.queryOne<any>(
      `SELECT COUNT(*) as count FROM messages
       WHERE session_id = $1 AND ai_generated = 1 AND created_at >= $2`,
      [session.id, today]
    );

    const activeConvRow = await db.queryOne<any>(
      `SELECT COUNT(*) as count FROM conversations
       WHERE session_id = $1 AND last_message_at IS NOT NULL`,
      [session.id]
    );

    const pendingTakeoverRow = await db.queryOne<any>(
      `SELECT COUNT(*) as count FROM conversations
       WHERE session_id = $1 AND takeover_active = 1`,
      [session.id]
    );

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

  static async getStats(userId: string): Promise<DashboardMetrics> {
    return this.getMetrics(userId);
  }
}
