import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { validateRequest } from '../../../src/middleware/validation.middleware';
import { authSchema } from '../../../src/validators/auth.validator';

function createMockReq(body: any): Request {
  return { body } as Request;
}

function createMockRes(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

describe('validateRequest(authSchema)', () => {
  const middleware = validateRequest(authSchema);

  it('calls next() when email and password are valid', () => {
    const req = createMockReq({ email: 'test@example.com', password: 'password123' });
    const res = createMockRes();
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 400 with field errors when email is invalid', () => {
    const req = createMockReq({ email: 'not-an-email', password: 'password123' });
    const res = createMockRes();
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: expect.arrayContaining([
        expect.objectContaining({ message: expect.stringContaining('email') }),
      ]),
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 with field errors when password is shorter than 8 chars', () => {
    const req = createMockReq({ email: 'test@example.com', password: 'short' });
    const res = createMockRes();
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: expect.arrayContaining([
        expect.objectContaining({ message: expect.stringContaining('password') }),
      ]),
    });
  });

  it('returns 400 when email is missing', () => {
    const req = createMockReq({ password: 'password123' });
    const res = createMockRes();
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 when password is missing', () => {
    const req = createMockReq({ email: 'test@example.com' });
    const res = createMockRes();
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 with multiple field errors when both are invalid', () => {
    const req = createMockReq({ email: 'bad', password: 'short' });
    const res = createMockRes();
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    const jsonCall = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(jsonCall.message.length).toBeGreaterThanOrEqual(2);
  });
});
