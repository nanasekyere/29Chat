import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { AppError } from '@29chat/common';

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn(),
  },
}));

import jwt from 'jsonwebtoken';
import { jwtAuth } from '../../../src/middleware/auth.middleware';

const mockVerify = vi.mocked(jwt.verify);

function createMockReq(overrides: Partial<Request> = {}): Request {
  return {
    path: '/api/chat/rooms',
    headers: {},
    ...overrides,
  } as Request;
}

function createMockRes(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

describe('jwtAuth', () => {
  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    res = createMockRes();
    next = vi.fn() as NextFunction;
    process.env.JWT_SECRET = 'test-secret';
    vi.clearAllMocks();
  });

  describe('public routes', () => {
    it('skips auth for /api/auth/login', () => {
      const req = createMockReq({ path: '/api/auth/login' });

      jwtAuth(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('skips auth for /api/auth/register', () => {
      const req = createMockReq({ path: '/api/auth/register' });

      jwtAuth(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('does NOT skip auth for /api/auth/logout', () => {
      const req = createMockReq({ path: '/api/auth/logout' });

      jwtAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('missing token', () => {
    it('returns 401 when no authorization header', () => {
      const req = createMockReq({ headers: {} });

      jwtAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
    });

    it('returns 401 when authorization header has no token after Bearer', () => {
      const req = createMockReq({
        headers: { authorization: 'Bearer ' },
      });

      jwtAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
    });
  });

  describe('valid token', () => {
    const payload = { id: 'user-123', email: 'test@test.com' };

    beforeEach(() => {
      mockVerify.mockReturnValue(payload as any);
    });

    it('attaches decoded user to req.user', () => {
      const req = createMockReq({
        headers: { authorization: 'Bearer valid-token' },
      });

      jwtAuth(req, res, next);

      expect(req.user).toEqual(payload);
    });

    it('sets x-user-id header from decoded payload', () => {
      const req = createMockReq({
        headers: { authorization: 'Bearer valid-token' },
      });

      jwtAuth(req, res, next);

      expect(req.headers['x-user-id']).toBe('user-123');
    });

    it('sets x-user-email header from decoded payload', () => {
      const req = createMockReq({
        headers: { authorization: 'Bearer valid-token' },
      });

      jwtAuth(req, res, next);

      expect(req.headers['x-user-email']).toBe('test@test.com');
    });

    it('calls next() with no arguments', () => {
      const req = createMockReq({
        headers: { authorization: 'Bearer valid-token' },
      });

      jwtAuth(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('invalid token', () => {
    it('calls next with 401 AppError when jwt.verify throws', () => {
      mockVerify.mockImplementation(() => {
        throw new Error('invalid signature');
      });
      const req = createMockReq({
        headers: { authorization: 'Bearer bad-token' },
      });

      jwtAuth(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = (next as ReturnType<typeof vi.fn>).mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Unauthorized');
    });

    it('forwards AppError directly when jwt.verify throws AppError', () => {
      const appError = new AppError('Token expired', 401);
      mockVerify.mockImplementation(() => {
        throw appError;
      });
      const req = createMockReq({
        headers: { authorization: 'Bearer expired-token' },
      });

      jwtAuth(req, res, next);

      expect(next).toHaveBeenCalledWith(appError);
    });
  });
});
