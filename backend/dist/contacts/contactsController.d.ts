import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
export declare const updateContactRulesSchema: z.ZodObject<{
    ai_enabled: z.ZodOptional<z.ZodBoolean>;
    blocked: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    ai_enabled?: boolean | undefined;
    blocked?: boolean | undefined;
}, {
    ai_enabled?: boolean | undefined;
    blocked?: boolean | undefined;
}>;
export declare const updateGroupRulesSchema: z.ZodObject<{
    ai_enabled: z.ZodOptional<z.ZodBoolean>;
    reply_only_when_mentioned: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    reply_only_when_mentioned?: boolean | undefined;
    ai_enabled?: boolean | undefined;
}, {
    reply_only_when_mentioned?: boolean | undefined;
    ai_enabled?: boolean | undefined;
}>;
export declare class ContactsController {
    static listContacts(req: Request, res: Response, next: NextFunction): Promise<void>;
    static updateContactRules(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getGroupRule(req: Request, res: Response, next: NextFunction): Promise<void>;
    static updateGroupRule(req: Request, res: Response, next: NextFunction): Promise<void>;
}
