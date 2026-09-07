"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIController = exports.updateAISettingsSchema = void 0;
const zod_1 = require("zod");
const aiSettingsRepository_js_1 = require("../database/repositories/aiSettingsRepository.js");
const sessionRepository_js_1 = require("../database/repositories/sessionRepository.js");
exports.updateAISettingsSchema = zod_1.z.object({
    enabled: zod_1.z.boolean().optional(),
    system_prompt: zod_1.z.string().min(1).optional(),
    model: zod_1.z.string().min(1).optional(),
    reply_delay: zod_1.z.number().min(0).max(60).optional(),
    debounce_delay: zod_1.z.number().min(0).max(30).optional(),
    groups_enabled: zod_1.z.boolean().optional(),
    reply_only_when_mentioned: zod_1.z.boolean().optional(),
    business_hours_enabled: zod_1.z.boolean().optional(),
});
class AIController {
    static async getSettings(req, res, next) {
        try {
            const userId = req.user.userId;
            const session = await sessionRepository_js_1.SessionRepository.getOrCreateByUserId(userId);
            const settings = await aiSettingsRepository_js_1.AISettingsRepository.findBySessionId(session.id);
            res.status(200).json({
                success: true,
                data: settings,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async updateSettings(req, res, next) {
        try {
            const userId = req.user.userId;
            const session = await sessionRepository_js_1.SessionRepository.getOrCreateByUserId(userId);
            const data = exports.updateAISettingsSchema.parse(req.body);
            const updated = await aiSettingsRepository_js_1.AISettingsRepository.update(session.id, data);
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
exports.AIController = AIController;
//# sourceMappingURL=aiController.js.map