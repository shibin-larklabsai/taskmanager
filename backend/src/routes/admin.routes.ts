import express, { Request, Response, NextFunction, Router, RequestHandler as ExpressRequestHandler } from 'express';
import { auth } from '../middleware/auth.middleware.js';
import User from '../models/user.model.js';
import Role from '../models/role.model.js';
import Project from '../models/project.model.js';
import { Op } from 'sequelize';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        roles?: Array<{ name: string }>;
      };
    }
  }
}

const router: Router = express.Router();

// Middleware to check if user is admin
const requireAdmin: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }
  
  const isAdmin = req.user.roles?.some(role => role.name === 'admin');
  if (!isAdmin) {
    res.status(403).json({ success: false, message: 'Admin access required' });
    return;
  }
  
  next();
};

// Apply auth and admin middleware to all admin routes
router.use(auth as ExpressRequestHandler);
router.use(requireAdmin);

// Helper function to handle async operations with error handling
const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void> | void
): ExpressRequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Extend Express Request type to include user and transaction
declare module 'express' {
  interface Request {
    user?: {
      id: number;
      roles?: Array<{ name: string }>;
    };
    transaction?: any;
  }
}

// Update an existing user
router.put('/users/:id', asyncHandler(async (req: Request, res: Response) => {
  const t = await User.sequelize?.transaction();
  
  try {
    const userId = parseInt(req.params.id);
    const { name, email, password, roleIds } = req.body;

    // Find the user to update
    const user = await User.findByPk(userId, { transaction: t });
    if (!user) {
      await t?.rollback();
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // Update user fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (password) user.password = password;
    
    await user.save({ transaction: t });

    // Update roles if provided
    if (roleIds && Array.isArray(roleIds)) {
      const roleInstances = await Role.findAll({
        where: { id: { [Op.in]: roleIds } },
        transaction: t
      });
      
      await user.setRoles(roleInstances, { transaction: t });
    }

    // Commit the transaction
    await t?.commit();

    // Fetch the updated user with roles to return (outside transaction)
    const updatedUser = await User.findByPk(user.id, {
      attributes: ['id', 'name', 'email', 'createdAt', 'updatedAt'],
      include: [
        {
          model: Role,
          as: 'roles',
          attributes: ['id', 'name'],
          through: { attributes: [] },
        },
      ],
    });

    // Type assertion to handle the roles property
    const userData = updatedUser?.toJSON() as any;
    const rolesList = userData?.roles?.map((role: { name: string }) => role.name) || [];

    res.status(200).json({
      success: true,
      data: {
        ...userData,
        roles: rolesList,
      },
    });
  } catch (error) {
    console.error('Error updating user:', error);
    await t?.rollback();
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: process.env.NODE_ENV === 'development' ? error : undefined,
    });
  }
}));

// Create a new user
router.post('/users', asyncHandler(async (req: Request, res: Response) => {
  const t = await User.sequelize?.transaction();
  
  try {
    const { name, email, password, roles } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email }, transaction: t });
    if (existingUser) {
      await t?.rollback();
      res.status(400).json({ success: false, message: 'User with this email already exists' });
      return;
    }

    // Create the user
    const newUser = await User.create({
      name,
      email,
      password,
    }, { transaction: t });

    // Add roles if provided
    if (roles && Array.isArray(roles)) {
      const roleInstances = await Role.findAll({
        where: { id: { [Op.in]: roles } },
        transaction: t
      });
      
      await newUser.setRoles(roleInstances, { transaction: t });
    }

    // Commit the transaction
    await t?.commit();

    // Fetch the created user with roles to return (outside transaction)
    const createdUser = await User.findByPk(newUser.id, {
      attributes: ['id', 'name', 'email', 'createdAt', 'updatedAt'],
      include: [
        {
          model: Role,
          as: 'roles',
          attributes: ['id', 'name'],
          through: { attributes: [] },
        },
      ],
    });

    // Type assertion to handle the roles property
    const userData = createdUser?.toJSON() as any;
    const rolesList = userData?.roles?.map((role: { name: string }) => role.name) || [];

    res.status(201).json({
      success: true,
      data: {
        ...userData,
        roles: rolesList,
      },
    });
  } catch (error) {
    console.error('Error creating user:', error);
    await t?.rollback();
    res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: process.env.NODE_ENV === 'development' ? error : undefined,
    });
  }
}));

// Get all users
router.get(
  '/users',
  asyncHandler(async (_req: Request, res: Response) => {
    try {
      console.log('Fetching users with roles...');
      
      const users = await User.findAll({
        attributes: ['id', 'name', 'email', 'createdAt', 'updatedAt'],
        include: [
          {
            model: Role,
            as: 'roles',
            attributes: ['id', 'name'],
            through: { attributes: [] },
          },
        ],
      });

      // Transform the data to include role names as an array
      const formattedUsers = users.map(user => ({
        ...user.toJSON(),
        roles: user.roles?.map(role => role.name) || [],
      }));

      res.json({
        success: true,
        data: formattedUsers,
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      if (process.env.NODE_ENV === 'development') {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
        });
      }
      res.status(500).json({
        success: false,
        message: 'Failed to fetch users',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  })
);

// Get all roles
router.get(
  '/roles',
  asyncHandler(async (_req: Request, res: Response) => {
    try {
      const roles = await Role.findAll({
        attributes: ['id', 'name', 'description', 'createdAt', 'updatedAt'],
      });

      res.json({
        success: true,
        data: roles,
      });
    } catch (error) {
      console.error('Error fetching roles:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch roles',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  })
);

// Get all projects
router.get(
  '/projects',
  asyncHandler(async (_req: Request, res: Response) => {
    try {
      const projects = await Project.findAll({
        attributes: ['id', 'name', 'description', 'status', 'createdAt', 'updatedAt'],
      });

      res.json({
        success: true,
        data: projects,
      });
    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch projects',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  })
);

// Delete a user
router.delete(
  '/users/:id',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Find the user to delete
      const user = await User.findByPk(userId);
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      // Delete the user
      await user.destroy();
      
      res.json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete user',
        error: process.env.NODE_ENV === 'development' ? error : undefined,
      });
    }
  })
);

export default router;
