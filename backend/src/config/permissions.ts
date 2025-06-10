/**
 * Role-based permissions configuration
 * Defines what each role can do in the system
 */

export enum Permission {
  // User permissions
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  
  // Project permissions
  PROJECT_CREATE = 'project:create',
  PROJECT_READ = 'project:read',
  PROJECT_UPDATE = 'project:update',
  PROJECT_DELETE = 'project:delete',
  
  // Task permissions
  TASK_CREATE = 'task:create',
  TASK_READ = 'task:read',
  TASK_UPDATE = 'task:update',
  TASK_DELETE = 'task:delete',
  
  // Admin permissions (wildcard for all permissions)
  ALL = '*',
}

// Define role to permissions mapping
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: [
    Permission.ALL, // Admins have all permissions
  ],
  
  project_manager: [
    // Project permissions
    Permission.PROJECT_CREATE,
    Permission.PROJECT_READ,
    Permission.PROJECT_UPDATE,
    
    // Task permissions
    Permission.TASK_CREATE,
    Permission.TASK_READ,
    Permission.TASK_UPDATE,
    
    // Limited user permissions
    Permission.USER_READ,
  ],
  
  user: [
    // Limited task permissions
    Permission.TASK_READ,
    `task:create:own`,
    `task:update:own`,
    `task:delete:own`,
    
    // Limited user permissions
    `user:read:own`,
    `user:update:own`,
  ],
};

/**
 * Check if a role has a specific permission
 * @param role - The role to check
 * @param permission - The permission to verify
 * @returns boolean - True if the role has the permission
 */
export const hasPermission = (role: string, permission: string): boolean => {
  // Admins have all permissions
  if (role === 'admin') return true;
  
  const permissions = ROLE_PERMISSIONS[role.toLowerCase()] || [];
  
  // Check for wildcard or exact permission
  return (
    permissions.includes(Permission.ALL) ||
    permissions.includes(permission) ||
    // Check for wildcard permissions (e.g., 'task:*' matches 'task:read')
    permissions.some(
      p => p.endsWith(':*') && permission.startsWith(p.slice(0, -2))
    )
  );
};

/**
 * Get all permissions for a role
 * @param role - The role to get permissions for
 * @returns string[] - Array of permissions
 */
export const getRolePermissions = (role: string): string[] => {
  return [...(ROLE_PERMISSIONS[role.toLowerCase()] || [])];
};

/**
 * Middleware to check if user has any of the required permissions
 * @param requiredPermissions - Array of required permissions
 * @returns Express middleware function
 */
export const checkPermission = (requiredPermissions: string[]) => {
  return (req: any, res: any, next: any) => {
    try {
      const userRoles = req.user?.roles || [];
      
      // Check if any of the user's roles have the required permissions
      const hasPermission = userRoles.some((role: any) =>
        requiredPermissions.some(permission => 
          hasPermission(role.name, permission)
        )
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking permissions',
      });
    }
  };
};
