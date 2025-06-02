import { Request, Response, RequestHandler, Response as ExpressResponse } from 'express';
import { validationResult, ValidationError as ExpressValidationError } from 'express-validator';
import User from '../models/user.model';
import Role from '../models/role.model';
import { IUserResponse } from '../types/auth.types';

// Extend the Express Response type to include our custom methods
declare global {
  namespace Express {
    interface Response {
      success: (data?: any, statusCode?: number) => ExpressResponse;
      error: (message: string, statusCode?: number, errors?: any) => ExpressResponse;
    }
  }
}

// Use the ValidationError type from express-validator
type ValidationError = ExpressValidationError;

// Extend the User model to include role methods
type IUserWithRoles = User & {
  addRole: (role: Role) => Promise<void>;
  removeRole: (role: Role) => Promise<void>;
  hasRole: (role: Role | string) => Promise<boolean>;
  getRoles: () => Promise<Role[]>;
};

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: IUserResponse;
      userId?: number;
      roles?: string[];
    }
  }
}

// Response handler middleware
export const responseHandler: RequestHandler = (_req, res, next) => {
  res.success = function(data: any = null, statusCode: number = 200) {
    return res.status(statusCode).json({
      success: true,
      data
    });
  };

  res.error = function(message: string, statusCode: number = 400, errors: any = null) {
    return res.status(statusCode).json({
      success: false,
      message,
      errors
    });
  };
  
  next();
};



// Interface for user request with user property
interface IRequestWithUser extends Request {
  user?: IUserResponse;
  userId?: number;
  roles?: string[];
  params: {
    id?: string;
    userId?: string;
    roleId?: string;
  };
  body: any;
}

// Helper function to safely parse user ID
const parseUserId = (id: string | undefined): number | null => {
  if (!id) return null;
  const parsedId = parseInt(id, 10);
  return isNaN(parsedId) ? null : parsedId;
};

// Helper function to check if user has admin role
const isAdmin = (req: IRequestWithUser): boolean => {
  return Array.isArray(req.roles) && req.roles.includes('admin');
};

// Helper function to check if user is self or admin
const isSelfOrAdmin = (req: IRequestWithUser, userId: number): boolean => {
  return (typeof req.userId === 'number' && req.userId === userId) || isAdmin(req);
};

