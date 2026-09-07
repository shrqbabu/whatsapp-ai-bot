import { z } from 'zod';
import { ContactsRepository } from '../database/repositories/contactsRepository.js';
import { SessionRepository } from '../database/repositories/sessionRepository.js';
export const updateContactRulesSchema = z.object({
    ai_enabled: z.boolean().optional(),
    blocked: z.boolean().optional(),
});
export const updateGroupRulesSchema = z.object({
    ai_enabled: z.boolean().optional(),
    reply_only_when_mentioned: z.boolean().optional(),
});
export class ContactsController {
    static async listContacts(req, res, next) {
        try {
            const userId = req.user.userId;
            const contacts = await ContactsRepository.listByUserId(userId);
            res.status(200).json({
                success: true,
                data: contacts,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async updateContactRules(req, res, next) {
        try {
            const userId = req.user.userId;
            const contactId = req.params.id;
            const data = updateContactRulesSchema.parse(req.body);
            const updated = await ContactsRepository.updateRule(userId, contactId, data);
            res.status(200).json({
                success: true,
                data: updated,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async getGroupRule(req, res, next) {
        try {
            const userId = req.user.userId;
            const groupJid = req.params.jid;
            const session = await SessionRepository.getOrCreateByUserId(userId);
            const rule = await ContactsRepository.getGroupRule(session.id, groupJid);
            res.status(200).json({
                success: true,
                data: rule || {
                    session_id: session.id,
                    user_id: userId,
                    group_jid: groupJid,
                    ai_enabled: false,
                    reply_only_when_mentioned: true,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async updateGroupRule(req, res, next) {
        try {
            const userId = req.user.userId;
            const groupJid = req.params.jid;
            const session = await SessionRepository.getOrCreateByUserId(userId);
            const data = updateGroupRulesSchema.parse(req.body);
            const rule = await ContactsRepository.setGroupRule(userId, session.id, groupJid, data);
            res.status(200).json({
                success: true,
                data: rule,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
//# sourceMappingURL=contactsController.js.map