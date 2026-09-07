import { BusinessHoursRepository } from '../database/repositories/businessHoursRepository.js';
export class RulesEngine {
    /**
     * Complete decision pipeline:
     * 1. Safety & Loop Prevention
     * 2. Message Type / text check
     * 3. Global AI enabled
     * 4. Contact rules (blocked, AI enabled)
     * 5. Group rules (groups_enabled, mention required)
     * 6. Business hours
     * 7. Manual takeover
     */
    static async evaluate(params) {
        const { isFromMe, text, isGroup, contact, conversation, aiSettings, sessionId } = params;
        // 1. Safety & Loop Prevention: Never reply to own messages
        if (isFromMe) {
            return { shouldReply: false, reason: 'Message originated from own account' };
        }
        // 2. Ignore non-text or empty messages
        if (!text || text.trim().length === 0) {
            return { shouldReply: false, reason: 'Empty or non-text message' };
        }
        // 3. Check Global AI Status
        if (!aiSettings.enabled) {
            return { shouldReply: false, reason: 'AI auto-reply is disabled globally' };
        }
        // 4. Check Contact Rules
        if (contact) {
            if (contact.blocked) {
                return { shouldReply: false, reason: 'Contact is blocked' };
            }
            if (!contact.ai_enabled) {
                return { shouldReply: false, reason: 'AI auto-reply is disabled for this contact' };
            }
        }
        // 5. Check Group Settings
        if (isGroup) {
            if (!aiSettings.groups_enabled) {
                return { shouldReply: false, reason: 'Group AI auto-reply is disabled' };
            }
        }
        // 6. Check Business Hours
        if (aiSettings.business_hours_enabled) {
            const bh = await BusinessHoursRepository.checkBusinessHours(sessionId);
            if (!bh.isInside) {
                if (bh.outsideAction === 'SEND_CUSTOM_MESSAGE' && bh.outsideMessage) {
                    return {
                        shouldReply: true,
                        reason: 'Outside business hours - sending configured custom message',
                        outsideHoursMessage: bh.outsideMessage,
                    };
                }
                return { shouldReply: false, reason: 'Outside business hours' };
            }
        }
        // 7. Check Manual Takeover
        if (conversation.takeover_active) {
            if (conversation.takeover_until) {
                const until = new Date(conversation.takeover_until).getTime();
                const now = Date.now();
                if (now <= until) {
                    return { shouldReply: false, reason: 'Manual takeover active' };
                }
            }
            else {
                return { shouldReply: false, reason: 'Manual takeover active indefinitely' };
            }
        }
        return { shouldReply: true };
    }
}
//# sourceMappingURL=rulesEngine.js.map