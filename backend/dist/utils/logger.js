"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.logEvent = logEvent;
exports.logError = logError;
const pino_1 = __importDefault(require("pino"));
const index_js_1 = require("../config/index.js");
exports.logger = (0, pino_1.default)({
    level: index_js_1.config.isTest ? 'silent' : (index_js_1.config.isProduction ? 'info' : 'debug'),
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
    transport: !index_js_1.config.isProduction && !index_js_1.config.isTest
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
function logEvent(context, message) {
    exports.logger.info(context, `[${context.event}] ${message}`);
}
function logError(context, err, message) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    exports.logger.error({ ...context, error: errorMessage, stack }, `[${context.event}] ERROR: ${message}`);
}
//# sourceMappingURL=logger.js.map