"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIProvider = void 0;
const openai_1 = __importDefault(require("openai"));
const index_js_1 = require("../../config/index.js");
const logger_js_1 = require("../../utils/logger.js");
class OpenAIProvider {
    name = 'OpenAI';
    client = null;
    constructor() {
        if (index_js_1.config.OPENAI_API_KEY) {
            this.client = new openai_1.default({ apiKey: index_js_1.config.OPENAI_API_KEY });
        }
    }
    async generateReply(context) {
        if (!this.client) {
            // If API key is not configured, generate a fallback intelligent simulation
            logger_js_1.logger.warn('OPENAI_API_KEY is not configured, returning contextual fallback response');
            return `Thank you for your message: "${context.incomingMessage}". Our AI assistant is currently running in offline demo mode.`;
        }
        const model = context.modelName || index_js_1.config.DEFAULT_AI_MODEL;
        const messages = [
            {
                role: 'system',
                content: context.systemPrompt || index_js_1.config.DEFAULT_SYSTEM_PROMPT,
            },
        ];
        // Add recent conversation history
        for (const msg of context.conversationHistory) {
            messages.push({
                role: msg.role === 'assistant' ? 'assistant' : 'user',
                content: msg.content,
            });
        }
        // Add current incoming message
        messages.push({
            role: 'user',
            content: context.incomingMessage,
        });
        try {
            const response = await this.client.chat.completions.create({
                model,
                messages,
                temperature: 0.7,
                max_tokens: 500,
            });
            const reply = response.choices[0]?.message?.content?.trim();
            if (!reply) {
                throw new Error('Received empty response from OpenAI');
            }
            return reply;
        }
        catch (error) {
            logger_js_1.logger.error({ error, model }, 'OpenAI API completion failure');
            throw error;
        }
    }
}
exports.OpenAIProvider = OpenAIProvider;
//# sourceMappingURL=OpenAIProvider.js.map