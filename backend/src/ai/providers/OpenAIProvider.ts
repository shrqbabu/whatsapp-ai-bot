import OpenAI from 'openai';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { AIProvider, AIRequestContext } from './AIProvider.js';

export class OpenAIProvider implements AIProvider {
  public readonly name = 'OpenAI';
  private client: OpenAI | null = null;

  constructor() {
    if (config.OPENAI_API_KEY) {
      this.client = new OpenAI({ apiKey: config.OPENAI_API_KEY });
    }
  }

  async generateReply(context: AIRequestContext): Promise<string> {
    if (!this.client) {
      // If API key is not configured, generate a fallback intelligent simulation
      logger.warn('OPENAI_API_KEY is not configured, returning contextual fallback response');
      return `Thank you for your message: "${context.incomingMessage}". Our AI assistant is currently running in offline demo mode.`;
    }

    const model = context.modelName || config.DEFAULT_AI_MODEL;

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: context.systemPrompt || config.DEFAULT_SYSTEM_PROMPT,
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
    } catch (error) {
      logger.error({ error, model }, 'OpenAI API completion failure');
      throw error;
    }
  }
}
