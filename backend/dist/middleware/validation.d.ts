import { NextFunction, Request, Response } from 'express';
import { ZodSchema } from 'zod';
export declare function validateBody(schema: ZodSchema): (req: Request, res: Response, next: NextFunction) => void;
export declare function validateQuery(schema: ZodSchema): (req: Request, res: Response, next: NextFunction) => void;
