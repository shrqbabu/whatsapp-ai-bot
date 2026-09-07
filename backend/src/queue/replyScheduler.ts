import { logEvent } from '../utils/logger.js';

export class ReplyScheduler {
  /**
   * Schedules a task to execute after a specified delay in seconds.
   */
  static schedule<T>(delaySeconds: number, task: () => Promise<T>): Promise<T> {
    if (delaySeconds <= 0) {
      return task();
    }

    return new Promise<T>((resolve, reject) => {
      setTimeout(async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, delaySeconds * 1000);
    });
  }

  /**
   * Non-blocking asynchronous delay.
   */
  static async wait(seconds: number, context?: { sessionId: string; conversationId?: string }): Promise<void> {
    if (seconds <= 0) return;

    if (context) {
      logEvent(
        { sessionId: context.sessionId, conversationId: context.conversationId, event: 'REPLY_DELAY_WAIT' },
        `Waiting ${seconds}s before sending reply`
      );
    }

    return new Promise((resolve) => {
      setTimeout(resolve, seconds * 1000);
    });
  }
}
