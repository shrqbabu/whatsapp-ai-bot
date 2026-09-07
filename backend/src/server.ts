import http from 'http';
import { createApp } from './app.js';
import { config } from './config/index.js';
import { runMigrations } from './database/db.js';
import { logEvent, logger } from './utils/logger.js';
import { setupWebSocketServer } from './websocket/wsServer.js';
import { WhatsAppSessionManager } from './whatsapp/sessionManager.js';

async function bootstrap() {
  try {
    logger.info('Starting WhatsApp AI Multi-Tenant Backend...');

    // 1. Initialize Database & Run Migrations
    await runMigrations();

    // 2. Create Express Application
    const app = createApp();

    // 3. Create HTTP Server
    const server = http.createServer(app);

    // 4. Setup Authenticated WebSocket Server
    setupWebSocketServer(server);

    // 5. Start Listening on Port
    server.listen(config.PORT, () => {
      logger.info(
        `Server running on http://localhost:${config.PORT} [Environment: ${config.NODE_ENV}]`
      );
      logEvent({ event: 'SERVER_BOOTSTRAP' }, `Server listening on port ${config.PORT}`);

      // 6. Restore Active WhatsApp Sessions
      if (!config.isTest) {
        WhatsAppSessionManager.restoreActiveSessions().catch((err) => {
          logger.error({ err }, 'Failed restoring active WhatsApp sessions on startup');
        });
      }
    });

    // Handle Graceful Shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      server.close(() => {
        logger.info('HTTP server closed.');
        process.exit(0);
      });

      // Force exit if hanging
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.fatal({ error }, 'Fatal error during server bootstrap');
    process.exit(1);
  }
}

bootstrap();
