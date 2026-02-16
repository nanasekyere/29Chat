import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '@29chat/common';
import { errorMiddleware } from '../../../src/middleware/error.middleware';

function createMockRes(): Response {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

describe('errorMiddleware', () => {
  const req = {} as Request;
  const next = vi.fn() as NextFunction;
  let res: Response;
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
    res = createMockRes();
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('AppError', () => {
    it('responds with statusCode and message', () => {
      const err = new AppError('Not found', 404);

      errorMiddleware(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Not found' });
    });

    it('handles 409 conflict', () => {
      const err = new AppError('Email already registered', 409);

      errorMiddleware(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ message: 'Email already registered' });
    });

    it('handles 401 unauthorized', () => {
      const err = new AppError('Unauthorized', 401);

      errorMiddleware(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('JWT errors', () => {
    it('responds with 401 and "Token expired" for TokenExpiredError', () => {
      const err = new jwt.TokenExpiredError('jwt expired', new Date());

      errorMiddleware(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Token expired' });
    });

    it('responds with 401 and "Invalid token" for JsonWebTokenError', () => {
      const err = new jwt.JsonWebTokenError('invalid signature');

      errorMiddleware(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid token' });
    });
  });

  describe('generic Error', () => {
    it('responds with 500 and error message in development', () => {
      process.env.NODE_ENV = 'development';
      const err = new Error('db connection failed');

      errorMiddleware(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'db connection failed' });
    });

    it('responds with 500 and generic message in production', () => {
      process.env.NODE_ENV = 'production';
      const err = new Error('db connection failed');

      errorMiddleware(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error' });
    });
  });
});
