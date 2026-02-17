import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { validateRequest, validateRefreshToken } from '../../../src/middleware/validation.middleware';
import { authSchema } from '../../../src/validators/auth.validator';
import { AppError } from '@29chat/common';
import * as tokenService from '../../../src/services/token.service';

vi.mock('../../../src/services/token.service');

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

describe('validateRefreshToken', () => {
  const mockedVerify = vi.mocked(tokenService.verifyRefreshToken);
  const mockedIsValid = vi.mocked(tokenService.isRefreshTokenValid);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls next with AppError when refreshToken is missing', async () => {
    const req = createMockReq({});
    const res = createMockRes();
    const next = vi.fn();

    await validateRefreshToken(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Refresh token required', statusCode: 401 }),
    );
  });

  it('sets req.user and calls next() when token is valid', async () => {
    mockedVerify.mockReturnValue({ id: 'user-123' });
    mockedIsValid.mockResolvedValue(true);

    const req = createMockReq({ refreshToken: 'valid-token' });
    const res = createMockRes();
    const next = vi.fn();

    await validateRefreshToken(req, res, next);

    expect(mockedVerify).toHaveBeenCalledWith('valid-token');
    expect(mockedIsValid).toHaveBeenCalledWith('user-123', 'valid-token');
    expect(req.user).toEqual({ id: 'user-123' });
    expect(next).toHaveBeenCalledWith();
  });

  it('calls next with AppError when verifyRefreshToken throws', async () => {
    mockedVerify.mockImplementation(() => {
      throw new AppError('Invalid refresh token', 401);
    });

    const req = createMockReq({ refreshToken: 'expired-token' });
    const res = createMockRes();
    const next = vi.fn();

    await validateRefreshToken(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Invalid refresh token', statusCode: 401 }),
    );
  });

  it('calls next with AppError when refresh token is revoked', async () => {
    mockedVerify.mockReturnValue({ id: 'user-123' });
    mockedIsValid.mockResolvedValue(false);

    const req = createMockReq({ refreshToken: 'revoked-token' });
    const res = createMockRes();
    const next = vi.fn();

    await validateRefreshToken(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Refresh token revoked', statusCode: 401 }),
    );
  });
});
