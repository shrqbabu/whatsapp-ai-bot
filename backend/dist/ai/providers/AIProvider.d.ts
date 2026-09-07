export interface AIHistoryMessage {
    role: 'user' | 'assistant';
    content: string;
}
export interface AIRequestContext {
    systemPrompt: string;
    conversationHistory: AIHistoryMessage[];
    incomingMessage: string;
    senderName?: string;
    modelName?: string;
}
export interface AIProvider {
    readonly name: string;
    generateReply(context: AIRequestContext): Promise<string>;
}
