"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBody = validateBody;
exports.validateQuery = validateQuery;
const zod_1 = require("zod");
const errors_js_1 = require("../utils/errors.js");
function validateBody(schema) {
    return (req, res, next) => {
        try {
            req.body = schema.parse(req.body);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const issues = error.errors.map((e) => ({
                    path: e.path.join('.'),
                    message: e.message,
                }));
                return next(new errors_js_1.ValidationError('Invalid request payload', issues));
            }
            next(error);
        }
    };
}
function validateQuery(schema) {
    return (req, res, next) => {
        try {
            req.query = schema.parse(req.query);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const issues = error.errors.map((e) => ({
                    path: e.path.join('.'),
                    message: e.message,
                }));
                return next(new errors_js_1.ValidationError('Invalid query parameters', issues));
            }
            next(error);
        }
    };
}
//# sourceMappingURL=validation.js.map