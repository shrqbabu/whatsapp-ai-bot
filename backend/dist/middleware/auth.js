"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const index_js_1 = require("../config/index.js");
const errors_js_1 = require("../utils/errors.js");
function authMiddleware(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new errors_js_1.UnauthorizedError('Authentication token required');
        }
        const token = authHeader.substring(7);
        const decoded = jsonwebtoken_1.default.verify(token, index_js_1.config.JWT_SECRET);
        if (!decoded.userId) {
            throw new errors_js_1.UnauthorizedError('Invalid authentication token payload');
        }
        req.user = {
            userId: decoded.userId,
            email: decoded.email,
            fullName: decoded.fullName,
        };
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError || error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            return next(new errors_js_1.UnauthorizedError('Invalid or expired authentication token'));
        }
        next(error);
    }
}
//# sourceMappingURL=auth.js.map