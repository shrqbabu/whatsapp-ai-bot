import { AIProvider, AIRequestContext } from './AIProvider.js';
export declare class OpenAIProvider implements AIProvider {
    readonly name = "OpenAI-Compatible";
    generateReply(context: AIRequestContext): Promise<string>;
}
