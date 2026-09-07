import { Router } from 'express';
import authRoutes from '../auth/authRoutes.js';
import whatsappRoutes from '../whatsapp/whatsappRoutes.js';
import aiRoutes from '../ai/aiRoutes.js';
import contactsRoutes from '../contacts/contactsRoutes.js';
import businessHoursRoutes from '../business-hours/businessHoursRoutes.js';
import conversationsRoutes from '../conversations/conversationsRoutes.js';
import dashboardRoutes from '../dashboard/dashboardRoutes.js';
const apiRouter = Router();
apiRouter.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'whatsapp-ai-backend',
        timestamp: new Date().toISOString(),
    });
});
apiRouter.use('/auth', authRoutes);
apiRouter.use('/whatsapp', whatsappRoutes);
apiRouter.use('/ai', aiRoutes);
apiRouter.use('/contacts', contactsRoutes);
apiRouter.use('/business-hours', businessHoursRoutes);
apiRouter.use('/conversations', conversationsRoutes);
apiRouter.use('/dashboard', dashboardRoutes);
export default apiRouter;
//# sourceMappingURL=routes.js.map