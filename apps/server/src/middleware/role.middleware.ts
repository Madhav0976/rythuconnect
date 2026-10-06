import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@rythuconnect/types';

/**
 * Middleware factory enforcing role-based access control (RBAC).
 * Must be mounted after requireAuth middleware.
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return function (req: Request, res: Response, next: NextFunction): void {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required prior to role verification.',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Forbidden: Access requires one of the following roles: [${allowedRoles.join(', ')}].`,
      });
      return;
    }

    next();
  };
}
