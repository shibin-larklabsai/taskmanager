import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Project, ProjectStatus } from '../models/project.model.js';
import { ProjectMember, ProjectRole } from '../models/project-member.model.js';
import User from '../models/user.model.js';
import Role from '../models/role.model.js';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        roles?: Array<{ name: string }>;
      };
      io?: any; // WebSocket instance
    }
  }
}

// Extend Project type to include projectMembers
type ProjectWithMembers = Project & {
  projectMembers?: Array<{
    id: number;
    projectId?: number;
    userId: number;
    role: string;
    user?: User;
    isTester?: boolean;
  }>;
};

// Helper function to check if user can manage project
const canManageProject = async (userId: number, projectId: number): Promise<boolean> => {
  try {
    // Check if user is admin
    const user = await User.findByPk(userId, {
      include: [{
        model: Role,
        as: 'roles',
        attributes: ['id', 'name'],
        through: { attributes: [] },
        required: false
      }]
    });

    if (!user) {
      return false;
    }

    // Check if user has admin role
    const isAdmin = (user as any).roles?.some((role: { name: string }) => 
      role.name.toLowerCase() === 'admin'
    );
    
    if (isAdmin) {
      return true;
    }

    // Check if project exists and is in progress
    const project = await Project.findByPk(projectId);
    if (project?.status === ProjectStatus.IN_PROGRESS) {
      // Check if user is a tester
      const isTester = (user as any).roles?.some((role: { name: string }) => 
        role.name.toLowerCase() === 'tester'
      );
      
      if (isTester) {
        return true;
      }
    }

    // Check if user is owner/manager/developer of the project
    const membership = await ProjectMember.findOne({
      where: {
        userId,
        projectId,
        role: [ProjectRole.OWNER, ProjectRole.MANAGER, ProjectRole.DEVELOPER]
      }
    });

    return !!membership;
  } catch (error) {
    console.error('[canManageProject] Error:', error);
    return false;
  }
};

