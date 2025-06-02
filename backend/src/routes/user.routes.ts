import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import Joi from 'joi';
import { auth } from '../middleware/auth.middleware.js';

const router = express.Router();

// Apply authentication middleware to all user routes
router.use(auth);

// Helper function to handle async operations with error handling
const asyncHandler = (fn: RequestHandler): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Validation middleware
const validateRequest = (schema: Joi.ObjectSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.validateAsync(req.body, { abortEarly: false });
      next();
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        errors: error.details.map((err: any) => ({
          field: err.path[0],
          message: err.message
        }))
      });
    }
  };
};

// Get all users (admin only)
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this resource'
      });
    }
    
    // Return list of users (placeholder)
    res.status(200).json({
      success: true,
      users: [
        { id: 1, name: 'User 1', email: 'user1@example.com' },
        { id: 2, name: 'User 2', email: 'user2@example.com' }
      ]
    });
  })
);

// Get current user profile
router.get(
  '/profile',
  asyncHandler(async (req: Request, res: Response) => {
    // Return the authenticated user's profile
    res.status(200).json({
      success: true,
      user: {
        id: req.user?.id,
        name: 'John Doe', // Replace with actual user data
        email: req.user?.email,
        role: req.user?.role
      }
    });
  })
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
  asyncHandler(async (req: Request, res: Response) => {
    // Update user profile logic would go here
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully'
    });
  })
);

// Delete user account
router.delete(
  '/profile',
  asyncHandler(async (req: Request, res: Response) => {
    // Delete user account logic would go here
    res.status(200).json({
      success: true,
      message: 'User account deleted successfully'
    });
  })
);

export default router;
