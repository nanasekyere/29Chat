import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { AppError } from '../utils/errors';
import { createLogger } from '../utils/logger';

type Logger = Pick<ReturnType<typeof createLogger>, 'warn' | 'error'>;
type CustomErrorHandler = (err: Error, req: Request, res: Response) => boolean;

export const createErrorMiddleware = (
  service: string,
  customHandlers: CustomErrorHandler[] = [],
  logger?: Logger
): ErrorRequestHandler => {
  const log = logger ?? createLogger(service);

  return (err: Error, req: Request, res: Response, _next: NextFunction): void => {
    for (const handler of customHandlers) {
      if (handler(err, req, res)) return;
    }

    if (err instanceof AppError) {
      log.warn('App error', { statusCode: err.statusCode, message: err.message });
      res.status(err.statusCode).json({ message: err.message });
      return;
    }

    log.error('Unhandled error', { error: err.message, stack: err.stack });
    const statusCode = 500;
    const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
    res.status(statusCode).json({ message });
  };
};
