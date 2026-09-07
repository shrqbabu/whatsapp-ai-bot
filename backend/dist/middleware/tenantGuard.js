"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantGuard = tenantGuard;
const errors_js_1 = require("../utils/errors.js");
function tenantGuard(req, res, next) {
    if (!req.user || !req.user.userId) {
        return next(new errors_js_1.UnauthorizedError('User authentication required'));
    }
    // Prevent clients from overriding user_id in body or query
    if (req.body && req.body.userId && req.body.userId !== req.user.userId) {
        return next(new errors_js_1.ForbiddenError('Tenant isolation violation: cannot act on behalf of another user'));
    }
    if (req.query && req.query.userId && req.query.userId !== req.user.userId) {
        return next(new errors_js_1.ForbiddenError('Tenant isolation violation: cannot query data belonging to another user'));
    }
    next();
}
//# sourceMappingURL=tenantGuard.js.map