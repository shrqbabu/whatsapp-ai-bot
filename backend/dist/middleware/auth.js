import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { UnauthorizedError } from '../utils/errors.js';
export function authMiddleware(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedError('Authentication token required');
        }
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, config.JWT_SECRET);
        if (!decoded.userId) {
            throw new UnauthorizedError('Invalid authentication token payload');
        }
        req.user = {
            userId: decoded.userId,
            email: decoded.email,
            fullName: decoded.fullName,
        };
        next();
    }
    catch (error) {
        if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
            return next(new UnauthorizedError('Invalid or expired authentication token'));
        }
        next(error);
    }
}
//# sourceMappingURL=auth.js.map