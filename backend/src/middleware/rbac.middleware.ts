import { Request, Response, NextFunction, RequestHandler } from 'express';
import { verifyToken } from '../utils/jwt';
import { redis } from '../config/redis';
import { IUserRoleResponse, IUserResponse } from '../types/auth.types';

// Extend the Express Request type to include our custom user property
declare global {
  namespace Express {
    interface Request {
      user?: IUserResponse;
    }
  }
}

type Role = 'admin' | 'project_manager' | 'user' | string;

// Custom request handler type that properly handles async/await
type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

/**
 * RBAC middleware to check if user has required role
 * @param {Role[]} allowedRoles - Array of roles that are allowed to access the route
 * @returns {Function} Express middleware function
 */
export const checkRole = (allowedRoles: Role[]) => {
  return async (req: any, res: Response, next: NextFunction) => {
    try {
      // Get token from header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
          success: false, 
          message: 'No token provided' 
        });
      }

      const token = authHeader.split(' ')[1];
      if (!token) {
        return res.status(401).json({ 
          success: false, 
          message: 'No token provided' 
        });
      }

      // Verify token
      const decoded = await verifyToken(token);
      
      // Check if token is blacklisted
      const isBlacklisted = await redis.get(`blacklist:${token}`);
      if (isBlacklisted) {
        return res.status(401).json({ 
          success: false, 
          message: 'Token has been revoked' 
        });
      }

      // Get user roles from token or database
      // In a real app, you might want to get fresh roles from the database
      const userRoles = (req.user?.roles || []) as IUserRoleResponse[];
      
      // Check if user has any of the allowed roles
      const hasPermission = userRoles.some(role => 
        allowedRoles.includes(role.name.toLowerCase())
      );

      if (!hasPermission) {
        return res.status(403).json({ 
          success: false, 
          message: 'Insufficient permissions' 
        });
      }

      // User has permission, proceed to the next middleware
      next();
    } catch (error) {
      console.error('RBAC Middleware Error:', error);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid or expired token' 
      });
    }
  };
};

/**
 * Middleware to check if user has any of the required permissions
 * @param {string[]} requiredPermissions - Array of permission names
 * @returns {Function} Express middleware function
 */
export const checkPermission = (requiredPermissions: string[]) => {
  return async (req: any, res: Response, next: NextFunction) => {
    try {
      const userRoles = (req.user?.roles || []) as IUserRoleResponse[];
      
      // In a real app, you would check permissions from the database
      // This is a simplified example
      const userPermissions = new Set<string>();
      
      // Add role-based permissions
      userRoles.forEach(role => {
        // In a real app, you would fetch permissions for each role from the database
        // This is a simplified example
        if (role.name === 'admin') {
          userPermissions.add('*'); // Admin has all permissions
        } else if (role.name === 'project_manager') {
          userPermissions.add('project:create');
          userPermissions.add('project:read');
          userPermissions.add('project:update');
          userPermissions.add('task:create');
          userPermissions.add('task:read');
          userPermissions.add('task:update');
        } else if (role.name === 'user') {
          userPermissions.add('task:read');
          userPermissions.add('task:create:own');
          userPermissions.add('task:update:own');
        }
      });

      // Check if user has all required permissions
      const hasAllPermissions = requiredPermissions.every(permission => 
        userPermissions.has(permission) || userPermissions.has('*')
      );

      if (!hasAllPermissions) {
        return res.status(403).json({ 
          success: false, 
          message: 'Insufficient permissions' 
        });
      }

      next();
    } catch (error) {
      console.error('Permission Middleware Error:', error);
      next(error);
    }
  };
};

// Helper function to wrap async handlers with proper error handling
const asyncHandler = (fn: AsyncRequestHandler): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    return Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Middleware to check if user has required role(s)
 * @param roles - Single role or array of role names
 */
export const authorize = (roles: string | string[]): RequestHandler => {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      // If no roles specified, allow access to any authenticated user
      if (!roles || (Array.isArray(roles) && roles.length === 0)) {
        next();
        return;
      }

      // Convert single role to array for consistent handling
      const requiredRoles = Array.isArray(roles) ? roles : [roles];
      
      // Get user from request (set by auth middleware)
      const user = req.user;
      
      if (!user || !user.roles) {
        res.status(403).json({
          success: false,
          message: 'Access denied. No user roles found.'
        });
        return;
      }

      // Check if user has any of the required roles
      const hasRole = user.roles.some((userRole: IUserRoleResponse) => 
        requiredRoles.some((role: string) => 
          role.toLowerCase() === userRole.name.toLowerCase()
        )
      );

      if (!hasRole) {
        res.status(403).json({
          success: false,
          message: `Access denied. Required role(s): ${requiredRoles.join(', ')}`
        });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  }) as RequestHandler;
};

/**
 * Middleware to check if user has specific permission
 * @param permission - Permission name to check
 */
export const hasPermission = (permission: string): RequestHandler => {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      
      if (!user || !user.roles) {
        res.status(403).json({
          success: false,
          message: 'Access denied. No user roles found.'
        });
        return;
      }
      
      // In a real implementation, you would check permissions from the user's roles
      // For now, we'll just check if the user has the admin role
      const hasRequiredPermission = user.roles.some((role: IUserRoleResponse) => 
        role.name.toLowerCase() === 'admin' || 
        role.name.toLowerCase() === 'superadmin'
      );

      if (!hasRequiredPermission) {
        res.status(403).json({
          success: false,
          message: `Access denied. Required permission: ${permission}`
        });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  }) as RequestHandler;
};
