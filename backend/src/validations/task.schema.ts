import { body } from 'express-validator';

export const createTaskSchema = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 255 })
    .withMessage('Title must be less than 255 characters'),
  
  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string'),
    
  body('status')
    .optional()
    .isIn(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'])
    .withMessage('Invalid status value'),
    
  body('priority')
    .optional()
    .isIn(['LOW', 'MEDIUM', 'HIGH'])
    .withMessage('Invalid priority value'),
    
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format. Use ISO8601 format'),
    
  body('projectId')
    .notEmpty()
    .withMessage('Project ID is required')
    .isUUID()
    .withMessage('Invalid project ID format'),
    
  body('assignedTo')
    .optional()
    .isUUID()
    .withMessage('Invalid assigned user ID format'),
    
  body('parentTaskId')
    .optional()
    .isUUID()
    .withMessage('Invalid parent task ID format'),
];

export const updateTaskSchema = [
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .isLength({ max: 255 })
    .withMessage('Title must be less than 255 characters'),
    
  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string'),
    
  body('status')
    .optional()
    .isIn(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'])
    .withMessage('Invalid status value'),
    
  body('priority')
    .optional()
    .isIn(['LOW', 'MEDIUM', 'HIGH'])
    .withMessage('Invalid priority value'),
    
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format. Use ISO8601 format'),
    
  body('assignedTo')
    .optional()
    .isUUID()
    .withMessage('Invalid assigned user ID format'),
];

export const reorderTasksSchema = [
  body('taskId')
    .notEmpty()
    .withMessage('Task ID is required')
    .isUUID()
    .withMessage('Invalid task ID format'),
    
  body('newOrder')
    .isInt({ min: 0 })
    .withMessage('Order must be a non-negative integer'),
    
  body('status')
    .optional()
    .isIn(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'])
    .withMessage('Invalid status value'),
];
