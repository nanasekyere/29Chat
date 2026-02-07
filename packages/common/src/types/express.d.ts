import type { JWTPayload } from './auth.types';

declare global {
  namespace Express {
    interface User extends JWTPayload {}

    interface Request {
      user?: JWTPayload;
    }
  }
}

export {};
