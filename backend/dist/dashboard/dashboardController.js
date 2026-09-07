import { DashboardRepository } from '../database/repositories/dashboardRepository.js';
export class DashboardController {
    static async getStats(req, res, next) {
        try {
            const userId = req.user.userId;
            const stats = await DashboardRepository.getMetrics(userId);
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
//# sourceMappingURL=dashboardController.js.map