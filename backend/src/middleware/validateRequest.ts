import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { AppError } from '../utils/errorHandler.js';

export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.param,
      message: error.msg
    }));
    
    throw new AppError(
      `Validation failed: ${errors.array().map(e => e.msg).join(', ')}`,
      400,
      errorMessages
    );
  }
  next();
};

export const validate = (validations: any[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    await Promise.all(validations.map(validation => validation.run(req)));
    const errors = validationResult(req);
    
    if (errors.isEmpty()) {
      return next();
    }
    
    const errorMessages = errors.array().map(error => ({
      field: error.param,
      message: error.msg
    }));
    
    throw new AppError(
      `Validation failed: ${errors.array().map(e => e.msg).join(', ')}`,
      400,
      errorMessages
    );
  };
};
