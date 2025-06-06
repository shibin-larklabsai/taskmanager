import type { Request, Response } from 'express';
import { Project, ProjectStatus } from '../models/project.model.js';
import { ProjectMember, ProjectRole } from '../models/project-member.model.js';
import User from '../models/user.model.js';

// Helper function to check if user can manage project
const canManageProject = async (userId: number, projectId: number): Promise<boolean> => {
  console.log(`[canManageProject] Checking permissions for user ${userId} on project ${projectId}`);
  
  try {
    // Check if user is admin
    const user = await User.findByPk(userId, {
      include: [{
        model: User.associations.roles.target,
        as: 'roles',
        attributes: ['id', 'name'],
        through: { attributes: [] },
        required: false
      }]
    });

    if (!user) {
      console.log(`[canManageProject] User ${userId} not found`);
      return false;
    }

    const userJson = user.toJSON() as any;
    console.log(`[canManageProject] User roles:`, userJson.roles);
    
    // Check if user has admin role
    const isAdmin = userJson.roles?.some((role: { name: string }) => role.name === 'admin');
    if (isAdmin) {
      console.log(`[canManageProject] User ${userId} is an admin, granting access`);
      return true;
    }

    // Check if user has project_manager role
    const isProjectManager = userJson.roles?.some((role: { name: string }) => 
      role.name.toLowerCase() === 'project_manager' || role.name.toLowerCase() === 'manager'
    );
    
    if (isProjectManager) {
      console.log(`[canManageProject] User ${userId} is a project manager, granting access`);
      return true;
    }

    // Check if user is owner/manager/developer of the project
    console.log(`[canManageProject] Checking project membership for user ${userId}`);
    const membership = await ProjectMember.findOne({
      where: {
        userId,
        projectId,
        role: [ProjectRole.OWNER, ProjectRole.MANAGER, ProjectRole.DEVELOPER]
      },
      raw: true,
      nest: true
    });

    console.log(`[canManageProject] Membership check result:`, {
      userId,
      projectId,
      hasMembership: !!membership,
      membershipRole: membership?.role
    });

    return !!membership;
  } catch (error) {
    console.error('[canManageProject] Error:', error);
    return false;
  }
};

// Extend Express Request type to include user
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

export class ProjectController {
  // Create a new project
  static createProject = async (req: Request, res: Response): Promise<void> => {
    let responseSent = false;
    
    const sendResponse = (status: number, data: any) => {
      if (!responseSent) {
        responseSent = true;
        res.status(status).json(data);
      }
    };

    try {
      const { name, description, status, startDate, endDate } = req.body;
      const createdById = req.user?.id;

      if (!createdById) {
        return sendResponse(401, { success: false, message: 'User not authenticated' });
      }

      if (!startDate) {
        return sendResponse(400, { 
          success: false, 
          message: 'Validation error',
          errors: ['startDate is required']
        });
      }

      const now = new Date();
      const project = await Project.create({
        name,
        description: description || null,
        status: status || ProjectStatus.PLANNING,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        createdById,
        createdAt: now,
        updatedAt: now
      });

      try {
        // Add the creator as an owner of the project
        await ProjectMember.create({
          projectId: project.id,
          userId: createdById,
          role: ProjectRole.OWNER,
        });

        const createdProject = await Project.findByPk(project.id, {
          include: [
            { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
            { 
              model: ProjectMember, 
              as: 'projectMembers',
              include: [
                { model: User, as: 'user', attributes: ['id', 'name', 'email'] }
              ]
            }
          ]
        });

        return sendResponse(201, {
          success: true,
          data: createdProject,
        });
      } catch (dbError) {
        // If adding project member fails, clean up the created project
        await Project.destroy({ where: { id: project.id }, force: true });
        throw dbError;
      }
    } catch (error: any) {
      console.error('Error creating project:', error);
      
      if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
        const errors = error.errors?.map((e: any) => e.message) || [error.message];
        return sendResponse(400, {
          success: false,
          message: 'Validation error',
          errors
        });
      }
      
      sendResponse(500, {
        success: false,
        message: 'Failed to create project',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  // Get all projects (with pagination)
  static getProjects = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;

      const { count, rows: projects } = await Project.findAndCountAll({
        limit,
        offset,
        include: [
          { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
          {
            model: ProjectMember,
            as: 'projectMembers',
            include: [
              { model: User, as: 'user', attributes: ['id', 'name', 'email'] }
            ]
          }
        ],
        order: [['createdAt', 'DESC']],
      });

      // Log the first project to check if creator is included
      if (projects.length > 0) {
        console.log('First project data:', JSON.stringify(projects[0].get({ plain: true }), null, 2));
        console.log('Creator data:', JSON.stringify(projects[0].get('creator'), null, 2));
      }

      return res.status(200).json({
        success: true,
        data: projects,
        pagination: {
          total: count,
          page,
          pages: Math.ceil(count / limit),
          limit,
        },
      });
    } catch (error: any) {
      console.error('Error fetching projects:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch projects',
        error: error.message,
      });
    }
  }

  // Get a single project by ID
  static getProjectById = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const { projectId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      // Get user's roles
      const user = await User.findByPk(userId, {
        include: [{
          model: User.associations.roles.target,
          as: 'roles',
          attributes: ['id', 'name'],
          through: { attributes: [] },
          required: false
        }]
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      const project = await Project.findByPk(projectId, {
        include: [
          { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
          {
            model: ProjectMember,
            as: 'projectMembers',
            include: [
              { model: User, as: 'user', attributes: ['id', 'name', 'email'] }
            ]
          }
        ]
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found',
        });
      }

      // Check if user is admin
      const isAdmin = user.roles?.some(role => role.name === 'admin');
      if (isAdmin) {
        return res.status(200).json({
          success: true,
          data: project,
        });
      }

      // Check if user is a project member
      const isMember = await ProjectMember.findOne({
        where: { projectId, userId }
      });

      if (isMember) {
        return res.status(200).json({
          success: true,
          data: project,
        });
      }

      // For non-members, only allow access to in-progress projects
      if (project.status !== 'IN_PROGRESS') {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view this project',
        });
      }

      return res.status(200).json({
        success: true,
        data: project,
      });
    } catch (error: any) {
      console.error('Error fetching project:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch project',
        error: error.message,
      });
    }
  }

