import { Request, Response, NextFunction } from 'express';
export interface AuthenticatedUser {
    userId: string;
    email: string;
    fullName: string;
}
declare global {
    namespace Express {
        interface Request {
            user?: AuthenticatedUser;
        }
    }
}
export declare function authMiddleware(req: Request, res: Response, next: NextFunction): void;
