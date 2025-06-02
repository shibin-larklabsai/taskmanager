import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain, ValidationError } from 'express-validator';

export const validateRequest = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((err: ValidationError) => {
        // Handle both standard and alternative validation errors
        if ('param' in err) {
          return {
            param: err.param,
            msg: err.msg,
            value: 'value' in err ? err.value : undefined,
          };
        }
        return {
          msg: err.msg,
        };
      }),
    });
  };
};

export default validateRequest;
