import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { redis } from '../config/redis';
import User from '../models/user.model';
import Role from '../models/role.model';
import { IUserResponse, IUserRoleResponse } from '../types/auth.types';

// Extend the Express Request type to include our custom properties
declare global {
  namespace Express {
    interface Request {
      user?: IUserResponse;
      token?: string;
    }
  }
}

/**
 * Authentication middleware to verify JWT token and attach user to request
 */
// Alias for auth for backward compatibility
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  return auth(req, res, next);
};

export const auth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from header
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'No token provided, authorization denied' 
      });
    }

    // Check if token is blacklisted
    const isBlacklisted = await redis.get(`blacklist_${token}`);
    if (isBlacklisted) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token has been blacklisted' 
      });
    }

    // Verify token
    const decoded = await verifyToken(token);
    
    // Get user from database with roles
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Role,
          as: 'roles',
          through: { attributes: [] },
          attributes: ['id', 'name', 'description'],
        },
      ],
    });

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Convert to plain object and exclude sensitive data
    const userData = user.get({ plain: true }) as any;
    
    // Extract roles with proper typing
    const roles: IUserRoleResponse[] = (userData.roles || []).map((role: any) => ({
      id: role.id,
      name: role.name,
      description: role.description || null
    }));

    // Create user object with required fields
    const userResponse = {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      roles,
      createdAt: userData.createdAt || new Date(),
      updatedAt: userData.updatedAt || new Date(),
      deletedAt: userData.deletedAt || null
    };

    // Attach user and token to the request object
    req.user = userResponse;
    req.token = token;
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ 
      success: false, 
      message: 'Token is not valid' 
    });
  }
};

// Type guard to check if request has user property
const hasUser = (req: Request): req is Request & { user: IUserResponse } => {
  return (req as Request & { user: IUserResponse }).user !== undefined;
};

/**
 * Role-based access control middleware
 * @param roles Array of role names that are allowed to access the route
 */
export const authorize = (...roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!hasUser(req)) {
        return res.status(401).json({ 
          success: false, 
          message: 'User not authenticated' 
        });
      }

      // Check if user has required role
      if (roles && roles.length > 0) {
        const userRoles = req.user.roles || [];
        const hasRole = userRoles.some((role: { name: string }) => roles.includes(role.name));
        if (!hasRole) {
          return res.status(403).json({
            success: false,
            message: 'Insufficient permissions',
          });
        }
      }

      next();
    } catch (error) {
      console.error('Authorization error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Error authorizing user' 
      });
    }
  };
};
