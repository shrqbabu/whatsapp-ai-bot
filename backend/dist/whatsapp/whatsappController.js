"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppController = void 0;
const sessionManager_js_1 = require("./sessionManager.js");
class WhatsAppController {
    static async connect(req, res, next) {
        try {
            const userId = req.user.userId;
            const result = await sessionManager_js_1.WhatsAppSessionManager.connectSession(userId);
            res.status(200).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async disconnect(req, res, next) {
        try {
            const userId = req.user.userId;
            await sessionManager_js_1.WhatsAppSessionManager.disconnectSession(userId);
            res.status(200).json({
                success: true,
                message: 'WhatsApp session disconnected',
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async destroy(req, res, next) {
        try {
            const userId = req.user.userId;
            await sessionManager_js_1.WhatsAppSessionManager.destroySession(userId);
            res.status(200).json({
                success: true,
                message: 'WhatsApp session unlinked and destroyed',
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async getStatus(req, res, next) {
        try {
            const userId = req.user.userId;
            const status = await sessionManager_js_1.WhatsAppSessionManager.getSessionStatus(userId);
            res.status(200).json({
                success: true,
                data: status,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async getQRCode(req, res, next) {
        try {
            const userId = req.user.userId;
            const qr = await sessionManager_js_1.WhatsAppSessionManager.getQRCode(userId);
            res.status(200).json({
                success: true,
                data: { qr },
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.WhatsAppController = WhatsAppController;
//# sourceMappingURL=whatsappController.js.map