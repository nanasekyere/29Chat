import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '@29chat/common';
import { errorMiddleware } from '../../../src/middleware/error.middleware';

function createMockRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('error middleware', () => {
  const req = {} as any;
  const next = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns AppError statusCode and message', () => {
    const err = new AppError('Not found', 404);
    const res = createMockRes();

    errorMiddleware(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Not found' });
  });

  it('returns 400 for AppError with statusCode 400', () => {
    const err = new AppError('Bad request', 400);
    const res = createMockRes();

    errorMiddleware(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Bad request' });
  });

  it('returns 500 with error message in development', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const err = new Error('Something broke');
    const res = createMockRes();

    errorMiddleware(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Something broke' });
    process.env.NODE_ENV = originalEnv;
  });

  it('returns 500 with "Internal server error" in production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const err = new Error('Something broke');
    const res = createMockRes();

    errorMiddleware(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error' });
    process.env.NODE_ENV = originalEnv;
  });
});
