import { logEvent } from '../utils/logger.js';
export class MessageDebouncer {
    // Map of conversationId -> active debounce job
    static activeJobs = new Map();
    /**
     * Debounce incoming message. If another message arrives for the same conversation
     * within `debounceSeconds`, it accumulates the text and resets the timer.
     */
    static enqueue(params) {
        const { sessionId, userId, conversationId, chatJid, senderJid, text, debounceSeconds, onExecute } = params;
        const existingJob = this.activeJobs.get(conversationId);
        if (existingJob) {
            // Clear existing timer and append message
            clearTimeout(existingJob.timer);
            existingJob.messages.push(text);
            logEvent({ sessionId, conversationId, event: 'DEBOUNCE_APPENDED' }, `Debounce: Appended message (${existingJob.messages.length} messages buffered)`);
            existingJob.timer = setTimeout(async () => {
                this.activeJobs.delete(conversationId);
                const combined = existingJob.messages.join('\n');
                await onExecute(combined);
            }, debounceSeconds * 1000);
        }
        else {
            const messages = [text];
            const timer = setTimeout(async () => {
                this.activeJobs.delete(conversationId);
                const combined = messages.join('\n');
                await onExecute(combined);
            }, Math.max(1, debounceSeconds) * 1000);
            this.activeJobs.set(conversationId, {
                sessionId,
                userId,
                conversationId,
                chatJid,
                senderJid,
                messages,
                timer,
            });
            logEvent({ sessionId, conversationId, event: 'DEBOUNCE_STARTED' }, `Debounce: Started timer for ${debounceSeconds}s`);
        }
    }
    static cancel(conversationId) {
        const job = this.activeJobs.get(conversationId);
        if (job) {
            clearTimeout(job.timer);
            this.activeJobs.delete(conversationId);
        }
    }
}
export class ReplyScheduler {
    /**
     * Asynchronously delays execution by `delaySeconds` without blocking the event loop.
     */
    static async schedule(delaySeconds) {
        if (delaySeconds <= 0)
            return;
        return new Promise((resolve) => setTimeout(resolve, delaySeconds * 1000));
    }
}
//# sourceMappingURL=messageDebouncer.js.map