import { Request, Response, NextFunction, RequestHandler, RequestHandler as ExpressRequestHandler } from 'express';

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown> | unknown;

/**
 * Wraps an async middleware function to ensure proper error handling
 * @param handler The async middleware function to wrap
 * @returns A new middleware function with proper error handling
 */
export const wrapMiddleware = (
  handler: AsyncRequestHandler
): ExpressRequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = handler(req, res, next);
      
      // Handle if the handler returns a promise
      if (result && typeof (result as Promise<unknown>).then === 'function') {
        (result as Promise<unknown>).catch(next);
      }
      
      // Don't return anything to avoid the "not all code paths return a value" error
      return undefined;
    } catch (error) {
      next(error);
      return undefined;
    }
  };
};

/**
 * Combines multiple middleware functions into a single middleware function
 * @param middlewares Array of middleware functions to combine
 * @returns A single middleware function that runs all provided middlewares in sequence
 */
export const combineMiddlewares = (
  ...middlewares: ExpressRequestHandler[]
): ExpressRequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    let i = 0;
    
    const runNext = (err?: unknown) => {
      if (err) return next(err);
      
      const middleware = middlewares[i++];
      if (!middleware) return next();
      
      try {
        const result = middleware(req, res, runNext);
        
        // Handle if the middleware returns a promise
        if (result && typeof (result as Promise<unknown>).then === 'function') {
          (result as Promise<unknown>).catch(next);
        }
        
        return undefined;
      } catch (error) {
        next(error);
        return undefined;
      }
    };
    
    runNext();
  };
};
