import { z } from 'zod';
import { BusinessHoursRepository } from '../database/repositories/businessHoursRepository.js';
import { SessionRepository } from '../database/repositories/sessionRepository.js';
export const updateBusinessHoursSchema = z.object({
    schedule: z.array(z.object({
        day_of_week: z.number().min(0).max(6),
        enabled: z.boolean(),
        start_time: z.string(),
        end_time: z.string(),
        timezone: z.string().optional(),
        outside_hours_action: z.enum(['DO_NOTHING', 'SEND_CUSTOM_MESSAGE']).optional(),
        outside_hours_message: z.string().nullable().optional(),
    })),
});
export class BusinessHoursController {
    static async getSchedule(req, res, next) {
        try {
            const userId = req.user.userId;
            const session = await SessionRepository.getOrCreateByUserId(userId);
            const schedule = await BusinessHoursRepository.listBySessionId(session.id);
            res.status(200).json({
                success: true,
                data: schedule,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async updateSchedule(req, res, next) {
        try {
            const userId = req.user.userId;
            const session = await SessionRepository.getOrCreateByUserId(userId);
            const data = updateBusinessHoursSchema.parse(req.body);
            const updated = await BusinessHoursRepository.updateSchedule(session.id, userId, data.schedule);
            res.status(200).json({
                success: true,
                data: updated,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
//# sourceMappingURL=businessHoursController.js.map