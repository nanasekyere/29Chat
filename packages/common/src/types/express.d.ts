import type { ChatUser } from './user.types';

declare global {
  namespace Express {
    interface User extends ChatUser {}

    interface Request {
      user?: ChatUser;
    }
  }
}

export {};
