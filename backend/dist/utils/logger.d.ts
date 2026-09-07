import pino from 'pino';
export declare const logger: pino.Logger<never, boolean>;
export interface LogContext {
    userId?: string;
    sessionId?: string;
    conversationId?: string;
    waMessageId?: string;
    event: string;
    [key: string]: unknown;
}
export declare function logEvent(context: LogContext, message: string): void;
export declare function logError(context: LogContext, err: unknown, message: string): void;
