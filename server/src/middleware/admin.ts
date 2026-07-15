import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { hasPermission, hasAnyPermission, isRoleAtLeast, Permission, Role } from '../config/permissions';

export const requireAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.userRole !== 'ADMIN') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  next();
};

export const requireRole = (minRole: Role) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.userRole || !isRoleAtLeast(req.userRole, minRole)) {
      return res.status(403).json({
        success: false,
        error: `This action requires ${minRole} role or higher`,
      });
    }
    next();
  };
};

export const requirePermission = (permission: Permission) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.userRole || !hasPermission(req.userRole, permission)) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to perform this action',
      });
    }
    next();
  };
};

export const requireAnyPermission = (permissions: Permission[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.userRole || !hasAnyPermission(req.userRole, permissions)) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to perform this action',
      });
    }
    next();
  };
};
