import { Request, Response, NextFunction } from 'express';
import { AppError } from '@29chat/common';
import logger from '../utils/logger';

export const errorMiddleware = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    logger.warn('App error', { statusCode: err.statusCode, message: err.message });
    res.status(err.statusCode).json({ message: err.message });
    return;
  }

  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  const statusCode = 500;
  const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
  res.status(statusCode).json({ message });
};
