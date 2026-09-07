"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const index_js_1 = require("../config/index.js");
const sessionRepository_js_1 = require("../database/repositories/sessionRepository.js");
const userRepository_js_1 = require("../database/repositories/userRepository.js");
const errors_js_1 = require("../utils/errors.js");
const logger_js_1 = require("../utils/logger.js");
class AuthService {
    static async register(data) {
        const existing = await userRepository_js_1.UserRepository.findByEmail(data.email);
        if (existing) {
            throw new errors_js_1.ConflictError('A user with this email address already exists');
        }
        if (!data.password || data.password.length < 6) {
            throw new errors_js_1.BadRequestError('Password must be at least 6 characters long');
        }
        const salt = await bcryptjs_1.default.genSalt(10);
        const passwordHash = await bcryptjs_1.default.hash(data.password, salt);
        const user = await userRepository_js_1.UserRepository.create({
            email: data.email,
            password_hash: passwordHash,
            full_name: data.fullName,
        });
        // Initialize the user's isolated WhatsApp session and default AI settings
        const session = await sessionRepository_js_1.SessionRepository.getOrCreateByUserId(user.id);
        (0, logger_js_1.logEvent)({ userId: user.id, event: 'USER_REGISTERED' }, `New user registered: ${user.email}`);
        const token = this.generateToken(user);
        return {
            token,
            user: {
                id: user.id,
                email: user.email,
                fullName: user.full_name,
                createdAt: user.created_at,
            },
            session: {
                id: session.id,
                status: session.status,
                phoneNumber: session.phone_number,
            },
        };
    }
    static async login(data) {
        const user = await userRepository_js_1.UserRepository.findByEmail(data.email);
        if (!user) {
            throw new errors_js_1.UnauthorizedError('Invalid email or password');
        }
        const isMatch = await bcryptjs_1.default.compare(data.password, user.password_hash);
        if (!isMatch) {
            throw new errors_js_1.UnauthorizedError('Invalid email or password');
        }
        const session = await sessionRepository_js_1.SessionRepository.getOrCreateByUserId(user.id);
        (0, logger_js_1.logEvent)({ userId: user.id, event: 'USER_LOGIN' }, `User logged in: ${user.email}`);
        const token = this.generateToken(user);
        return {
            token,
            user: {
                id: user.id,
                email: user.email,
                fullName: user.full_name,
                createdAt: user.created_at,
            },
            session: {
                id: session.id,
                status: session.status,
                phoneNumber: session.phone_number,
            },
        };
    }
    static async getMe(userId) {
        const user = await userRepository_js_1.UserRepository.findById(userId);
        if (!user) {
            throw new errors_js_1.UnauthorizedError('User not found');
        }
        const session = await sessionRepository_js_1.SessionRepository.getOrCreateByUserId(user.id);
        return {
            user: {
                id: user.id,
                email: user.email,
                fullName: user.full_name,
                createdAt: user.created_at,
            },
            session: {
                id: session.id,
                status: session.status,
                phoneNumber: session.phone_number,
                connectedAt: session.connected_at,
                lastSeenAt: session.last_seen_at,
            },
        };
    }
    static generateToken(user) {
        return jsonwebtoken_1.default.sign({
            userId: user.id,
            email: user.email,
            fullName: user.full_name,
        }, index_js_1.config.JWT_SECRET, { expiresIn: index_js_1.config.JWT_EXPIRES_IN });
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=authService.js.map