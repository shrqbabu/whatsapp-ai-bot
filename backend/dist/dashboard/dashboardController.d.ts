import { NextFunction, Request, Response } from 'express';
export declare class DashboardController {
    static getStats(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getMetrics(req: Request, res: Response, next: NextFunction): Promise<void>;
}
