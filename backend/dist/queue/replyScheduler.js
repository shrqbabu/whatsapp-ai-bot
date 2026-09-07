"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReplyScheduler = void 0;
const logger_js_1 = require("../utils/logger.js");
class ReplyScheduler {
    /**
     * Schedules a task to execute after a specified delay in seconds.
     */
    static schedule(delaySeconds, task) {
        if (delaySeconds <= 0) {
            return task();
        }
        return new Promise((resolve, reject) => {
            setTimeout(async () => {
                try {
                    const result = await task();
                    resolve(result);
                }
                catch (error) {
                    reject(error);
                }
            }, delaySeconds * 1000);
        });
    }
    /**
     * Non-blocking asynchronous delay.
     */
    static async wait(seconds, context) {
        if (seconds <= 0)
            return;
        if (context) {
            (0, logger_js_1.logEvent)({ sessionId: context.sessionId, conversationId: context.conversationId, event: 'REPLY_DELAY_WAIT' }, `Waiting ${seconds}s before sending reply`);
        }
        return new Promise((resolve) => {
            setTimeout(resolve, seconds * 1000);
        });
    }
}
exports.ReplyScheduler = ReplyScheduler;
//# sourceMappingURL=replyScheduler.js.map