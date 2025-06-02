import type { Request, Response } from 'express';
import { Project, ProjectStatus } from '../models/project.model.js';
import { ProjectMember, ProjectRole } from '../models/project-member.model.js';
import User from '../models/user.model.js';

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

class ProjectController {
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

      const project = await Project.findByPk(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found',
        });
      }

      // Check if user is authorized to update
      const isOwner = await ProjectMember.findOne({
        where: {
          projectId: projectId,
          userId: req.user?.id,
          role: ProjectRole.OWNER,
        },
      });

      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: 'Only project owners can update the project',
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

      const project = await Project.findByPk(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found',
        });
      }

      // Check if user is authorized to delete
      const isOwner = await ProjectMember.findOne({
        where: {
          projectId: projectId,
          userId: req.user?.id,
          role: ProjectRole.OWNER,
        },
      });

      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: 'Only project owners can delete the project',
        });
      }

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
  }

  // Add or update project member
  static updateProjectMember = async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const { projectId, userId } = req.params;
      const { role } = req.body;

      // Check if project exists
      const project = await Project.findByPk(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found',
        });
      }

      // Check if user exists
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      // Check if requester is authorized (must be project owner or manager)
      const requesterMembership = await ProjectMember.findOne({
        where: {
          projectId,
          userId: req.user?.id,
          role: [ProjectRole.OWNER, ProjectRole.MANAGER],
        },
      });

      if (!requesterMembership) {
        return res.status(403).json({
          success: false,
          message: 'Only project owners or managers can update project members',
        });
      }

      // Prevent changing owner role if there's only one owner
      if (role !== ProjectRole.OWNER) {
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

      // Add or update project member
      const [member] = await ProjectMember.upsert({
        projectId: parseInt(projectId, 10),
        userId: parseInt(userId, 10),
        role,
      });

      return res.status(200).json({
        success: true,
        data: member,
      });
    } catch (error: any) {
      console.error('Error updating project member:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update project member',
        error: error.message,
      });
    }
  }

  // Remove member from project
  static removeProjectMember = async (req: Request, res: Response) => {
    try {
      const { projectId, userId } = req.params;

      // Check if project exists
      const project = await Project.findByPk(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found',
        });
      }

      // Check if user exists
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      // Check if requester is authorized (must be project owner or manager)
      const requesterMembership = await ProjectMember.findOne({
        where: {
          projectId,
          userId: req.user?.id,
          role: [ProjectRole.OWNER, ProjectRole.MANAGER],
        },
      });

      if (!requesterMembership) {
        return res.status(403).json({
          success: false,
          message: 'Only project owners or managers can remove project members',
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

export default ProjectController;
