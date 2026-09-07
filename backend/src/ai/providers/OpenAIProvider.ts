import OpenAI from 'openai';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { AIProvider, AIRequestContext } from './AIProvider.js';

export class OpenAIProvider implements AIProvider {
  public readonly name = 'OpenAI-Compatible';

  async generateReply(context: AIRequestContext): Promise<string> {
    const effectiveApiKey = context.apiKey || config.OPENAI_API_KEY;
    const effectiveBaseUrl = context.apiBaseUrl || config.OPENAI_BASE_URL || 'https://api.openai.com/v1';

    if (!effectiveApiKey) {
      logger.warn('No OpenAI / third-party API key configured, returning fallback response');
      return `Thank you for your message: "${context.incomingMessage}". [Notice: Please configure an OpenAI-compatible API key or OPENAI_BASE_URL in settings to activate real-time AI responses].`;
    }

    const model = context.modelName || config.DEFAULT_AI_MODEL || 'gpt-4o-mini';

    const client = new OpenAI({
      apiKey: effectiveApiKey,
      baseURL: effectiveBaseUrl,
    });

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
      logger.info(
        { baseURL: effectiveBaseUrl, model, messageCount: messages.length },
        `Calling OpenAI-compatible endpoint (${effectiveBaseUrl})`
      );

      const response = await client.chat.completions.create({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 600,
      });

      const reply = response.choices[0]?.message?.content?.trim();
      if (!reply) {
        throw new Error('Received empty response from OpenAI-compatible provider');
      }

      return reply;
    } catch (error) {
      logger.error({ error, model, baseURL: effectiveBaseUrl }, 'OpenAI-compatible API completion failure');
      throw error;
    }
  }
}
