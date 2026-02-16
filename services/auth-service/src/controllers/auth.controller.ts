import { Request, Response, NextFunction } from 'express';
import passport from '../passport';
import { ChatUser } from '@29chat/common';
import * as authService from '../services/auth.service';
import * as tokenService from '../services/token.service';

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  const { email, password, name } = req.body;

  try {
    const { user, token, refreshToken } = await authService.register({ email, password, name });
    res.status(201).json({ user, token, refreshToken });
  } catch (error) {
    next(error);
  }
}

export function login(req: Request, res: Response, next: NextFunction): void {
  passport.authenticate('local', { session: false }, (err: Error | null, user: ChatUser | false) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ message: 'Invalid email or password' });

    const token = tokenService.createAccessToken(user);
    const refreshToken = tokenService.createRefreshToken(user);
    const { password: _, ...sanitizedUser } = user;
    res.status(200).json({ user: sanitizedUser, token, refreshToken });
  })(req, res, next);
}

export async function refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  
}
