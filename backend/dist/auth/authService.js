import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { SessionRepository } from '../database/repositories/sessionRepository.js';
import { UserRepository } from '../database/repositories/userRepository.js';
import { BadRequestError, ConflictError, UnauthorizedError } from '../utils/errors.js';
import { logEvent } from '../utils/logger.js';
export class AuthService {
    static async register(data) {
        const existing = await UserRepository.findByEmail(data.email);
        if (existing) {
            throw new ConflictError('A user with this email address already exists');
        }
        if (!data.password || data.password.length < 6) {
            throw new BadRequestError('Password must be at least 6 characters long');
        }
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(data.password, salt);
        const user = await UserRepository.create({
            email: data.email,
            password_hash: passwordHash,
            full_name: data.fullName,
        });
        // Initialize the user's isolated WhatsApp session and default AI settings
        const session = await SessionRepository.getOrCreateByUserId(user.id);
        logEvent({ userId: user.id, event: 'USER_REGISTERED' }, `New user registered: ${user.email}`);
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
        const user = await UserRepository.findByEmail(data.email);
        if (!user) {
            throw new UnauthorizedError('Invalid email or password');
        }
        const isMatch = await bcrypt.compare(data.password, user.password_hash);
        if (!isMatch) {
            throw new UnauthorizedError('Invalid email or password');
        }
        const session = await SessionRepository.getOrCreateByUserId(user.id);
        logEvent({ userId: user.id, event: 'USER_LOGIN' }, `User logged in: ${user.email}`);
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
        const user = await UserRepository.findById(userId);
        if (!user) {
            throw new UnauthorizedError('User not found');
        }
        const session = await SessionRepository.getOrCreateByUserId(user.id);
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
        return jwt.sign({
            userId: user.id,
            email: user.email,
            fullName: user.full_name,
        }, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN });
    }
}
//# sourceMappingURL=authService.js.map