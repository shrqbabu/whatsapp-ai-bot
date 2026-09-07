"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const businessHoursController_js_1 = require("./businessHoursController.js");
const auth_js_1 = require("../middleware/auth.js");
const tenantGuard_js_1 = require("../middleware/tenantGuard.js");
const router = (0, express_1.Router)();
router.use(auth_js_1.authMiddleware, tenantGuard_js_1.tenantGuard);
router.get('/', businessHoursController_js_1.BusinessHoursController.getSchedule);
router.put('/', businessHoursController_js_1.BusinessHoursController.updateSchedule);
exports.default = router;
//# sourceMappingURL=businessHoursRoutes.js.map