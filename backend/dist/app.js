"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const index_js_1 = require("./config/index.js");
const errorHandler_js_1 = require("./middleware/errorHandler.js");
const rateLimiter_js_1 = require("./middleware/rateLimiter.js");
const routes_js_1 = __importDefault(require("./api/routes.js"));
function createApp() {
    const app = (0, express_1.default)();
    // Security Headers
    app.use((0, helmet_1.default)());
    // CORS Configuration
    app.use((0, cors_1.default)({
        origin: index_js_1.config.CORS_ORIGIN,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
    }));
    // Request Body Size & JSON Parser
    app.use(express_1.default.json({ limit: '5mb' }));
    app.use(express_1.default.urlencoded({ extended: true, limit: '5mb' }));
    // Global API Rate Limiter
    app.use('/api', rateLimiter_js_1.apiRateLimiter);
    // API Routes
    app.use('/api', routes_js_1.default);
    // Health check
    app.get('/health', (req, res) => {
        res.status(200).json({ status: 'ok', time: new Date().toISOString() });
    });
    // Central Error Handler Middleware
    app.use(errorHandler_js_1.errorHandler);
    return app;
}
//# sourceMappingURL=app.js.map