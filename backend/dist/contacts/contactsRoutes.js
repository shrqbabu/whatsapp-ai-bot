"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_js_1 = require("../middleware/auth.js");
const tenantGuard_js_1 = require("../middleware/tenantGuard.js");
const contactsController_js_1 = require("./contactsController.js");
const router = (0, express_1.Router)();
router.use(auth_js_1.authMiddleware, tenantGuard_js_1.tenantGuard);
router.get('/', contactsController_js_1.ContactsController.listContacts);
router.put('/:id/rules', contactsController_js_1.ContactsController.updateContactRules);
router.get('/groups/:jid/rules', contactsController_js_1.ContactsController.getGroupRule);
router.put('/groups/:jid/rules', contactsController_js_1.ContactsController.updateGroupRule);
exports.default = router;
//# sourceMappingURL=contactsRoutes.js.map