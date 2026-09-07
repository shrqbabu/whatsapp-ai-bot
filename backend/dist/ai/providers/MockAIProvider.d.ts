import { AIProvider, AIRequestContext } from './AIProvider.js';
export declare class MockAIProvider implements AIProvider {
    readonly name = "mock";
    private customReplyGenerator?;
    constructor(customReplyGenerator?: (context: AIRequestContext) => Promise<string> | string);
    setCustomReply(fn: (context: AIRequestContext) => Promise<string> | string): void;
    generateReply(context: AIRequestContext): Promise<string>;
}
