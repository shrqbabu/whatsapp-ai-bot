import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
export declare const updateBusinessHoursSchema: z.ZodObject<{
    schedule: z.ZodArray<z.ZodObject<{
        day_of_week: z.ZodNumber;
        enabled: z.ZodBoolean;
        start_time: z.ZodString;
        end_time: z.ZodString;
        timezone: z.ZodOptional<z.ZodString>;
        outside_hours_action: z.ZodOptional<z.ZodEnum<["DO_NOTHING", "SEND_CUSTOM_MESSAGE"]>>;
        outside_hours_message: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        day_of_week: number;
        start_time: string;
        end_time: string;
        timezone?: string | undefined;
        outside_hours_action?: "DO_NOTHING" | "SEND_CUSTOM_MESSAGE" | undefined;
        outside_hours_message?: string | null | undefined;
    }, {
        enabled: boolean;
        day_of_week: number;
        start_time: string;
        end_time: string;
        timezone?: string | undefined;
        outside_hours_action?: "DO_NOTHING" | "SEND_CUSTOM_MESSAGE" | undefined;
        outside_hours_message?: string | null | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    schedule: {
        enabled: boolean;
        day_of_week: number;
        start_time: string;
        end_time: string;
        timezone?: string | undefined;
        outside_hours_action?: "DO_NOTHING" | "SEND_CUSTOM_MESSAGE" | undefined;
        outside_hours_message?: string | null | undefined;
    }[];
}, {
    schedule: {
        enabled: boolean;
        day_of_week: number;
        start_time: string;
        end_time: string;
        timezone?: string | undefined;
        outside_hours_action?: "DO_NOTHING" | "SEND_CUSTOM_MESSAGE" | undefined;
        outside_hours_message?: string | null | undefined;
    }[];
}>;
export declare class BusinessHoursController {
    static getSchedule(req: Request, res: Response, next: NextFunction): Promise<void>;
    static updateSchedule(req: Request, res: Response, next: NextFunction): Promise<void>;
}
