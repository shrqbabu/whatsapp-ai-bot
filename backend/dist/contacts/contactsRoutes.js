import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { tenantGuard } from '../middleware/tenantGuard.js';
import { ContactsController } from './contactsController.js';
const router = Router();
router.use(authMiddleware, tenantGuard);
router.get('/', ContactsController.listContacts);
router.put('/:id/rules', ContactsController.updateContactRules);
router.get('/groups/:jid/rules', ContactsController.getGroupRule);
router.put('/groups/:jid/rules', ContactsController.updateGroupRule);
export default router;
//# sourceMappingURL=contactsRoutes.js.map