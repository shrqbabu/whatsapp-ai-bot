export interface AISettingsEntity {
    id: string;
    session_id: string;
    user_id: string;
    enabled: boolean;
    system_prompt: string;
    model: string;
    api_base_url: string | null;
    api_key: string | null;
    reply_delay: number;
    debounce_delay: number;
    groups_enabled: boolean;
    reply_only_when_mentioned: boolean;
    business_hours_enabled: boolean;
    created_at: string;
    updated_at: string;
}
export declare class AISettingsRepository {
    static findBySessionId(sessionId: string): Promise<AISettingsEntity | null>;
    static findByUserId(userId: string): Promise<AISettingsEntity | null>;
    static update(sessionId: string, data: Partial<{
        enabled: boolean;
        system_prompt: string;
        model: string;
        api_base_url: string | null;
        api_key: string | null;
        reply_delay: number;
        debounce_delay: number;
        groups_enabled: boolean;
        reply_only_when_mentioned: boolean;
        business_hours_enabled: boolean;
    }>): Promise<AISettingsEntity>;
    private static mapEntity;
}
