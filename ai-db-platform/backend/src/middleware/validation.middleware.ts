import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ApiError } from '../utils/ApiError';

/**
 * Express middleware to validate request body using a Zod schema
 */
export const validateRequest = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.issues.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        const firstMessage = details[0] 
          ? `[${details[0].field}] ${details[0].message}` 
          : 'Validation failed';
        next(new ApiError(400, `Request Validation Error: ${firstMessage}`, details));
      } else {
        next(error);
      }
    }
  };
};
