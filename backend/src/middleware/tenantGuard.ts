import { NextFunction, Request, Response } from 'express';
import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';

export function tenantGuard(req: Request, res: Response, next: NextFunction) {
  if (!req.user || !req.user.userId) {
    return next(new UnauthorizedError('User authentication required'));
  }

  // Prevent clients from overriding user_id in body or query
  if (req.body && req.body.userId && req.body.userId !== req.user.userId) {
    return next(new ForbiddenError('Tenant isolation violation: cannot act on behalf of another user'));
  }

  if (req.query && req.query.userId && req.query.userId !== req.user.userId) {
    return next(new ForbiddenError('Tenant isolation violation: cannot query data belonging to another user'));
  }

  next();
}
