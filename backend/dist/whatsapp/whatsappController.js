import { WhatsAppSessionManager } from './sessionManager.js';
export class WhatsAppController {
    static async connect(req, res, next) {
        try {
            const userId = req.user.userId;
            const result = await WhatsAppSessionManager.connectSession(userId);
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
            await WhatsAppSessionManager.disconnectSession(userId);
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
            await WhatsAppSessionManager.destroySession(userId);
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
            const status = await WhatsAppSessionManager.getSessionStatus(userId);
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
            const qr = await WhatsAppSessionManager.getQRCode(userId);
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
//# sourceMappingURL=whatsappController.js.map