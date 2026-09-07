import { z } from 'zod';
import { AuthService } from './authService.js';
export const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    fullName: z.string().min(2),
});
export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});
export class AuthController {
    static async register(req, res, next) {
        try {
            const validated = registerSchema.parse(req.body);
            const result = await AuthService.register(validated);
            res.status(201).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async login(req, res, next) {
        try {
            const validated = loginSchema.parse(req.body);
            const result = await AuthService.login(validated);
            res.status(200).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async me(req, res, next) {
        try {
            const userId = req.user.userId;
            const result = await AuthService.getMe(userId);
            res.status(200).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
//# sourceMappingURL=authController.js.map