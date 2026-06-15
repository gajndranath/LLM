import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError";
import { env } from "../config/env";

/**
 * Centralized error handling middleware
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = err;

  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || "Something went wrong";
    error = new ApiError(statusCode, message, error?.errors || []);
  }

  // Log securely without dumping the entire error object which might contain sensitive credentials
  console.error(`❌ [Server Error] ${req.method} ${req.url}:`, error.message);

  const response = {
    success: false,
    statusCode: error.statusCode,
    message: error.message,
    errors: error.errors || [],
    // Removed stack trace from payload to prevent any potential credentials leak
  };

  return res.status(error.statusCode).json(response);
};
