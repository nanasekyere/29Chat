import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockUser } from '../helpers/mocks';

vi.mock('@29chat/database', () => ({
  usersQueries: {
    getUserByEmail: vi.fn(),
    getUserById: vi.fn(),
  },
}));

vi.mock('bcrypt', () => ({
  default: {
    compare: vi.fn(),
  },
}));

import { usersQueries } from '@29chat/database';
import bcrypt from 'bcrypt';
import passport from '../../src/passport';

const mockGetUserByEmail = vi.mocked(usersQueries.getUserByEmail);
const mockGetUserById = vi.mocked(usersQueries.getUserById);
const mockCompare = vi.mocked(bcrypt.compare);

describe('passport strategies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
  });

  describe('local strategy', () => {
    // Access the strategy's verify function directly
    const localStrategy = (passport as any)._strategy('local');

    it('returns user when email exists and password matches', () => {
      return new Promise<void>((resolve) => {
        const user = createMockUser();
        mockGetUserByEmail.mockResolvedValue(user);
        mockCompare.mockResolvedValue(true as any);

        localStrategy._verify('test@example.com', 'password123', (err: any, result: any) => {
          expect(err).toBeNull();
          expect(result).toEqual(user);
          resolve();
        });
      });
    });

    it('returns false with message when email not found', () => {
      return new Promise<void>((resolve) => {
        mockGetUserByEmail.mockResolvedValue(null);

        localStrategy._verify('nobody@example.com', 'password123', (err: any, result: any, info: any) => {
          expect(err).toBeNull();
          expect(result).toBe(false);
          expect(info.message).toBe('Invalid email or password');
          resolve();
        });
      });
    });

    it('returns false with message when password does not match', () => {
      return new Promise<void>((resolve) => {
        mockGetUserByEmail.mockResolvedValue(createMockUser());
        mockCompare.mockResolvedValue(false as any);

        localStrategy._verify('test@example.com', 'wrongpassword', (err: any, result: any, info: any) => {
          expect(err).toBeNull();
          expect(result).toBe(false);
          expect(info.message).toBe('Invalid email or password');
          resolve();
        });
      });
    });

    it('calls done(error) when getUserByEmail throws', () => {
      return new Promise<void>((resolve) => {
        const dbError = new Error('db down');
        mockGetUserByEmail.mockRejectedValue(dbError);

        localStrategy._verify('test@example.com', 'password123', (err: any) => {
          expect(err).toBe(dbError);
          resolve();
        });
      });
    });
  });

  describe('jwt strategy', () => {
    const jwtStrategy = (passport as any)._strategy('jwt');

    it('returns user when getUserById finds user', () => {
      return new Promise<void>((resolve) => {
        const user = createMockUser();
        mockGetUserById.mockResolvedValue(user);

        jwtStrategy._verify({ id: 'test-uuid' }, (err: any, result: any) => {
          expect(err).toBeNull();
          expect(result).toEqual(user);
          resolve();
        });
      });
    });

    it('returns false when user not found', () => {
      return new Promise<void>((resolve) => {
        mockGetUserById.mockResolvedValue(null);

        jwtStrategy._verify({ id: 'nonexistent' }, (err: any, result: any) => {
          expect(err).toBeNull();
          expect(result).toBe(false);
          resolve();
        });
      });
    });

    it('calls done(error) when getUserById throws', () => {
      return new Promise<void>((resolve) => {
        const dbError = new Error('db down');
        mockGetUserById.mockRejectedValue(dbError);

        jwtStrategy._verify({ id: 'test-uuid' }, (err: any) => {
          expect(err).toBe(dbError);
          resolve();
        });
      });
    });
  });
});
