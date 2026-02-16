import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '@29chat/common';
import { createMockUser } from '../../helpers/mocks';

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn().mockReturnValue('signed-token'),
    verify: vi.fn(),
  },
}));

import jwt from 'jsonwebtoken';
import {
  createAccessToken,
  createRefreshToken,
  verifyToken,
  verifyRefreshToken,
} from '../../../src/services/token.service';

const mockSign = vi.mocked(jwt.sign);
const mockVerify = vi.mocked(jwt.verify);

describe('token service', () => {
  const user = createMockUser();

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.JWT_EXPIRES_IN = '1h';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';
    vi.clearAllMocks();
  });

  describe('createAccessToken', () => {
    it('signs with { id, email } payload, JWT_SECRET, and correct expiry', () => {
      createAccessToken(user);

      expect(mockSign).toHaveBeenCalledWith(
        { id: user.id, email: user.email },
        'test-secret',
        { expiresIn: '1h' }
      );
    });

    it('returns the signed token string', () => {
      mockSign.mockReturnValue('access-token-123' as any);

      const token = createAccessToken(user);

      expect(token).toBe('access-token-123');
    });

    it('falls back to "secret" when JWT_SECRET is undefined', () => {
      delete process.env.JWT_SECRET;

      createAccessToken(user);

      expect(mockSign).toHaveBeenCalledWith(
        expect.any(Object),
        'secret',
        expect.any(Object)
      );
    });
  });

  describe('createRefreshToken', () => {
    it('signs with { id, email } payload, JWT_REFRESH_SECRET, and 7d expiry', () => {
      createRefreshToken(user);

      expect(mockSign).toHaveBeenCalledWith(
        { id: user.id, email: user.email },
        'test-refresh-secret',
        { expiresIn: '7d' }
      );
    });

    it('returns the signed token string', () => {
      mockSign.mockReturnValue('refresh-token-123' as any);

      const token = createRefreshToken(user);

      expect(token).toBe('refresh-token-123');
    });
  });

  describe('verifyToken', () => {
    it('returns decoded JWTPayload when token is valid', () => {
      const payload = { id: 'user-1', email: 'a@b.com' };
      mockVerify.mockReturnValue(payload as any);

      const result = verifyToken('valid-token');

      expect(result).toEqual(payload);
      expect(mockVerify).toHaveBeenCalledWith('valid-token', 'test-secret');
    });

    it('throws AppError with 401 when jwt.verify throws', () => {
      mockVerify.mockImplementation(() => {
        throw new Error('invalid signature');
      });

      expect(() => verifyToken('bad-token')).toThrow(AppError);
      expect(() => verifyToken('bad-token')).toThrow('Invalid token');
    });
  });

  describe('verifyRefreshToken', () => {
    it('returns decoded JWTPayload when refresh token is valid', () => {
      const payload = { id: 'user-1', email: 'a@b.com' };
      mockVerify.mockReturnValue(payload as any);

      const result = verifyRefreshToken('valid-refresh');

      expect(result).toEqual(payload);
      expect(mockVerify).toHaveBeenCalledWith('valid-refresh', 'test-refresh-secret');
    });

    it('throws AppError with 401 when jwt.verify throws', () => {
      mockVerify.mockImplementation(() => {
        throw new Error('invalid signature');
      });

      expect(() => verifyRefreshToken('bad-token')).toThrow(AppError);
      expect(() => verifyRefreshToken('bad-token')).toThrow('Invalid refresh token');
    });
  });
});