  // Update a project
  static updateProject = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const { projectId } = req.params;
      const updates = req.body;
      const currentUserId = req.user?.id;

      if (!currentUserId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      const project = await Project.findByPk(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found',
        });
      }

      // Check if user can manage the project
      const canManage = await canManageProject(currentUserId, project.id);
      if (!canManage) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update this project. Only project owners and managers can update projects.',
        });
      }

      await project.update(updates);

      const updatedProject = await Project.findByPk(projectId, {
        include: [
          { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
          {
            model: ProjectMember,
            as: 'projectMembers',
            include: [
              { model: User, as: 'user', attributes: ['id', 'name', 'email'] }
            ]
          }
        ]
      });

      return res.status(200).json({
        success: true,
        data: updatedProject,
      });
    } catch (error: any) {
      console.error('Error updating project:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update project',
        error: error.message,
      });
    }
  }

  // Delete a project
  static deleteProject = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const { projectId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      const project = await Project.findByPk(projectId);

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found',
        });
      }

      // Check if user can manage the project
      const hasPermission = await canManageProject(userId, project.id);
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to delete this project. Only project owners and managers can delete projects.',
        });
      }

      // Soft delete the project
      await project.destroy();

      return res.status(200).json({
        success: true,
        message: 'Project deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting project:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete project',
        error: error.message,
      });
    }
  };

  // Add or update project member
  static updateProjectMember = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const { projectId, userId } = req.params;
      const { role } = req.body;
      const currentUserId = req.user?.id;

      if (!currentUserId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      // Check if project exists
      const project = await Project.findByPk(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found',
        });
      }

      // Check if the target user exists
      const targetUser = await User.findByPk(userId);
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      // Check if current user can manage the project
      const canManage = await canManageProject(currentUserId, project.id);
      if (!canManage) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to manage members in this project.',
        });
      }

      // Check if this is an existing member being updated
      const existingMember = await ProjectMember.findOne({
        where: {
          projectId,
          userId,
        },
      });

      // Only check owner count if we're changing an existing owner's role
      if (existingMember?.role === ProjectRole.OWNER && role !== ProjectRole.OWNER) {
        const ownerCount = await ProjectMember.count({
          where: {
            projectId,
            role: ProjectRole.OWNER,
          },
        });

        if (ownerCount <= 1) {
          return res.status(400).json({
            success: false,
            message: 'Cannot remove the only owner from the project',
          });
        }
      }

      // Add or update the project member
      const [member] = await ProjectMember.upsert({
        projectId: parseInt(projectId, 10),
        userId: parseInt(userId, 10),
        role,
      });

      // Fetch the updated member with user data
      const updatedMember = await ProjectMember.findByPk(member.id, {
        include: [
          { model: User, as: 'user', attributes: ['id', 'name', 'email'] }
        ]
      });

      return res.status(200).json({
        success: true,
        data: updatedMember,
      });
    } catch (error) {
      console.error('Error updating project member:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update project member',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // Remove a member from a project
  static removeProjectMember = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const { projectId, userId } = req.params;
      const currentUserId = req.user?.id;

      if (!currentUserId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      // Check if project exists
      const project = await Project.findByPk(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found',
        });
      }

      // Check if the target user exists
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      // Check if current user can manage the project
      const canManage = await canManageProject(currentUserId, project.id);
      if (!canManage) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to manage members in this project.',
        });
      }

      // Prevent removing the only owner
      const memberToRemove = await ProjectMember.findOne({
        where: {
          projectId,
          userId,
          role: ProjectRole.OWNER,
        },
      });

      if (memberToRemove) {
        const ownerCount = await ProjectMember.count({
          where: {
            projectId,
            role: ProjectRole.OWNER,
          },
        });

        if (ownerCount <= 1) {
          return res.status(400).json({
            success: false,
            message: 'Cannot remove the only owner from the project',
          });
        }
      }

      // Remove member
      await ProjectMember.destroy({
        where: {
          projectId: parseInt(projectId, 10),
          userId: parseInt(userId, 10),
        },
      });

      return res.status(200).json({
        success: true,
        message: 'Member removed from project successfully',
      });
    } catch (error: any) {
      console.error('Error removing project member:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to remove project member',
        error: error.message,
      });
    }
  }
}

