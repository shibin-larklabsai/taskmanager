import express, { Request, Response, NextFunction, Router } from 'express';
import { TaskController } from '../controllers/task.controller.js';
import { TaskStatus, TaskPriority } from '../models/task.model.js';
import { auth } from '../middleware/auth.middleware.js';
import Joi from 'joi';
const router: Router = express.Router();

// Apply authentication middleware to all task routes
router.use(auth as unknown as (req: Request, res: Response, next: NextFunction) => Promise<void>);

// Validation middleware
const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    schema.validateAsync(req.body, { abortEarly: false })
      .then(() => next())
      .catch((error: Joi.ValidationError) => {
        res.status(400).json({
          success: false,
          errors: error.details.map((err) => ({
            field: err.path[0],
            message: err.message
          }))
        });
      });
  };
};

// Create a new task
router.post(
  '/',
  validateRequest(Joi.object({
    title: Joi.string().required(),
    description: Joi.string().optional(),
    status: Joi.string().valid(...Object.values(TaskStatus)).optional(),
    priority: Joi.string().valid(...Object.values(TaskPriority)).optional(),
    dueDate: Joi.date().optional(),
    projectId: Joi.number().integer().positive().optional(),
    assignedToId: Joi.number().integer().positive().optional(),
    parentTaskId: Joi.number().integer().positive().optional(),
    estimatedHours: Joi.number().positive().optional()
  })),
  (req: Request, res: Response, next: NextFunction) => {
    void TaskController.createTask(req, res).catch(next);
  }
);

// Get all tasks
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  void TaskController.getTasks(req, res).catch(next);
});

// Get single task by ID
router.get('/:taskId', (req: Request, res: Response, next: NextFunction) => {
  void TaskController.getTaskById(req, res).catch(next);
});

// Update task
router.put(
  '/:taskId',
  validateRequest(Joi.object({
    title: Joi.string().optional(),
    description: Joi.string().optional(),
    status: Joi.string().valid(...Object.values(TaskStatus)).optional(),
    priority: Joi.string().valid(...Object.values(TaskPriority)).optional(),
    dueDate: Joi.date().optional(),
    assignedToId: Joi.number().integer().positive().optional(),
    parentTaskId: Joi.number().integer().positive().optional(),
    estimatedHours: Joi.number().positive().optional()
  })),
  (req: Request, res: Response, next: NextFunction) => {
    void TaskController.updateTask(req, res).catch(next);
  }
);

// Delete task
router.delete('/:taskId', (req: Request, res: Response, next: NextFunction) => {
  void TaskController.deleteTask(req, res).catch(next);
});

// Update task status (for drag and drop)
router.patch(
  '/:taskId/status',
  validateRequest(Joi.object({
    status: Joi.string().valid(...Object.values(TaskStatus)).required()
  })),
  (req: Request, res: Response, next: NextFunction) => {
    void TaskController.updateTaskStatus(req, res).catch(next);
  }
);

// Reorder tasks
router.post(
  '/reorder/:projectId',
  validateRequest(Joi.object({
    status: Joi.string().valid(...Object.values(TaskStatus)).required(),
    taskOrder: Joi.array().items(Joi.string()).required()
  })),
  (req: Request, res: Response, next: NextFunction) => {
    void TaskController.reorderTasks(req, res).catch(next);
  }
);

export default router;
