"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactsController = exports.updateGroupRulesSchema = exports.updateContactRulesSchema = void 0;
const zod_1 = require("zod");
const contactsRepository_js_1 = require("../database/repositories/contactsRepository.js");
const sessionRepository_js_1 = require("../database/repositories/sessionRepository.js");
exports.updateContactRulesSchema = zod_1.z.object({
    ai_enabled: zod_1.z.boolean().optional(),
    blocked: zod_1.z.boolean().optional(),
});
exports.updateGroupRulesSchema = zod_1.z.object({
    ai_enabled: zod_1.z.boolean().optional(),
    reply_only_when_mentioned: zod_1.z.boolean().optional(),
});
class ContactsController {
    static async listContacts(req, res, next) {
        try {
            const userId = req.user.userId;
            const contacts = await contactsRepository_js_1.ContactsRepository.listByUserId(userId);
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
            const data = exports.updateContactRulesSchema.parse(req.body);
            const updated = await contactsRepository_js_1.ContactsRepository.updateRule(userId, contactId, data);
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
            const session = await sessionRepository_js_1.SessionRepository.getOrCreateByUserId(userId);
            const rule = await contactsRepository_js_1.ContactsRepository.getGroupRule(session.id, groupJid);
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
            const session = await sessionRepository_js_1.SessionRepository.getOrCreateByUserId(userId);
            const data = exports.updateGroupRulesSchema.parse(req.body);
            const rule = await contactsRepository_js_1.ContactsRepository.setGroupRule(userId, session.id, groupJid, data);
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
exports.ContactsController = ContactsController;
//# sourceMappingURL=contactsController.js.map