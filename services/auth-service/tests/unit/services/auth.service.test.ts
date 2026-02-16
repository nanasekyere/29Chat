import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '@29chat/common';
import { createMockUser } from '../../helpers/mocks';

vi.mock('@29chat/database', () => ({
  usersQueries: {
    getUserByEmail: vi.fn(),
    createUser: vi.fn(),
  },
}));

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2b$10$hashed'),
  },
}));

vi.mock('../../../src/services/token.service', () => ({
  createAccessToken: vi.fn().mockReturnValue('access-token'),
  createRefreshToken: vi.fn().mockReturnValue('refresh-token'),
}));

import { usersQueries } from '@29chat/database';
import bcrypt from 'bcrypt';
import { createAccessToken, createRefreshToken } from '../../../src/services/token.service';
import { register } from '../../../src/services/auth.service';

const mockGetUserByEmail = vi.mocked(usersQueries.getUserByEmail);
const mockCreateUser = vi.mocked(usersQueries.createUser);
const mockHash = vi.mocked(bcrypt.hash);

describe('auth service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserByEmail.mockResolvedValue(null);
    mockCreateUser.mockResolvedValue(undefined as any);
  });

  describe('register', () => {
    const input = { email: 'test@example.com', password: 'password123', name: 'Test User' };

    it('checks for existing user via getUserByEmail', async () => {
      await register(input);

      expect(mockGetUserByEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('throws AppError 409 when email already exists', async () => {
      mockGetUserByEmail.mockResolvedValue(createMockUser());

      await expect(register(input)).rejects.toThrow(AppError);
      await expect(register(input)).rejects.toThrow('Email already registered');
    });

    it('hashes password with bcrypt and salt rounds of 10', async () => {
      await register(input);

      expect(mockHash).toHaveBeenCalledWith('password123', 10);
    });

    it('calls createUser with a valid ChatUser object', async () => {
      await register(input);

      expect(mockCreateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          email: 'test@example.com',
          password: '$2b$10$hashed',
          name: 'Test User',
          status: 'online',
        })
      );
    });

    it('generates access and refresh tokens', async () => {
      await register(input);

      expect(createAccessToken).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'test@example.com' })
      );
      expect(createRefreshToken).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'test@example.com' })
      );
    });

    it('returns sanitized user (no password), token, and refreshToken', async () => {
      const result = await register(input);

      expect(result.user).not.toHaveProperty('password');
      expect(result.user.email).toBe('test@example.com');
      expect(result.token).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
    });

    it('throws 409 on DB unique constraint error (error with code property)', async () => {
      mockCreateUser.mockRejectedValue({ code: '23505' });

      await expect(register(input)).rejects.toThrow(AppError);
      await expect(register(input)).rejects.toThrow('Email already registered');
    });

    it('throws 500 on other DB errors', async () => {
      mockCreateUser.mockRejectedValue(new Error('connection lost'));

      await expect(register(input)).rejects.toThrow(AppError);
      await expect(register(input)).rejects.toThrow('Failed to create user');
    });
  });
});
