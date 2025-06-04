import { Router, type Request, type Response, type NextFunction } from 'express';
import { TaskController } from '../controllers/task.controller.js';
import { auth } from '../middleware/auth.middleware.js';
import { validateRequest } from '../middleware/validate-request.js';
import { 
  createTaskSchema, 
  updateTaskSchema, 
  reorderTasksSchema 
} from '../validations/task.schema.js';

const router = Router();

// Apply authentication middleware to all task routes
router.use(auth);

// Create a new task
router.post(
  '/',
  validateRequest(createTaskSchema),
  (req: Request, res: Response, next: NextFunction) => TaskController.createTask(req, res).catch(next)
);

// Get task by ID
router.get('/:id', (req: Request, res: Response, next: NextFunction) => 
  TaskController.getTaskById(req, res).catch(next)
);

// Get all tasks for a project
router.get('/project/:projectId', (req: Request, res: Response, next: NextFunction) => 
  TaskController.getProjectTasks(req, res).catch(next)
);

// Update a task
router.put(
  '/:id',
  validateRequest(updateTaskSchema),
  (req: Request, res: Response, next: NextFunction) => TaskController.updateTask(req, res).catch(next)
);

// Delete a task
router.delete('/:id', (req: Request, res: Response, next: NextFunction) => 
  TaskController.deleteTask(req, res).catch(next)
);

// Reorder tasks
router.post(
  '/reorder',
  validateRequest(reorderTasksSchema),
  (req: Request, res: Response, next: NextFunction) => TaskController.reorderTasks(req, res).catch(next)
);

export default router;
