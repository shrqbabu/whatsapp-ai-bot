export interface DebouncedMessageJob {
    sessionId: string;
    userId: string;
    conversationId: string;
    chatJid: string;
    senderJid: string;
    messages: string[];
    timer: NodeJS.Timeout;
}
export declare class MessageDebouncer {
    private static activeJobs;
    /**
     * Debounce incoming message. If another message arrives for the same conversation
     * within `debounceSeconds`, it accumulates the text and resets the timer.
     */
    static enqueue(params: {
        sessionId: string;
        userId: string;
        conversationId: string;
        chatJid: string;
        senderJid: string;
        text: string;
        debounceSeconds: number;
        onExecute: (combinedText: string) => Promise<void>;
    }): void;
    static cancel(conversationId: string): void;
}
export declare class ReplyScheduler {
    /**
     * Asynchronously delays execution by `delaySeconds` without blocking the event loop.
     */
    static schedule(delaySeconds: number): Promise<void>;
}
