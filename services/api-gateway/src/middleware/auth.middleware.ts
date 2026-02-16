import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWTPayload, AppError } from '@29chat/common';


const excludedPaths = ['auth/register', 'auth/login'];

export const jwtAuth = (req: Request, res: Response, next: NextFunction) => {
  const isPublic = excludedPaths.some((path) => req.path === '/api/' + path);
  if (isPublic) {
    return next();
  }

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    const user = decoded as JWTPayload;
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(AppError.create('Unauthorized', 401));
    }
  }
};
