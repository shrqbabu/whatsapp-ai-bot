import { NextFunction, Request, Response } from 'express';
export declare class WhatsAppController {
    static connect(req: Request, res: Response, next: NextFunction): Promise<void>;
    static disconnect(req: Request, res: Response, next: NextFunction): Promise<void>;
    static destroy(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getStatus(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getQRCode(req: Request, res: Response, next: NextFunction): Promise<void>;
}
