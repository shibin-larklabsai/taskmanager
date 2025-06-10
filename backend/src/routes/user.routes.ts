import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import Joi from 'joi';
import { auth, authorize } from '../middleware/auth.middleware.js';
import User from '../models/user.model.js';
import Role from '../models/role.model.js';
import { UserController } from '../controllers/user.controller.js';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        roles?: Array<{ name: string }>;
      };
      userId?: number;
    }
  }
}

const router = express.Router();

// Apply authentication middleware to all user routes
router.use(auth);

// Get projects for the current user
router.get('/me/projects', (req: Request, res: Response) => {
  // Set the userId in params to the authenticated user's ID
  req.params.userId = req.user?.id?.toString();
  
  const handler = UserController as any;
  if (handler.getUserProjects) {
    return handler.getUserProjects(req, res);
  }
  return res.status(500).json({
    success: false,
    message: 'Handler not found'
  });
});

// Get projects for a specific user
router.get('/:userId/projects', (req: Request, res: Response) => {
  const handler = UserController as any;
  if (handler.getUserProjects) {
    return handler.getUserProjects(req, res);
  }
  return res.status(500).json({
    success: false,
    message: 'Handler not found'
  });
});

// Validation middleware
const validateRequest = (schema: Joi.ObjectSchema): RequestHandler => {
  return (req, res, next) => {
    schema.validateAsync(req.body, { abortEarly: false })
      .then(() => next())
      .catch((error: Joi.ValidationError) => {
        res.status(400).json({
          success: false,
          errors: error.details.map((err) => ({
            field: String(err.path[0]),
            message: err.message
          }))
        });
      });
  };
};



// Get all users (admin or project manager)
router.get(
  '/',
  authorize('admin', 'project_manager'),
  (async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get users from database
      const users = await User.findAll({
        attributes: ['id', 'name', 'email', 'createdAt'],
        include: [{
          model: Role,
          attributes: ['name'],
          through: { attributes: [] },
          as: 'roles'
        }],
        order: [['createdAt', 'DESC']]
      });
      
      // Format the response
      const formattedUsers = users.map(user => {
        const userJson = user.toJSON() as any;
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          roles: userJson.roles?.map((role: any) => role.name) || [],
          createdAt: user.createdAt
        };
      });
      
      res.status(200).json({
        success: true,
        users: formattedUsers
      });
      return Promise.resolve();
    } catch (error) {
      console.error('Error fetching users:', error);
      next(error);
      return Promise.reject(error);
    }
  }) as RequestHandler
);

// Get current user profile
router.get(
  '/profile',
  (async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated'
        });
        return Promise.resolve();
      }

      // Get fresh user data with roles
      const user = await User.findByPk(req.user.id, {
        attributes: ['id', 'name', 'email', 'createdAt'],
        include: [{
          model: Role,
          attributes: ['name'],
          through: { attributes: [] },
          as: 'roles'
        }]
      });

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return Promise.resolve();
      }

      const userJson = user.toJSON() as any;
      
      res.status(200).json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          roles: userJson.roles?.map((role: any) => role.name) || [],
          createdAt: user.createdAt
        }
      });
      return Promise.resolve();
    } catch (error) {
      console.error('Error fetching user profile:', error);
      next(error);
      return Promise.reject(error);
    }
  }) as RequestHandler
);

// Update user profile
router.put(
  '/profile',
  validateRequest(Joi.object({
    name: Joi.string().optional(),
    email: Joi.string().email().optional(),
    currentPassword: Joi.string().optional(),
    newPassword: Joi.string().min(6).optional()
  })),
  (async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Update user profile logic would go here
      res.status(200).json({
        success: true,
        message: 'Profile updated successfully'
      });
      return Promise.resolve();
    } catch (error) {
      next(error);
      return Promise.reject(error);
    }
  }) as RequestHandler
);

// Delete user account
router.delete(
  '/profile',
  (async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Delete user account logic would go here
      res.status(200).json({
        success: true,
        message: 'User account deleted successfully'
      });
      return Promise.resolve();
    } catch (error) {
      next(error);
      return Promise.reject(error);
    }
  }) as RequestHandler
);

export default router;
