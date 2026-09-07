"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessHoursController = exports.updateBusinessHoursSchema = void 0;
const zod_1 = require("zod");
const businessHoursRepository_js_1 = require("../database/repositories/businessHoursRepository.js");
const sessionRepository_js_1 = require("../database/repositories/sessionRepository.js");
exports.updateBusinessHoursSchema = zod_1.z.object({
    schedule: zod_1.z.array(zod_1.z.object({
        day_of_week: zod_1.z.number().min(0).max(6),
        enabled: zod_1.z.boolean(),
        start_time: zod_1.z.string(),
        end_time: zod_1.z.string(),
        timezone: zod_1.z.string().optional(),
        outside_hours_action: zod_1.z.enum(['DO_NOTHING', 'SEND_CUSTOM_MESSAGE']).optional(),
        outside_hours_message: zod_1.z.string().nullable().optional(),
    })),
});
class BusinessHoursController {
    static async getSchedule(req, res, next) {
        try {
            const userId = req.user.userId;
            const session = await sessionRepository_js_1.SessionRepository.getOrCreateByUserId(userId);
            const schedule = await businessHoursRepository_js_1.BusinessHoursRepository.listBySessionId(session.id);
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
            const session = await sessionRepository_js_1.SessionRepository.getOrCreateByUserId(userId);
            const data = exports.updateBusinessHoursSchema.parse(req.body);
            const updated = await businessHoursRepository_js_1.BusinessHoursRepository.updateSchedule(session.id, userId, data.schedule);
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
exports.BusinessHoursController = BusinessHoursController;
//# sourceMappingURL=businessHoursController.js.map