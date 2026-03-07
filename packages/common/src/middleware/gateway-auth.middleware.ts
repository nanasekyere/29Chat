import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

export const gatewayAuth = (req: Request, _res: Response, next: NextFunction) => {
  const userId = req.headers['x-user-id'] as string | undefined;
  if (!userId) {
    return next(new AppError('Missing x-user-id header', 401));
  }
  req.user = { id: userId };
  next();
};
