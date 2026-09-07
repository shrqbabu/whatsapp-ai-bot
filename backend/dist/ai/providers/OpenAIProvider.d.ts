import { AIProvider, AIRequestContext } from './AIProvider.js';
export declare class OpenAIProvider implements AIProvider {
    readonly name = "OpenAI";
    private client;
    constructor();
    generateReply(context: AIRequestContext): Promise<string>;
}
