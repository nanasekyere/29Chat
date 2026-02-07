import { ChatUser } from '@29chat/common';
import jwt from 'jsonwebtoken';

export function createToken(user: ChatUser): string {
  const payload = { id: user.id, email: user.email };
  const secret = process.env.JWT_SECRET || 'secret';
  const expiresIn = (process.env.JWT_EXPIRES_IN || '1h') as jwt.SignOptions['expiresIn'];

  return jwt.sign(payload, secret, { expiresIn });
}
