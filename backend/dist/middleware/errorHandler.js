"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const zod_1 = require("zod");
const errors_js_1 = require("../utils/errors.js");
const logger_js_1 = require("../utils/logger.js");
const index_js_1 = require("../config/index.js");
function errorHandler(err, req, res, 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
next) {
    const requestId = req.headers['x-request-id'] || 'req_' + Date.now();
    if (err instanceof errors_js_1.AppError) {
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
    if (err instanceof zod_1.ZodError) {
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
    logger_js_1.logger.error({ err, path: req.path, method: req.method }, 'Unhandled internal server error');
    res.status(500).json({
        success: false,
        error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: index_js_1.config.isProduction ? 'Internal Server Error' : err.message,
        },
        requestId,
    });
}
//# sourceMappingURL=errorHandler.js.map