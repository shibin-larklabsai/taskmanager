import Joi from 'joi';
import { ProjectStatus } from '../models/project.model.js';
import { ProjectRole } from '../models/project-member.model.js';

const commonProjectFields = {
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Project name is required',
      'string.min': 'Project name must be at least {#limit} characters long',
      'string.max': 'Project name cannot be longer than {#limit} characters',
      'any.required': 'Project name is required',
    }),
  
  description: Joi.string()
    .trim()
    .max(1000)
    .allow('')
    .messages({
      'string.max': 'Description cannot be longer than {#limit} characters',
    }),
    
  status: Joi.string()
    .valid(...Object.values(ProjectStatus))
    .default(ProjectStatus.PLANNING)
    .messages({
      'any.only': `Status must be one of: ${Object.values(ProjectStatus).join(', ')}`,
    }),
    
  startDate: Joi.date()
    .iso()
    .required()
    .min('now')
    .messages({
      'date.base': 'Start date must be a valid date',
      'date.format': 'Start date must be a valid ISO 8601 date',
      'date.min': 'Start date cannot be in the past',
      'any.required': 'Start date is required',
    }),
    
  endDate: Joi.date()
    .iso()
    .min(Joi.ref('startDate'))
    .messages({
      'date.base': 'End date must be a valid date',
      'date.format': 'End date must be a valid ISO 8601 date',
      'date.min': 'End date must be after start date',
    })
    .when('startDate', {
      is: Joi.exist(),
      then: Joi.date().min(Joi.ref('startDate')),
      otherwise: Joi.date()
    })
};

// Schema for creating a new project
export const createProjectSchema = Joi.object({
  ...commonProjectFields
}).required().messages({
  'object.base': 'Invalid project data',
  'any.required': 'Project data is required',
});

// Schema for updating a project
export const updateProjectSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .messages({
      'string.empty': 'Project name cannot be empty',
      'string.min': 'Project name must be at least {#limit} characters long',
      'string.max': 'Project name cannot be longer than {#limit} characters',
    }),
  
  description: Joi.string()
    .trim()
    .max(1000)
    .allow('')
    .messages({
      'string.max': 'Description cannot be longer than {#limit} characters',
    }),
    
  status: Joi.string()
    .valid(...Object.values(ProjectStatus))
    .messages({
      'any.only': `Status must be one of: ${Object.values(ProjectStatus).join(', ')}`,
    }),
    
  startDate: Joi.date()
    .iso()
    .min('now')
    .messages({
      'date.base': 'Start date must be a valid date',
      'date.format': 'Start date must be a valid ISO 8601 date',
      'date.min': 'Start date cannot be in the past',
    }),
    
  endDate: Joi.date()
    .iso()
    .min(Joi.ref('startDate'))
    .messages({
      'date.base': 'End date must be a valid date',
      'date.format': 'End date must be a valid ISO 8601 date',
      'date.min': 'End date must be after start date',
    })
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

// Schema for project member operations
export const projectMemberSchema = Joi.object({
  userId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'User ID must be a number',
      'number.integer': 'User ID must be an integer',
      'number.positive': 'User ID must be a positive number',
      'any.required': 'User ID is required',
    }),
    
  role: Joi.string()
    .valid(...Object.values(ProjectRole))
    .default(ProjectRole.VIEWER)
    .messages({
      'any.only': `Role must be one of: ${Object.values(ProjectRole).join(', ')}`,
    })
}).required().messages({
  'object.base': 'Invalid member data',
  'any.required': 'Member data is required',
});

// Schema for project ID parameter
export const projectIdSchema = Joi.object({
  id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'Project ID must be a number',
      'number.integer': 'Project ID must be an integer',
      'number.positive': 'Project ID must be a positive number',
      'any.required': 'Project ID is required',
    })
});
