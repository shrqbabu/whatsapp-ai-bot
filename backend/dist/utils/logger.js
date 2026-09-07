import pino from 'pino';
import { config } from '../config/index.js';
export const logger = pino({
    level: config.isTest ? 'silent' : (config.isProduction ? 'info' : 'debug'),
    redact: [
        'password',
        'password_hash',
        'token',
        'JWT_SECRET',
        'OPENAI_API_KEY',
        'ANTHROPIC_API_KEY',
        'creds',
        'keys',
        'auth_state',
        '*.password',
        '*.token',
    ],
    transport: !config.isProduction && !config.isTest
        ? {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
                ignore: 'pid,hostname',
            },
        }
        : undefined,
});
export function logEvent(context, message) {
    logger.info(context, `[${context.event}] ${message}`);
}
export function logError(context, err, message) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    logger.error({ ...context, error: errorMessage, stack }, `[${context.event}] ERROR: ${message}`);
}
//# sourceMappingURL=logger.js.map