// Export the user controller
export const UserController = {
  // Get all users (Admin only)
  getUsers: async (req: IRequestWithUser, res: Response): Promise<Response> => {
    // Check if user is admin
    if (!isAdmin(req)) {
      return res.error('Not authorized', 403);
    }

    try {
      const users = await User.findAll({
        attributes: { exclude: ['password'] },
        include: [{
          model: Role,
          as: 'roles',
          through: { attributes: [] }, // This excludes the join table attributes
          attributes: ['id', 'name', 'code']
        }],
        // Explicitly order by user ID or any other field
        order: [['id', 'ASC']]
      });
      
      // Format the response to ensure roles are included
      const formattedUsers = users.map((user: any) => {
        const userJson = user.get({ plain: true });
        return {
          ...userJson,
          roles: userJson.roles || [] // Ensure roles is always an array
        };
      });
      
      return res.success(formattedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      return res.error('Error fetching users', 500);
    }
  },

  // Get user by ID (Admin or self)
  getUserById: async (req: IRequestWithUser, res: Response): Promise<Response> => {
    const userId = parseUserId(req.params.id);
    
    if (!userId) {
      return res.error('Invalid user ID', 400);
    }

    // Check if user is authenticated
    if (!req.user || !req.userId) {
      return res.error('Unauthorized', 401);
    }

    // Check if user is admin or requesting their own data
    if (!isSelfOrAdmin(req, userId)) {
      return res.error('Forbidden', 403);
    }

    try {
      const user = await User.findByPk(userId, {
        include: [
          {
            model: Role,
            as: 'roles',
            through: { attributes: [] },
            attributes: ['id', 'name']
          }
        ]
      });

      if (!user) {
        return res.error('User not found', 404);
      }

      return res.success(user);
    } catch (error) {
      console.error('Error getting user:', error);
      return res.error('Server error', 500);
    }
  },

  // Create new user (Admin only)
  createUser: async (req: IRequestWithUser, res: Response): Promise<Response> => {
    const transaction = await User.sequelize?.transaction();
    
    try {
      const isAdmin = req.user?.roles?.some(role => role.name === 'admin');
      if (!isAdmin) {
        if (transaction) await transaction.rollback();
        return res.status(403).json({ success: false, message: 'Not authorized to create users' });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        if (transaction) await transaction.rollback();
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { email, password, name, roleIds } = req.body;
      
      // Check if user already exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        if (transaction) await transaction.rollback();
        return res.status(400).json({ success: false, message: 'Email already in use' });
      }

      // Create user within transaction
      const user = await User.create({
        email,
        password,
        name
      }, { transaction });

      // Assign roles if provided
      console.log('Role IDs received:', roleIds);
      let assignedRoles: any[] = [];
      
      if (roleIds && Array.isArray(roleIds) && roleIds.length > 0) {
        // Find all valid roles
        const roles = await Role.findAll({
          where: { id: roleIds },
          transaction
        });

        console.log('Found roles in database:', roles.map(r => ({ id: r.id, name: r.name })));
        
        if (roles.length > 0) {
          console.log(`Assigning ${roles.length} roles to user ${user.id}`);
          await (user as any).setRoles(roles, { transaction });
          assignedRoles = roles;
        } else {
          console.log('No valid roles found for the provided role IDs');
        }
      }

      // Commit the transaction
      if (transaction) await transaction.commit();

      // Prepare user response with roles
      const userResponse = user.get({ plain: true });
      delete userResponse.password;
      userResponse.roles = assignedRoles.map(role => ({
        id: role.id,
        name: role.name
      }));

      console.log('Returning user with roles:', userResponse);
      return res.status(201).json({ success: true, data: userResponse });
    } catch (error) {
      console.error('Error creating user:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return res.status(500).json({ success: false, message: 'Error creating user', error: errorMessage });
    }
  },

  // Update user (Admin or self)
  updateUser: async (req: IRequestWithUser, res: Response): Promise<Response> => {
    try {
      const id = parseInt(req.params.id, 10);
      const userId = req.user?.id;
      const isAdmin = req.user?.roles?.some(role => role.name === 'admin');

      // Only allow admin or the user themselves to update the profile
      if (!isAdmin && userId !== id) {
        return res.status(403).json({ success: false, message: 'Not authorized to update this user' });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() as unknown as ValidationError[] });
      }

      const { name, email } = req.body;
      const user = await User.findByPk(id);

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // Update user fields
      if (name) user.name = name;
      if (email) user.email = email;

      await user.save();

      // Get updated user data without password
      const updatedUser = await User.findByPk(user.id, {
        attributes: { exclude: ['password'] },
        include: [{
          model: Role,
          through: { attributes: [] },
          as: 'roles'
        }]
      });

      return res.status(200).json({ success: true, data: updatedUser });
    } catch (error) {
      console.error('Error updating user:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return res.status(500).json({ success: false, message: 'Error updating user', error: errorMessage });
    }
  },

  // Delete user (Admin only)
  deleteUser: async (req: IRequestWithUser, res: Response): Promise<Response> => {
    const userId = parseUserId(req.params.id);
    
    if (!userId) {
      return res.error('Invalid user ID', 400);
    }

    // Check if user is admin
    if (!isAdmin(req)) {
      return res.error('Forbidden', 403);
    }

    try {
      // Prevent deleting yourself
      if (req.userId === userId) {
        return res.error('Cannot delete your own account', 400);
      }

      const user = await User.findByPk(userId);
      if (!user) {
        return res.error('User not found', 404);
      }

      // Delete user
      await user.destroy();

      return res.success({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Error deleting user:', error);
      return res.error('Server error', 500);
    }
  },

  // Assign role to user (Admin only)
  assignRole: async (req: IRequestWithUser, res: Response): Promise<Response> => {
    const userId = parseUserId(req.params.userId);
    const roleId = parseUserId(req.params.roleId);
    
    if (!userId || !roleId) {
      return res.error('Invalid user ID or role ID', 400);
    }

    // Check if user is admin
    if (!isAdmin(req)) {
      return res.error('Forbidden', 403);
    }

    try {
      const user = await User.findByPk(userId);
      if (!user) {
        return res.error('User not found', 404);
      }

      const role = await Role.findByPk(roleId);
      if (!role) {
        return res.error('Role not found', 404);
      }

      // Add role to user
      await (user as IUserWithRoles).addRole(role);

      return res.success({ message: 'Role assigned successfully' });
    } catch (error) {
      console.error('Error assigning role:', error);
      return res.error('Server error', 500);
    }
  },

  // Remove role from user (Admin only)
  removeRole: async (req: IRequestWithUser, res: Response): Promise<Response> => {
    const userId = parseUserId(req.params.userId);
    const roleId = parseUserId(req.params.roleId);
    
    if (!userId || !roleId) {
      return res.error('Invalid user ID or role ID', 400);
    }

    // Check if user is admin
    if (!isAdmin(req)) {
      return res.error('Forbidden', 403);
    }

    try {
      const user = await User.findByPk(userId);
      if (!user) {
        return res.error('User not found', 404);
      }

      const role = await Role.findByPk(roleId);
      if (!role) {
        return res.error('Role not found', 404);
      }

      // Remove role from user
      await (user as IUserWithRoles).removeRole(role);

      return res.success({ message: 'Role removed successfully' });
    } catch (error) {
      console.error('Error removing role:', error);
      return res.error('Server error', 500);
    }
  }
};
