import { Request, Response, NextFunction } from "express";

/**
 * Async Handler to wrap controller functions and catch errors automatically
 */
export const asyncHandler = (requestHandler: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};
