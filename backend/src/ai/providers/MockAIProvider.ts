import { AIProvider, AIRequestContext } from './AIProvider.js';

export class MockAIProvider implements AIProvider {
  readonly name = 'mock';
  private customReplyGenerator?: (context: AIRequestContext) => Promise<string> | string;

  constructor(customReplyGenerator?: (context: AIRequestContext) => Promise<string> | string) {
    this.customReplyGenerator = customReplyGenerator;
  }

  setCustomReply(fn: (context: AIRequestContext) => Promise<string> | string) {
    this.customReplyGenerator = fn;
  }

  async generateReply(context: AIRequestContext): Promise<string> {
    if (this.customReplyGenerator) {
      return this.customReplyGenerator(context);
    }

    const text = context.incomingMessage.toLowerCase();
    if (text.includes('hello') || text.includes('hi')) {
      return 'Hello! How can I assist you today?';
    }
    if (text.includes('price') || text.includes('cost')) {
      return 'Our plans start from $29/month. Would you like more details?';
    }
    if (text.includes('help')) {
      return 'I am here to help you. What issue are you experiencing?';
    }

    return `Thank you for your message regarding: "${context.incomingMessage}". Our team is here to support you!`;
  }
}
