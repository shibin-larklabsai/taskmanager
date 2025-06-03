import express, { type Request, type Response, type NextFunction } from 'express';
import Joi from 'joi';
import { ProjectStatus } from '../models/project.model.js';
import { ProjectRole } from '../models/project-member.model.js';
import { auth } from '../middleware/auth.middleware.js';
import { ProjectController } from '../controllers/project.controller.js';
import { Project } from '../models/project.model.js';

// Joi validation schemas
const createProjectSchema = Joi.object({
  name: Joi.string().required().min(3).max(100).label('Project Name'),
  description: Joi.string().allow('').max(500).label('Description'),
  status: Joi.string().valid(
    ProjectStatus.PLANNING,
    ProjectStatus.IN_PROGRESS,
    ProjectStatus.ON_HOLD,
    ProjectStatus.COMPLETED,
    ProjectStatus.CANCELLED
  ).default(ProjectStatus.PLANNING).label('Status'),
  startDate: Joi.date().iso().allow(null).label('Start Date'),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).allow(null).label('End Date')
    .when('startDate', {
      is: Joi.exist(),
      then: Joi.date().min(Joi.ref('startDate')),
      otherwise: Joi.date().min('now')
    })
}).required().label('Project Data');

const updateProjectSchema = Joi.object({
  name: Joi.string().min(3).max(100).label('Project Name'),
  description: Joi.string().allow('').max(500).label('Description'),
  status: Joi.string().valid(
    ProjectStatus.PLANNING,
    ProjectStatus.IN_PROGRESS,
    ProjectStatus.ON_HOLD,
    ProjectStatus.COMPLETED,
    ProjectStatus.CANCELLED
  ).label('Status'),
  startDate: Joi.date().iso().allow(null).label('Start Date'),
  endDate: Joi.date().iso().allow(null).label('End Date')
    .when('startDate', {
      is: Joi.exist(),
      then: Joi.date().min(Joi.ref('startDate')),
      otherwise: Joi.date()
    })
}).min(1).label('Project Update Data');

const projectMemberRoleSchema = Joi.object({
  role: Joi.string().valid(...Object.values(ProjectRole)).default(ProjectRole.VIEWER).label('Role')
}).required().label('Project Member Role');

// Validation middleware
const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, { 
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/['"]/g, '')
      }));
      
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
      return;
    }
    
    // Replace request body with validated value
    req.body = value;
    next();
  };
};

const router = express.Router();

// Apply auth middleware to all routes
router.use(auth as unknown as (req: Request, res: Response, next: NextFunction) => Promise<void>);

// Create a new project
router.post(
  '/',
  validateRequest(createProjectSchema),
  (req: Request, res: Response, next: NextFunction) => {
    ProjectController.createProject(req, res).catch(next);
  }
);

// Debug route to list all projects with IDs (temporary)
router.get(
  '/debug/list',
  async (_req: Request, res: Response) => {
    try {
      const projects = await Project.findAll({
        attributes: ['id', 'name', 'createdAt', 'updatedAt'],
        order: [['id', 'ASC']],
        raw: true,
      });
      res.json({ success: true, data: projects });
    } catch (error: any) {
      console.error('Error listing projects:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to list projects', 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }
);

// Get all projects for the current user
router.get(
  '/',
  (req: Request, res: Response, next: NextFunction) => {
    ProjectController.getProjects(req, res).catch(next);
  }
);

// Get project by ID
router.get(
  '/:projectId',
  (req: Request, res: Response, next: NextFunction) => {
    ProjectController.getProjectById(req, res).catch(next);
  }
);

// Update project
router.put(
  '/:projectId',
  validateRequest(updateProjectSchema),
  (req: Request, res: Response, next: NextFunction) => {
    ProjectController.updateProject(req, res).catch(next);
  }
);

// Delete project
router.delete(
  '/:projectId',
  (req: Request, res: Response, next: NextFunction) => {
    ProjectController.deleteProject(req, res).catch(next);
  }
);

// Add or update project member
router.post(
  '/:projectId/members/:userId',
  validateRequest(projectMemberRoleSchema),
  (req: Request, res: Response, next: NextFunction) => {
    ProjectController.updateProjectMember(req, res).catch(next);
  }
);

// Update project member role
router.put(
  '/:projectId/members/:userId',
  validateRequest(projectMemberRoleSchema),
  (req: Request, res: Response, next: NextFunction) => {
    ProjectController.updateProjectMember(req, res).catch(next);
  }
);

// Remove member from project
router.delete(
  '/:projectId/members/:userId',
  (req: Request, res: Response, next: NextFunction) => {
    ProjectController.removeProjectMember(req, res).catch(next);
  }
);

export default router;
