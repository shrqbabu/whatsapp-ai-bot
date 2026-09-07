"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_js_1 = require("../middleware/auth.js");
const tenantGuard_js_1 = require("../middleware/tenantGuard.js");
const whatsappController_js_1 = require("./whatsappController.js");
const router = (0, express_1.Router)();
router.use(auth_js_1.authMiddleware, tenantGuard_js_1.tenantGuard);
router.post('/connect', whatsappController_js_1.WhatsAppController.connect);
router.post('/disconnect', whatsappController_js_1.WhatsAppController.disconnect);
router.post('/destroy', whatsappController_js_1.WhatsAppController.destroy);
router.get('/status', whatsappController_js_1.WhatsAppController.getStatus);
router.get('/qr', whatsappController_js_1.WhatsAppController.getQRCode);
exports.default = router;
//# sourceMappingURL=whatsappRoutes.js.map