class ProjectController {
  // Create a new project
  static createProject = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, description, status, startDate, endDate } = req.body;
      const createdById = req.user?.id;

      if (!createdById) {
        res.status(401).json({ success: false, message: 'User not authenticated' });
        return;
      }

      if (!startDate) {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: ['startDate is required']
        });
        return;
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

        res.status(201).json({
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
        res.status(400).json({
          success: false,
          message: 'Validation error',
          errors
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to create project',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  };

  // Get all projects with pagination
  static getProjects = async (req: Request, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;

      // Get all projects with pagination
      const { count, rows } = await Project.findAndCountAll({
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

      const projects = rows as unknown as ProjectWithMembers[];

      // Get all testers
      const testers = await User.findAll({
        include: [{
          model: Role,
          as: 'roles',  // Specify the alias used in the association
          where: { name: 'tester' },
          through: { attributes: [] },
          required: true
        }],
        attributes: ['id', 'name', 'email']
      });

      // Add testers as members to all projects if they're not already members
      const projectsWithTesters = projects.map(project => {
        const projectPlain = project.get({ plain: true }) as ProjectWithMembers;
        
        // Get existing member IDs
        const existingMemberIds = new Set<number>(
          projectPlain.projectMembers?.map(m => m.userId) || []
        );
        
        // Add testers who aren't already members
        const testersToAdd = testers
          .filter(tester => !existingMemberIds.has(tester.id))
          .map(tester => ({
            id: -1, // Temporary ID since they're not real members
            projectId: project.id,
            userId: tester.id,
            role: ProjectRole.TESTER,
            user: tester,
            isTester: true // Flag to indicate this is a virtual member
          }));
        
        return {
          ...projectPlain,
          projectMembers: [
            ...(projectPlain.projectMembers || []),
            ...testersToAdd
          ]
        };
      });

      res.status(200).json({
        success: true,
        data: projectsWithTesters,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      });
    } catch (error: any) {
      console.error('Error fetching projects:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch projects',
        error: error.message,
      });
    }
  };

  // Get a single project by ID
  static getProjectById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      // Get project with members and creator
      const project = await Project.findByPk(projectId, {
        include: [
          { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
          {
            model: ProjectMember,
            as: 'projectMembers',
            include: [
              { 
                model: User, 
                as: 'user', 
                attributes: ['id', 'name', 'email']
              }
            ]
          }
        ]
      });

      if (!project) {
        res.status(404).json({
          success: false,
          message: 'Project not found',
        });
        return;
      }

      // Check if user can access the project
      const canAccess = await canManageProject(userId, project.id);
      if (!canAccess) {
        res.status(403).json({
          success: false,
          message: 'You do not have permission to view this project',
        });
        return;
      }

      // If user is a tester, add them to the project members if not already there
      const user = await User.findByPk(userId, {
        include: [{
          model: Role,
          as: 'roles',
          attributes: ['id', 'name'],
          through: { attributes: [] },
          required: false
        }]
      });

      if (user) {
        const userRoles = (user as any).roles?.map((r: Role) => r.name) || [];
        const isTester = userRoles.includes('tester');
        
        if (isTester) {
          const projectData = project.get({ plain: true }) as ProjectWithMembers;
          const existingMember = projectData.projectMembers?.some(
            m => m.userId === userId
          );
          
          if (!existingMember) {
            // Add tester as a virtual member (not saved to DB)
            const testerMember = {
              id: -1, // Temporary ID
              projectId: project.id,
              userId: userId,
              role: ProjectRole.TESTER,
              user: user,
              isTester: true
            };
            
            if (!projectData.projectMembers) {
              projectData.projectMembers = [];
            }
            projectData.projectMembers.push(testerMember);
            
            // Update the project with the modified data
            Object.assign(project, projectData);
          }
        }
      }

      res.status(200).json({
        success: true,
        data: project,
      });
    } catch (error: any) {
      console.error('Error getting project:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get project',
        error: error.message,
      });
    }
  };

  // Update a project
  static updateProject = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      const updates = req.body;
      const currentUserId = req.user?.id;

      if (!currentUserId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      // Find the project
      const project = await Project.findByPk(projectId);
      if (!project) {
        res.status(404).json({
          success: false,
          message: 'Project not found',
        });
        return;
      }

      // Check if user has permission to update the project
      const hasPermission = await canManageProject(currentUserId, project.id);
      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'You do not have permission to update this project',
        });
        return;
      }

      // Update the project
      await project.update(updates);

      // Fetch the updated project with relations
      const updatedProject = await Project.findByPk(project.id, {
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

      res.status(200).json({
        success: true,
        data: updatedProject,
      });
    } catch (error: any) {
      console.error('Error updating project:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update project',
        error: error.message,
      });
    }
  };

  // Delete a project
  static deleteProject = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      const currentUserId = req.user?.id;
      
      if (!currentUserId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const project = await Project.findByPk(projectId);

      if (!project) {
        res.status(404).json({
          success: false,
          message: 'Project not found',
        });
        return;
      }

      // Check if user has permission to delete the project
      const hasPermission = await canManageProject(currentUserId, project.id);
      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: 'You do not have permission to delete this project',
        });
        return;
      }

      // Soft delete the project
      await project.destroy();

      res.status(200).json({
        success: true,
        message: 'Project deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting project:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete project',
        error: error.message,
      });
    }
  };

  // Add or update project member
  static updateProjectMember = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId, userId } = req.params;
      const { role } = req.body;
      const currentUserId = req.user?.id;

      if (!currentUserId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      // Check if project exists
      const project = await Project.findByPk(projectId);
      if (!project) {
        res.status(404).json({
          success: false,
          message: 'Project not found',
        });
        return;
      }

      // Check if the target user exists
      const targetUser = await User.findByPk(userId);
      if (!targetUser) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      // Check if current user can manage the project
      const canManage = await canManageProject(currentUserId, project.id);
      if (!canManage) {
        res.status(403).json({
          success: false,
          message: 'You do not have permission to manage members in this project',
        });
        return;
      }

      // Add or update the project member
      const [member, created] = await ProjectMember.upsert(
        {
          projectId: parseInt(projectId, 10),
          userId: parseInt(userId, 10),
          role,
        },
        {
          returning: true,
          conflictFields: ['projectId', 'userId']
        }
      );

      // Fetch the updated member with user data
      const updatedMember = await ProjectMember.findByPk(member.id, {
        include: [
          { model: User, as: 'user', attributes: ['id', 'name', 'email'] }
        ]
      });

      res.status(200).json({
        success: true,
        message: created ? 'Member added successfully' : 'Member updated successfully',
        data: updatedMember,
      });
    } catch (error: any) {
      console.error('Error updating project member:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update project member',
        error: error.message,
      });
    }
  };

  // Remove a member from a project
  static removeProjectMember = async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectId, userId } = req.params;
      const currentUserId = req.user?.id;

      if (!currentUserId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      // Check if project exists
      const project = await Project.findByPk(projectId);
      if (!project) {
        res.status(404).json({
          success: false,
          message: 'Project not found',
        });
        return;
      }

      // Check if the target user exists
      const targetUser = await User.findByPk(userId);
      if (!targetUser) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      // Check if current user can manage the project
      const canManage = await canManageProject(currentUserId, project.id);
      if (!canManage) {
        res.status(403).json({
          success: false,
          message: 'You do not have permission to manage members in this project',
        });
        return;
      }

      // Prevent removing the only owner
      const memberToRemove = await ProjectMember.findOne({
        where: {
          projectId: parseInt(projectId, 10),
          userId: parseInt(userId, 10),
          role: ProjectRole.OWNER,
        },
      });

      if (memberToRemove) {
        const ownerCount = await ProjectMember.count({
          where: {
            projectId: parseInt(projectId, 10),
            role: ProjectRole.OWNER,
          },
        });

        if (ownerCount <= 1) {
          res.status(400).json({
            success: false,
            message: 'Cannot remove the only owner from the project',
          });
          return;
        }
      }

      // Remove member
      await ProjectMember.destroy({
        where: {
          projectId: parseInt(projectId, 10),
          userId: parseInt(userId, 10),
        },
      });

      res.status(200).json({
        success: true,
        message: 'Member removed from project successfully',
      });
    } catch (error: any) {
      console.error('Error removing project member:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove project member',
        error: error.message,
      });
    }
  };
}

export default ProjectController;
