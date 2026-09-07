"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_js_1 = require("../middleware/auth.js");
const rateLimiter_js_1 = require("../middleware/rateLimiter.js");
const authController_js_1 = require("./authController.js");
const router = (0, express_1.Router)();
router.post('/register', rateLimiter_js_1.authRateLimiter, authController_js_1.AuthController.register);
router.post('/login', rateLimiter_js_1.authRateLimiter, authController_js_1.AuthController.login);
router.get('/me', auth_js_1.authMiddleware, authController_js_1.AuthController.me);
exports.default = router;
//# sourceMappingURL=authRoutes.js.map