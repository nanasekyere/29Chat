import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { AppError } from '@29chat/common';
import { errorMiddleware } from '../../../src/middleware/error.middleware';

vi.mock('../../../src/utils/logger', () => ({
  default: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import logger from '../../../src/utils/logger';

function createMockRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
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

  describe('AppError handling', () => {
    it('responds with the AppError statusCode and message', () => {
      const err = new AppError('Not found', 404);

      errorMiddleware(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Not found' });
    });

    it('logs with logger.warn', () => {
      const err = new AppError('Forbidden', 403);

      errorMiddleware(err, req, res, next);

      expect(logger.warn).toHaveBeenCalledWith('App error', {
        statusCode: 403,
        message: 'Forbidden',
      });
    });
  });

  describe('generic Error handling', () => {
    it('responds with 500 and the error message in development', () => {
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

    it('logs with logger.error including stack trace', () => {
      const err = new Error('something broke');

      errorMiddleware(err, req, res, next);

      expect(logger.error).toHaveBeenCalledWith('Unhandled error', {
        error: 'something broke',
        stack: expect.any(String),
      });
    });
  });
});
