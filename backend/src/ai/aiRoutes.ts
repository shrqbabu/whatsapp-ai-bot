import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { tenantGuard } from '../middleware/tenantGuard.js';
import { AIController } from './aiController.js';

const router = Router();

router.use(authMiddleware, tenantGuard);

router.get('/settings', AIController.getSettings);
router.put('/settings', AIController.updateSettings);

export default router;
