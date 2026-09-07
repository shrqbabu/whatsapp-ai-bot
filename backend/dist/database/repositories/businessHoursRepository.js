import { DateTime } from 'luxon';
import { randomUUID } from 'node:crypto';
import { getDatabase } from '../db.js';
export class BusinessHoursRepository {
    static async listBySessionId(sessionId) {
        const db = getDatabase();
        const rows = await db.query('SELECT * FROM business_hours WHERE session_id = $1 ORDER BY day_of_week ASC', [sessionId]);
        return rows.map(this.mapEntity);
    }
    static async updateSchedule(sessionId, userId, schedules) {
        const db = getDatabase();
        const now = new Date().toISOString();
        for (const item of schedules) {
            const existing = await db.queryOne('SELECT id FROM business_hours WHERE session_id = $1 AND day_of_week = $2', [sessionId, item.day_of_week]);
            const enabledVal = item.enabled ? 1 : 0;
            const tz = item.timezone || 'UTC';
            const action = item.outside_hours_action || 'DO_NOTHING';
            const msg = item.outside_hours_message !== undefined ? item.outside_hours_message : null;
            if (existing) {
                await db.execute(`UPDATE business_hours
           SET enabled = $1, start_time = $2, end_time = $3, timezone = $4, outside_hours_action = $5, outside_hours_message = $6, updated_at = $7
           WHERE session_id = $8 AND day_of_week = $9`, [
                    enabledVal,
                    item.start_time,
                    item.end_time,
                    tz,
                    action,
                    msg,
                    now,
                    sessionId,
                    item.day_of_week,
                ]);
            }
            else {
                await db.execute(`INSERT INTO business_hours (id, session_id, user_id, day_of_week, enabled, start_time, end_time, timezone, outside_hours_action, outside_hours_message, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`, [
                    randomUUID(),
                    sessionId,
                    userId,
                    item.day_of_week,
                    enabledVal,
                    item.start_time,
                    item.end_time,
                    tz,
                    action,
                    msg,
                    now,
                    now,
                ]);
            }
        }
        return this.listBySessionId(sessionId);
    }
    static async checkBusinessHours(sessionId, targetDate = new Date()) {
        const schedules = await this.listBySessionId(sessionId);
        if (schedules.length === 0) {
            return { isInside: true, isWithin: true, outsideAction: 'DO_NOTHING', outsideMessage: null };
        }
        const firstRule = schedules[0];
        const timezone = firstRule?.timezone || 'UTC';
        let localTime = DateTime.fromJSDate(targetDate).setZone(timezone);
        if (!localTime.isValid) {
            localTime = DateTime.fromJSDate(targetDate).setZone('UTC');
        }
        const dayOfWeek = localTime.weekday === 7 ? 0 : localTime.weekday;
        const currentDaySchedule = schedules.find((s) => s.day_of_week === dayOfWeek);
        if (!currentDaySchedule || !currentDaySchedule.enabled) {
            return {
                isInside: false,
                isWithin: false,
                outsideAction: currentDaySchedule?.outside_hours_action || 'DO_NOTHING',
                outsideMessage: currentDaySchedule?.outside_hours_message || null,
            };
        }
        const [startH, startM] = currentDaySchedule.start_time.split(':').map((v) => parseInt(v, 10));
        const [endH, endM] = currentDaySchedule.end_time.split(':').map((v) => parseInt(v, 10));
        const currentMinutes = localTime.hour * 60 + localTime.minute;
        const startMinutes = (startH ?? 9) * 60 + (startM ?? 0);
        const endMinutes = (endH ?? 18) * 60 + (endM ?? 0);
        const isInside = currentMinutes >= startMinutes && currentMinutes <= endMinutes;
        return {
            isInside,
            isWithin: isInside,
            outsideAction: currentDaySchedule.outside_hours_action,
            outsideMessage: currentDaySchedule.outside_hours_message,
        };
    }
    static mapEntity(row) {
        return {
            ...row,
            enabled: Boolean(row.enabled),
        };
    }
}
//# sourceMappingURL=businessHoursRepository.js.map