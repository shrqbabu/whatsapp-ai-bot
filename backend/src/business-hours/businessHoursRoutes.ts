import { Router } from 'express';
import { BusinessHoursController } from './businessHoursController.js';
import { authMiddleware } from '../middleware/auth.js';
import { tenantGuard } from '../middleware/tenantGuard.js';

const router = Router();

router.use(authMiddleware, tenantGuard);

router.get('/', BusinessHoursController.getSchedule);
router.put('/', BusinessHoursController.updateSchedule);

export default router;
