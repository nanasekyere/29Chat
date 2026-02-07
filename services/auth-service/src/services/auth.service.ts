import { ChatUser, AppError } from '@29chat/common';
import bcrypt from 'bcrypt';
import { users } from '../app';
import { createToken } from './token.service';

export async function register({
  email,
  password,
  name,
}: {
  email: string;
  password: string;
  name: string;
}) {
  if (users.find((user) => user.email === email)) {
    throw new AppError('Email already registered', 409);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user: ChatUser = {
    id: crypto.randomUUID(),
    email,
    password: hashedPassword,
    name,
    status: 'online',
    lastActive: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  users.push(user);

  const token = createToken(user);
  const { password: _, ...sanitizedUser } = user;

  return { user: sanitizedUser, token };
}
