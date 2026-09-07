"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const dashboardRepository_js_1 = require("../database/repositories/dashboardRepository.js");
class DashboardController {
    static async getStats(req, res, next) {
        try {
            const userId = req.user.userId;
            const stats = await dashboardRepository_js_1.DashboardRepository.getMetrics(userId);
            res.status(200).json({
                success: true,
                data: stats,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async getMetrics(req, res, next) {
        return this.getStats(req, res, next);
    }
}
exports.DashboardController = DashboardController;
//# sourceMappingURL=dashboardController.js.map