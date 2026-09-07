export interface ContactEntity {
    id: string;
    session_id: string;
    user_id: string;
    wa_jid: string;
    display_name: string | null;
    phone_number: string | null;
    ai_enabled: boolean;
    blocked: boolean;
    created_at: string;
    updated_at: string;
}
export interface GroupRuleEntity {
    id: string;
    session_id: string;
    user_id: string;
    group_jid: string;
    ai_enabled: boolean;
    reply_only_when_mentioned: boolean;
    created_at: string;
    updated_at: string;
}
export declare class ContactsRepository {
    static listContacts(sessionId: string): Promise<ContactEntity[]>;
    static listByUserId(userId: string): Promise<ContactEntity[]>;
    static findByJid(sessionId: string, waJid: string): Promise<ContactEntity | null>;
    static findBySessionAndJid(sessionId: string, waJid: string): Promise<ContactEntity | null>;
    static findById(id: string): Promise<ContactEntity | null>;
    static upsertContact(params: {
        sessionId: string;
        userId: string;
        waJid: string;
        displayName?: string | null;
        phoneNumber?: string | null;
    }): Promise<ContactEntity>;
    static updateContactRules(contactId: string, sessionId: string, userId: string, rules: {
        ai_enabled?: boolean;
        blocked?: boolean;
    }): Promise<ContactEntity>;
    static updateRule(userId: string, contactId: string, rules: {
        ai_enabled?: boolean;
        blocked?: boolean;
    }): Promise<ContactEntity>;
    static getGroupRule(sessionId: string, groupJid: string): Promise<GroupRuleEntity | null>;
    static upsertGroupRule(sessionId: string, userId: string, groupJid: string, rules: {
        ai_enabled?: boolean;
        reply_only_when_mentioned?: boolean;
    }): Promise<GroupRuleEntity>;
    static setGroupRule(userId: string, sessionId: string, groupJid: string, rules: {
        ai_enabled?: boolean;
        reply_only_when_mentioned?: boolean;
    }): Promise<GroupRuleEntity>;
    private static mapContact;
}
