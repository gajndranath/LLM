import { Request, Response, NextFunction } from 'express';
import { UserRole } from './auth.middleware';

// Role hierarchy — higher index = more permissions
const ROLE_HIERARCHY: UserRole[] = [
  'VIEWER',
  'DRIVER',
  'ANALYST',
  'DISPATCHER',
  'ADMIN',
  'SUPER_ADMIN',
];

// Require one of specific roles (exact match)
export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = req.user?.role;

    if (!userRole) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (!roles.includes(userRole)) {
      res.status(403).json({
        error: 'Insufficient permissions',
        required: roles,
        current: userRole,
      });
      return;
    }

    next();
  };
};

// Check if user has at least a minimum role level
export const requireMinRole = (minRole: UserRole) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = req.user?.role;

    if (!userRole) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const userLevel = ROLE_HIERARCHY.indexOf(userRole);
    const requiredLevel = ROLE_HIERARCHY.indexOf(minRole);

    if (userLevel < requiredLevel) {
      res.status(403).json({
        error: 'Insufficient permissions',
        required: minRole,
        current: userRole,
      });
      return;
    }

    next();
  };
};

// Shorthand: only SUPER_ADMIN can access
export const requireSuperAdmin = requireRole('SUPER_ADMIN');

