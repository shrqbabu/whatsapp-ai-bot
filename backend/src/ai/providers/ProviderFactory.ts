import { config } from '../../config/index.js';
import { AIProvider } from './AIProvider.js';
import { MockAIProvider } from './MockAIProvider.js';
import { OpenAIProvider } from './OpenAIProvider.js';

let defaultProviderInstance: AIProvider | null = null;

export class ProviderFactory {
  static getProvider(providerName?: string): AIProvider {
    if (defaultProviderInstance) {
      return defaultProviderInstance;
    }

    if (config.isTest) {
      return new MockAIProvider();
    }

    const name = providerName?.toLowerCase() || 'openai';

    switch (name) {
      case 'mock':
        return new MockAIProvider();
      case 'openai':
      default:
        return new OpenAIProvider();
    }
  }

  static setGlobalProvider(provider: AIProvider | null): void {
    defaultProviderInstance = provider;
  }
}
