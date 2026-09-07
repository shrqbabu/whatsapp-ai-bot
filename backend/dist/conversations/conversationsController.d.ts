import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
export declare const takeoverSchema: z.ZodObject<{
    duration_minutes: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    durationMinutes: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    duration_minutes?: number | null | undefined;
    durationMinutes?: number | null | undefined;
}, {
    duration_minutes?: number | null | undefined;
    durationMinutes?: number | null | undefined;
}>;
export declare const sendMessageSchema: z.ZodObject<{
    text: z.ZodString;
}, "strip", z.ZodTypeAny, {
    text: string;
}, {
    text: string;
}>;
export declare class ConversationsController {
    static listConversations(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getMessages(req: Request, res: Response, next: NextFunction): Promise<void>;
    static takeover(req: Request, res: Response, next: NextFunction): Promise<void>;
    static resume(req: Request, res: Response, next: NextFunction): Promise<void>;
    static sendMessage(req: Request, res: Response, next: NextFunction): Promise<void>;
}
