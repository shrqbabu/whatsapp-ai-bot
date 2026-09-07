export class AppError extends Error {
    statusCode;
    isOperational;
    code;
    constructor(message, statusCode = 500, code) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.isOperational = true;
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}
export class BadRequestError extends AppError {
    constructor(message = 'Bad Request', code = 'BAD_REQUEST') {
        super(message, 400, code);
    }
}
export class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized', code = 'UNAUTHORIZED') {
        super(message, 401, code);
    }
}
export class ForbiddenError extends AppError {
    constructor(message = 'Forbidden: Access denied to this resource', code = 'FORBIDDEN') {
        super(message, 403, code);
    }
}
export class NotFoundError extends AppError {
    constructor(message = 'Resource not found', code = 'NOT_FOUND') {
        super(message, 404, code);
    }
}
export class ConflictError extends AppError {
    constructor(message = 'Conflict with existing resource', code = 'CONFLICT') {
        super(message, 409, code);
    }
}
export class ValidationError extends AppError {
    errors;
    constructor(message = 'Validation failed', errors) {
        super(message, 422, 'VALIDATION_ERROR');
        this.errors = errors;
    }
}
//# sourceMappingURL=errors.js.map