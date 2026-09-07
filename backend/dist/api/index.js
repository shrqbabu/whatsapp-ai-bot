"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authRoutes_js_1 = __importDefault(require("../auth/authRoutes.js"));
const whatsappRoutes_js_1 = __importDefault(require("../whatsapp/whatsappRoutes.js"));
const aiRoutes_js_1 = __importDefault(require("../ai/aiRoutes.js"));
const contactsRoutes_js_1 = __importDefault(require("../contacts/contactsRoutes.js"));
const businessHoursRoutes_js_1 = __importDefault(require("../business-hours/businessHoursRoutes.js"));
const conversationsRoutes_js_1 = __importDefault(require("../conversations/conversationsRoutes.js"));
const dashboardRoutes_js_1 = __importDefault(require("../dashboard/dashboardRoutes.js"));
const apiRouter = (0, express_1.Router)();
apiRouter.use('/auth', authRoutes_js_1.default);
apiRouter.use('/whatsapp', whatsappRoutes_js_1.default);
apiRouter.use('/ai', aiRoutes_js_1.default);
apiRouter.use('/contacts', contactsRoutes_js_1.default);
apiRouter.use('/business-hours', businessHoursRoutes_js_1.default);
apiRouter.use('/conversations', conversationsRoutes_js_1.default);
apiRouter.use('/dashboard', dashboardRoutes_js_1.default);
exports.default = apiRouter;
//# sourceMappingURL=index.js.map