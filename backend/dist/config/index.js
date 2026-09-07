import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';
dotenv.config();
const envSchema = z.object({
    PORT: z.string().default('4000').transform((val) => parseInt(val, 10)),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    DATABASE_URL: z.string().optional(),
    SQLITE_PATH: z.string().default('data/app.db'),
    JWT_SECRET: z.string().default('production-secure-jwt-secret-key-change-in-production-2026'),
    JWT_EXPIRES_IN: z.string().default('7d'),
    OPENAI_API_KEY: z.string().optional().default(''),
    OPENAI_BASE_URL: z.string().optional().default('https://api.openai.com/v1'),
    ANTHROPIC_API_KEY: z.string().optional().default(''),
    SESSION_STORAGE_DIR: z.string().default('storage/sessions'),
    DEFAULT_AI_MODEL: z.string().default('gpt-4o-mini'),
    DEFAULT_SYSTEM_PROMPT: z.string().default('You are a friendly and professional customer support assistant. Reply concisely and helpfully. Use the same language as the customer.'),
    CORS_ORIGIN: z.string().default('*'),
    MAX_HISTORY_MESSAGES: z.string().default('10').transform((val) => parseInt(val, 10)),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.error('Invalid environment configuration:', parsed.error.format());
    process.exit(1);
}
export const config = {
    ...parsed.data,
    isProduction: parsed.data.NODE_ENV === 'production',
    isTest: parsed.data.NODE_ENV === 'test',
    resolvedStorageDir: path.resolve(process.cwd(), parsed.data.SESSION_STORAGE_DIR),
};
//# sourceMappingURL=index.js.map