"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_js_1 = require("../middleware/auth.js");
const tenantGuard_js_1 = require("../middleware/tenantGuard.js");
const aiController_js_1 = require("./aiController.js");
const router = (0, express_1.Router)();
router.use(auth_js_1.authMiddleware, tenantGuard_js_1.tenantGuard);
router.get('/settings', aiController_js_1.AIController.getSettings);
router.put('/settings', aiController_js_1.AIController.updateSettings);
exports.default = router;
//# sourceMappingURL=aiRoutes.js.map