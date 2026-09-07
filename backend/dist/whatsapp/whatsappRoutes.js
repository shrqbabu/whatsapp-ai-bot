import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { tenantGuard } from '../middleware/tenantGuard.js';
import { WhatsAppController } from './whatsappController.js';
const router = Router();
router.use(authMiddleware, tenantGuard);
router.post('/connect', WhatsAppController.connect);
router.post('/disconnect', WhatsAppController.disconnect);
router.post('/destroy', WhatsAppController.destroy);
router.get('/status', WhatsAppController.getStatus);
router.get('/qr', WhatsAppController.getQRCode);
export default router;
//# sourceMappingURL=whatsappRoutes.js.map