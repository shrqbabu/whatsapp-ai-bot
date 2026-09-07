import { Router } from 'express';
import { DashboardController } from './dashboardController.js';
import { authMiddleware } from '../middleware/auth.js';
import { tenantGuard } from '../middleware/tenantGuard.js';

const router = Router();

router.use(authMiddleware, tenantGuard);

router.get('/stats', DashboardController.getStats);

export default router;
