import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
export declare const updateAISettingsSchema: z.ZodObject<{
    enabled: z.ZodOptional<z.ZodBoolean>;
    system_prompt: z.ZodOptional<z.ZodString>;
    model: z.ZodOptional<z.ZodString>;
    api_base_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    api_key: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    reply_delay: z.ZodOptional<z.ZodNumber>;
    debounce_delay: z.ZodOptional<z.ZodNumber>;
    groups_enabled: z.ZodOptional<z.ZodBoolean>;
    reply_only_when_mentioned: z.ZodOptional<z.ZodBoolean>;
    business_hours_enabled: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    enabled?: boolean | undefined;
    system_prompt?: string | undefined;
    model?: string | undefined;
    api_base_url?: string | null | undefined;
    api_key?: string | null | undefined;
    reply_delay?: number | undefined;
    debounce_delay?: number | undefined;
    groups_enabled?: boolean | undefined;
    reply_only_when_mentioned?: boolean | undefined;
    business_hours_enabled?: boolean | undefined;
}, {
    enabled?: boolean | undefined;
    system_prompt?: string | undefined;
    model?: string | undefined;
    api_base_url?: string | null | undefined;
    api_key?: string | null | undefined;
    reply_delay?: number | undefined;
    debounce_delay?: number | undefined;
    groups_enabled?: boolean | undefined;
    reply_only_when_mentioned?: boolean | undefined;
    business_hours_enabled?: boolean | undefined;
}>;
export declare class AIController {
    static getSettings(req: Request, res: Response, next: NextFunction): Promise<void>;
    static updateSettings(req: Request, res: Response, next: NextFunction): Promise<void>;
}
