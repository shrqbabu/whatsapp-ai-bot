"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
const authService_js_1 = require("./authService.js");
exports.registerSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
    fullName: zod_1.z.string().min(2),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1),
});
class AuthController {
    static async register(req, res, next) {
        try {
            const validated = exports.registerSchema.parse(req.body);
            const result = await authService_js_1.AuthService.register(validated);
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
            const validated = exports.loginSchema.parse(req.body);
            const result = await authService_js_1.AuthService.login(validated);
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
            const result = await authService_js_1.AuthService.getMe(userId);
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
exports.AuthController = AuthController;
//# sourceMappingURL=authController.js.map