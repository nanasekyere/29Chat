import { AppError, ChatUser, JWTPayload } from '@29chat/common';
import jwt from 'jsonwebtoken';

export function createAccessToken(user: ChatUser): string {
  const payload: JWTPayload = { id: user.id, email: user.email };
  const secret = process.env.JWT_SECRET || 'secret';
  const expiresIn = (process.env.JWT_EXPIRES_IN || '1h') as jwt.SignOptions['expiresIn'];

  return jwt.sign(payload, secret, { expiresIn });
}

export function createRefreshToken(user: ChatUser): string {
  const payload: JWTPayload = { id: user.id, email: user.email };
  const secret = process.env.JWT_REFRESH_SECRET || 'secret';
  const expiresIn = (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'];

  return jwt.sign(payload, secret, { expiresIn });
}

export function verifyToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
  } catch (error) {
    throw new AppError('Invalid token', 401);
  }
}

export function verifyRefreshToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as JWTPayload;
  } catch (error) {
    throw new AppError('Invalid refresh token', 401);
  }
}

