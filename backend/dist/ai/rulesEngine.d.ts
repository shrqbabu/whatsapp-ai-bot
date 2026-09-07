import { AISettingsEntity } from '../database/repositories/aiSettingsRepository.js';
import { ContactEntity } from '../database/repositories/contactsRepository.js';
import { ConversationEntity } from '../database/repositories/conversationsRepository.js';
export interface RuleEvaluationResult {
    shouldReply: boolean;
    reason?: string;
    outsideHoursMessage?: string | null;
}
export declare class RulesEngine {
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
    static evaluate(params: {
        sessionId: string;
        isFromMe: boolean;
        text: string | null;
        isGroup: boolean;
        contact: ContactEntity | null;
        conversation: ConversationEntity;
        aiSettings: AISettingsEntity;
    }): Promise<RuleEvaluationResult>;
}
