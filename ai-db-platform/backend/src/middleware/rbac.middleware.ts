import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'ORG_ADMIN' | 'LEAD_ARCHITECT' | 'MEMBER' | 'JUNIOR_DEV' | 'VIEWER' | 'SECURITY_AUDITOR';

const ROLE_HIERARCHY: Record<string, number> = {
  VIEWER: 1,
  JUNIOR_DEV: 2,
  MEMBER: 2,
  SECURITY_AUDITOR: 2,
  LEAD_ARCHITECT: 3,
  ORG_ADMIN: 4,
  ADMIN: 4,
  SUPER_ADMIN: 5,
};

/**
 * Require an exact specific role or one of multiple allowed roles
 */
export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(401, 'Unauthorized. Please login to continue.'));
    }

    const userRole = req.user.role || 'VIEWER';

    if (userRole === 'SUPER_ADMIN') {
      return next();
    }

    if (!allowedRoles.includes(userRole)) {
      return next(
        new ApiError(
          403,
          `Forbidden: Role '${userRole}' does not have permission for this action.`
        )
      );
    }

    next();
  };
};

/**
 * Require at least a minimum role level in the hierarchy
 */
export const requireMinRole = (minRole: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(401, 'Unauthorized. Please login to continue.'));
    }

    const userRole = req.user.role || 'VIEWER';
    const userLevel = ROLE_HIERARCHY[userRole] || 1;
    const minLevel = ROLE_HIERARCHY[minRole] || 1;

    if (userLevel < minLevel) {
      return next(
        new ApiError(
          403,
          `Forbidden: Role '${userRole}' is below minimum required role '${minRole}'.`
        )
      );
    }

    next();
  };
};

export const requirePermission = (allowedRoles: UserRole[]) => requireRole(...allowedRoles);

