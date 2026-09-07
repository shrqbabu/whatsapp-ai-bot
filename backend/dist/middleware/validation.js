import { ZodError } from 'zod';
import { ValidationError } from '../utils/errors.js';
export function validateBody(schema) {
    return (req, res, next) => {
        try {
            req.body = schema.parse(req.body);
            next();
        }
        catch (error) {
            if (error instanceof ZodError) {
                const issues = error.errors.map((e) => ({
                    path: e.path.join('.'),
                    message: e.message,
                }));
                return next(new ValidationError('Invalid request payload', issues));
            }
            next(error);
        }
    };
}
export function validateQuery(schema) {
    return (req, res, next) => {
        try {
            req.query = schema.parse(req.query);
            next();
        }
        catch (error) {
            if (error instanceof ZodError) {
                const issues = error.errors.map((e) => ({
                    path: e.path.join('.'),
                    message: e.message,
                }));
                return next(new ValidationError('Invalid query parameters', issues));
            }
            next(error);
        }
    };
}
//# sourceMappingURL=validation.js.map