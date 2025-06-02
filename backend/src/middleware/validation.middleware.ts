import { Request, Response, NextFunction, RequestHandler } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { ValidationError as ExpressValidationError } from 'express-validator/src/base';

interface CustomValidationError {
  param: string;
  msg: string;
}

/**
 * Middleware to validate request data against a schema
 */
export const validate = (validations: ValidationChain[]) => {
  return (async (req: Request, res: Response, next: NextFunction) => {
    try {
      await Promise.all(validations.map(validation => validation.run(req)));
      const errors = validationResult(req);
      
      if (errors.isEmpty()) {
        return next();
      }

      return res.status(400).json({
        success: false,
        errors: errors.array().map((err: ExpressValidationError) => ({
          field: err.param,
          message: err.msg,
        })),
      });
    } catch (error) {
      next(error);
    }
  }) as RequestHandler;
};

/**
 * Middleware to check for validation errors
 */
export const checkValidation = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map((err: ExpressValidationError) => ({
        field: err.param,
        message: err.msg,
      })),
    });
  }
  next();
};
