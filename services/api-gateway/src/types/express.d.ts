import type { ChatUser } from "common";

declare global {
  namespace Express {
    interface User extends ChatUser {}

    interface Request {
      user?: ChatUser;
    }
  }
}

export {};
