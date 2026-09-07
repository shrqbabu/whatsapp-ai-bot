"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const conversationsController_js_1 = require("./conversationsController.js");
const auth_js_1 = require("../middleware/auth.js");
const tenantGuard_js_1 = require("../middleware/tenantGuard.js");
const router = (0, express_1.Router)();
router.use(auth_js_1.authMiddleware, tenantGuard_js_1.tenantGuard);
router.get('/', conversationsController_js_1.ConversationsController.listConversations);
router.get('/:id/messages', conversationsController_js_1.ConversationsController.getMessages);
router.post('/:id/takeover', conversationsController_js_1.ConversationsController.takeover);
router.post('/:id/resume', conversationsController_js_1.ConversationsController.resume);
router.post('/:id/send', conversationsController_js_1.ConversationsController.sendMessage);
exports.default = router;
//# sourceMappingURL=conversationsRoutes.js.map