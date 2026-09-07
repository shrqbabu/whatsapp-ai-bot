"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const app_js_1 = require("./app.js");
const index_js_1 = require("./config/index.js");
const db_js_1 = require("./database/db.js");
const logger_js_1 = require("./utils/logger.js");
const wsServer_js_1 = require("./websocket/wsServer.js");
const sessionManager_js_1 = require("./whatsapp/sessionManager.js");
async function bootstrap() {
    try {
        logger_js_1.logger.info('Starting WhatsApp AI Multi-Tenant Backend...');
        // 1. Initialize Database & Run Migrations
        await (0, db_js_1.runMigrations)();
        // 2. Create Express Application
        const app = (0, app_js_1.createApp)();
        // 3. Create HTTP Server
        const server = http_1.default.createServer(app);
        // 4. Setup Authenticated WebSocket Server
        (0, wsServer_js_1.setupWebSocketServer)(server);
        // 5. Start Listening on Port
        server.listen(index_js_1.config.PORT, () => {
            logger_js_1.logger.info(`Server running on http://localhost:${index_js_1.config.PORT} [Environment: ${index_js_1.config.NODE_ENV}]`);
            (0, logger_js_1.logEvent)({ event: 'SERVER_BOOTSTRAP' }, `Server listening on port ${index_js_1.config.PORT}`);
            // 6. Restore Active WhatsApp Sessions
            if (!index_js_1.config.isTest) {
                sessionManager_js_1.WhatsAppSessionManager.restoreActiveSessions().catch((err) => {
                    logger_js_1.logger.error({ err }, 'Failed restoring active WhatsApp sessions on startup');
                });
            }
        });
        // Handle Graceful Shutdown
        const shutdown = async (signal) => {
            logger_js_1.logger.info(`Received ${signal}. Shutting down gracefully...`);
            server.close(() => {
                logger_js_1.logger.info('HTTP server closed.');
                process.exit(0);
            });
            // Force exit if hanging
            setTimeout(() => {
                logger_js_1.logger.error('Could not close connections in time, forcefully shutting down');
                process.exit(1);
            }, 10000);
        };
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    }
    catch (error) {
        logger_js_1.logger.fatal({ error }, 'Fatal error during server bootstrap');
        process.exit(1);
    }
}
bootstrap();
//# sourceMappingURL=server.js.map