import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
export function errorHandler(err, req, res, 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
next) {
    const requestId = req.headers['x-request-id'] || 'req_' + Date.now();
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            success: false,
            error: {
                code: err.code || 'APP_ERROR',
                message: err.message,
                details: err.errors || undefined,
            },
            requestId,
        });
        return;
    }
    if (err instanceof ZodError) {
        res.status(422).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid input parameters',
                details: err.errors.map((e) => ({
                    field: e.path.join('.'),
                    message: e.message,
                })),
            },
            requestId,
        });
        return;
    }
    logger.error({ err, path: req.path, method: req.method }, 'Unhandled internal server error');
    res.status(500).json({
        success: false,
        error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: config.isProduction ? 'Internal Server Error' : err.message,
        },
        requestId,
    });
}
//# sourceMappingURL=errorHandler.js.map