import { Router } from 'express';
import { ConversationsController } from './conversationsController.js';
import { authMiddleware } from '../middleware/auth.js';
import { tenantGuard } from '../middleware/tenantGuard.js';

const router = Router();

router.use(authMiddleware, tenantGuard);

router.get('/', ConversationsController.listConversations);
router.get('/:id/messages', ConversationsController.getMessages);
router.post('/:id/takeover', ConversationsController.takeover);
router.post('/:id/resume', ConversationsController.resume);
router.post('/:id/send', ConversationsController.sendMessage);

export default router;
