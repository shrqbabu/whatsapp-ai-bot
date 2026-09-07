import { AIProvider } from './AIProvider.js';
export declare class ProviderFactory {
    static getProvider(providerName?: string): AIProvider;
    static setGlobalProvider(provider: AIProvider | null): void;
}
