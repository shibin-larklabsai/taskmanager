import { Request, Response, NextFunction } from 'express';
import { register, login, logout, getCurrentUser } from '../services/auth.service';
import { IRegisterInput, ILoginInput, IUserResponse } from '../types/auth.types';
import { auth } from '../middleware/auth.middleware';

// Extend Express Request type to include our custom properties
declare global {
  namespace Express {
    interface Request {
      user?: IUserResponse;
      token?: string;
    }
  }
}

export const AuthController = {
  /**
   * Register a new user
   */
  register: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userData: IRegisterInput = req.body;
      console.log('Registering user:', userData.email);
      
      const result = await register(userData);
      
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Registration error in controller:', error);
      next(error);
    }
  },

  /**
   * Login user
   */
  login: async (req: Request, res: Response): Promise<void> => {
    try {
      const credentials: ILoginInput = req.body;
      const result = await login(credentials);
      
      res.json({
        success: true,
        data: result,
      });
      return;
    } catch (error: any) {
      res.status(401).json({
        success: false,
        message: error.message || 'Authentication failed',
      });
      return;
    }
  },

  /**
   * Logout user
   */
  logout: async (req: Request, res: Response): Promise<void> => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (token) {
        await logout(token);
      }
      
      res.json({
        success: true,
        message: 'Logged out successfully',
      });
      return;
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Logout failed',
      });
      return;
    }
  },

  /**
   * Get current user
   */
  // Middleware to check if user is authenticated
  requireAuth: (req: Request, res: Response, next: NextFunction) => {
    return auth(req, res, next);
  },

  // Middleware to check if user is admin
  requireAdmin: (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.roles || !Array.isArray(req.user.roles)) {
      res.status(403).json({
        success: false,
        message: 'Admin access required - Invalid user roles',
      });
      return;
    }

    const isAdmin = req.user.roles.some((role: any) => role && role.name === 'admin');
    if (!isAdmin) {
      res.status(403).json({
        success: false,
        message: 'Admin access required',
      });
      return;
    }
    next();
  },

  // Get current user
  getMe: [
    (req: Request, res: Response, next: NextFunction) => {
      return auth(req, res, next);
    },
    async (req: Request, res: Response): Promise<void> => {
      try {
        if (!req.user) {
          res.status(401).json({
            success: false,
            message: 'User not authenticated',
          });
          return;
        }

        const user = await getCurrentUser(req.user.id);
        if (!user) {
          res.status(404).json({
            success: false,
            message: 'User not found',
          });
          return;
        }
        if (!user) {
          res.status(404).json({
            success: false,
            message: 'User not found',
          });
          return;
        }
        
        res.json({
          success: true,
          data: user,
        });
        return;
      } catch (error: any) {
        res.status(500).json({
          success: false,
          message: error.message || 'Failed to fetch user',
        });
        return;
      }
    },
  ],

  /**
   * Protected route example
   */
  protected: [
    auth,
    (req: Request, res: Response): void => {
      res.json({
        success: true,
        message: 'You have accessed a protected route',
      });
      return;
    },
  ],

  /**
   * Admin route example
   */
  adminOnly: [
    auth,
    (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      // Check if user has admin role
      if (!req.user.roles || !req.user.roles.some((role: { name: string }) => role.name === 'admin')) {
        res.status(403).json({
          success: false,
          message: 'Admin access required',
        });
        return;
      }
      next();
      return;
    },
    (req: Request, res: Response): void => {
      res.json({
        success: true,
        message: 'Welcome admin!',
      });
      return;
    },
  ],
};
