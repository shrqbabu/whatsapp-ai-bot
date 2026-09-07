import { NextFunction, Request, Response } from 'express';
import { DashboardRepository } from '../database/repositories/dashboardRepository.js';

export class DashboardController {
  static async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const stats = await DashboardRepository.getMetrics(userId);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    return this.getStats(req, res, next);
  }
}
