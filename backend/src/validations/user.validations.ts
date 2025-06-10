import { body, param } from 'express-validator';
import type { Request } from 'express';
import User from '../models/user.model.js';

type ValidationChain = any; // Type definition for express-validator v7

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        roles?: Array<{ name: string }>;
      };
    }
  }
}

export const createUserSchema = [
  check('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  
  check('email')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail()
    .custom(async (value: string) => {
      const user = await User.findOne({ where: { email: value } });
      if (user) {
        throw new Error('Email already in use');
      }
      return true;
    }),

  check('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),

  check('roleIds')
    .optional({ nullable: true })
    .isArray().withMessage('Role IDs must be an array')
    .custom((value: unknown) => {
      if (!Array.isArray(value)) return false;
      return value.every((id) => {
        const num = Number(id);
        return Number.isInteger(num) && num > 0;
      });
    })
    .withMessage('Each role ID must be a positive integer'),
];

// Validation schema for updating a user
export const updateUserSchema: ValidationChain[] = [
  param('id')
    .notEmpty().withMessage('User ID is required')
    .isString().withMessage('User ID must be a string')
    .matches(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/).withMessage('User ID must be a valid UUID'),

  check('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  
  check('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail()
    .custom(async (value: string, { req }) => {
      if (!req.params?.id) return true;
      const userId = parseInt(req.params.id, 10);
      const user = await User.findOne({ where: { email: value } });
      if (user && user.id !== userId) {
        throw new Error('Email already in use');
      }
      return true;
    }),

  check('password')
    .optional()
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),

  check('roleIds')
    .optional({ nullable: true })
    .isArray()
    .withMessage('Role IDs must be an array')
    .custom((value: unknown) => {
      if (!Array.isArray(value)) return false;
      return value.every((id) => {
        const num = Number(id);
        return Number.isInteger(num) && num > 0;
      });
    })
    .withMessage('Each role ID must be a positive integer'),
];

export const userIdParamSchema = [
  param('id')
    .notEmpty().withMessage('User ID is required')
    .isUUID().withMessage('Invalid user ID format')
];

// Validation schema for role assignment
export const roleAssignmentSchema: ValidationChain[] = [
  param('userId')
    .notEmpty().withMessage('User ID is required')
    .isString().withMessage('User ID must be a string')
    .matches(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/).withMessage('User ID must be a valid UUID'),
  
  param('roleId')
    .notEmpty().withMessage('Role ID is required')
    .isString().withMessage('Role ID must be a string')
    .matches(/^\d+$/).withMessage('Role ID must be a valid number')
    .toInt()
];
