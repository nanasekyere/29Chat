import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ChatUser, AppError } from '@29chat/common';


const excludedPaths = ['auth'];

export const jwtAuth = (req: Request, res: Response, next: NextFunction) => {
  const isPublic = excludedPaths.some((path) => req.path.startsWith('/api/' + path));
  if (isPublic) {
    return next();
  }

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = decoded as ChatUser;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(AppError.create('Unauthorized', 401));
    }
  }
};
