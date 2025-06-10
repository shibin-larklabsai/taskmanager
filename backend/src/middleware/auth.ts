import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model.js';
import { AppError } from '../utils/errorHandler.js';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number | string;
        roles?: { name: string }[];
      };
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      throw new AppError('No token, authorization denied', 401);
    }

    // Verify token
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    
    // Get user from the token
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] },
      include: ['roles']
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Add user to request object
    req.user = {
      id: user.id,
      roles: user.roles
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AppError('Invalid token', 401));
    }
    if (error instanceof jwt.TokenExpiredError) {
      return next(new AppError('Token expired', 401));
    }
    next(error);
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }

    const userRoles = req.user.roles?.map(role => role.name) || [];
    const hasRequiredRole = roles.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      return next(
        new AppError('Not authorized to access this route', 403)
      );
    }

    next();
  };
};
