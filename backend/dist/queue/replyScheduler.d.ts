export declare class ReplyScheduler {
    /**
     * Schedules a task to execute after a specified delay in seconds.
     */
    static schedule<T>(delaySeconds: number, task: () => Promise<T>): Promise<T>;
    /**
     * Non-blocking asynchronous delay.
     */
    static wait(seconds: number, context?: {
        sessionId: string;
        conversationId?: string;
    }): Promise<void>;
}
