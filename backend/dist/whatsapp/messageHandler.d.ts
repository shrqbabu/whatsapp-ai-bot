export declare class MessageHandler {
    static handleIncomingUpsert(userId: string, sessionId: string, upsert: {
        messages: any[];
        type: string;
    }, sock?: any): Promise<void>;
    private static processSingleMessage;
    private static extractMessageContent;
}
