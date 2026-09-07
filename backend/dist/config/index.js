"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const zod_1 = require("zod");
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    PORT: zod_1.z.string().default('4000').transform((val) => parseInt(val, 10)),
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    DATABASE_URL: zod_1.z.string().optional(),
    SQLITE_PATH: zod_1.z.string().default('data/app.db'),
    JWT_SECRET: zod_1.z.string().default('production-secure-jwt-secret-key-change-in-production-2026'),
    JWT_EXPIRES_IN: zod_1.z.string().default('7d'),
    OPENAI_API_KEY: zod_1.z.string().optional().default(''),
    ANTHROPIC_API_KEY: zod_1.z.string().optional().default(''),
    SESSION_STORAGE_DIR: zod_1.z.string().default('storage/sessions'),
    DEFAULT_AI_MODEL: zod_1.z.string().default('gpt-4o-mini'),
    DEFAULT_SYSTEM_PROMPT: zod_1.z.string().default('You are a friendly and professional customer support assistant. Reply concisely and helpfully. Use the same language as the customer.'),
    CORS_ORIGIN: zod_1.z.string().default('*'),
    MAX_HISTORY_MESSAGES: zod_1.z.string().default('10').transform((val) => parseInt(val, 10)),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.error('Invalid environment configuration:', parsed.error.format());
    process.exit(1);
}
exports.config = {
    ...parsed.data,
    isProduction: parsed.data.NODE_ENV === 'production',
    isTest: parsed.data.NODE_ENV === 'test',
    resolvedStorageDir: path_1.default.resolve(process.cwd(), parsed.data.SESSION_STORAGE_DIR),
};
//# sourceMappingURL=index.js.map