import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import cookieSignature from 'cookie-signature';
import { createMockUser } from '../helpers/mocks';

// Mock database
vi.mock('@29chat/database', () => ({
  usersQueries: {
    getUserByEmail: vi.fn(),
    getUserById: vi.fn(),
    createUser: vi.fn(),
  },
  refreshTokensQueries: {
    saveRefreshToken: vi.fn(),
    findRefreshToken: vi.fn(),
    deleteRefreshToken: vi.fn(),
    deleteRefreshTokenByUserId: vi.fn(),
  },
}));

import { usersQueries, refreshTokensQueries } from '@29chat/database';
import app from '../../src/app';

const mockGetUserByEmail = vi.mocked(usersQueries.getUserByEmail);
const mockCreateUser = vi.mocked(usersQueries.createUser);
const mockGetUserById = vi.mocked(usersQueries.getUserById);
const mockFindRefreshToken = vi.mocked(refreshTokensQueries.findRefreshToken);
const mockDeleteRefreshToken = vi.mocked(refreshTokensQueries.deleteRefreshToken);
const mockSaveRefreshToken = vi.mocked(refreshTokensQueries.saveRefreshToken);
const mockDeleteRefreshTokenByUserId = vi.mocked(refreshTokensQueries.deleteRefreshTokenByUserId);

const COOKIE_SECRET = 'test-cookie-secret';

function signedCookieHeader(name: string, value: string): string {
  return `${name}=s:${cookieSignature.sign(value, COOKIE_SECRET)}`;
}

describe('auth routes', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.JWT_EXPIRES_IN = '1h';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';
    process.env.COOKIE_SECRET = COOKIE_SECRET;
    vi.clearAllMocks();
  });

  describe('POST /register', () => {
    it('201 - creates user, returns { user, token } and sets refreshToken cookie', async () => {
      mockGetUserByEmail.mockResolvedValue(null);
      mockCreateUser.mockResolvedValue(createMockUser() as any);
      mockSaveRefreshToken.mockResolvedValue(undefined as any);

      const res = await request(app)
        .post('/register')
        .send({ email: 'new@example.com', password: 'password123', name: 'New User' });

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('test@example.com');
      expect(res.body.user).not.toHaveProperty('password');
      expect(res.body.token).toBeDefined();
      expect(res.body.refreshToken).toBeUndefined();
      expect(res.headers['set-cookie']).toBeDefined();
      expect(([] as string[]).concat(res.headers['set-cookie']).some((c) => c.startsWith('refreshToken='))).toBe(true);
    });

    it('409 - returns error when email already registered', async () => {
      mockGetUserByEmail.mockResolvedValue(createMockUser());

      const res = await request(app)
        .post('/register')
        .send({ email: 'existing@example.com', password: 'password123', name: 'User' });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe('Email already registered');
    });

    it('400 - returns validation errors for invalid email', async () => {
      const res = await request(app)
        .post('/register')
        .send({ email: 'not-valid', password: 'password123' });

      expect(res.status).toBe(400);
    });

    it('400 - returns validation errors for short password', async () => {
      const res = await request(app)
        .post('/register')
        .send({ email: 'test@example.com', password: 'short' });

      expect(res.status).toBe(400);
    });

    it('400 - returns validation errors for missing fields', async () => {
      const res = await request(app)
        .post('/register')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('POST /login', () => {
    it('200 - returns { user, token } with no password and sets refreshToken cookie', async () => {
      const realHash = await bcrypt.hash('password123', 10);
      const user = createMockUser({ password: realHash });
      mockGetUserByEmail.mockResolvedValue(user);
      mockSaveRefreshToken.mockResolvedValue(undefined as any);

      const res = await request(app)
        .post('/login')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user).not.toHaveProperty('password');
      expect(res.body.token).toBeDefined();
      expect(res.body.refreshToken).toBeUndefined();
      expect(res.headers['set-cookie']).toBeDefined();
      expect(([] as string[]).concat(res.headers['set-cookie']).some((c) => c.startsWith('refreshToken='))).toBe(true);
    });

    it('401 - returns error for wrong email', async () => {
      mockGetUserByEmail.mockResolvedValue(null);

      const res = await request(app)
        .post('/login')
        .send({ email: 'nobody@example.com', password: 'password123' });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('401 - returns error for wrong password', async () => {
      const realHash = await bcrypt.hash('correctpassword', 10);
      const user = createMockUser({ password: realHash });
      mockGetUserByEmail.mockResolvedValue(user);

      const res = await request(app)
        .post('/login')
        .send({ email: 'test@example.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('400 - returns validation errors for invalid email format', async () => {
      const res = await request(app)
        .post('/login')
        .send({ email: 'bad-email', password: 'password123' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /refresh', () => {
    const user = createMockUser();

    function createValidRefreshToken() {
      return jwt.sign(
        { id: user.id },
        process.env.JWT_REFRESH_SECRET!,
        { expiresIn: '7d' }
      );
    }

    it('200 - returns new access token and rotates refreshToken cookie', async () => {
      const refreshToken = createValidRefreshToken();
      mockFindRefreshToken.mockResolvedValue({ token: refreshToken } as any);
      mockGetUserById.mockResolvedValue(user);
      mockDeleteRefreshToken.mockResolvedValue(undefined as any);
      mockSaveRefreshToken.mockResolvedValue(undefined as any);

      const res = await request(app)
        .post('/refresh')
        .set('Cookie', signedCookieHeader('refreshToken', refreshToken))
        .set('x-user-id', user.id);

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.refreshToken).toBeUndefined();
      expect(([] as string[]).concat(res.headers['set-cookie']).some((c) => c.startsWith('refreshToken='))).toBe(true);
      expect(mockDeleteRefreshToken).toHaveBeenCalledWith(user.id, refreshToken);
      expect(mockSaveRefreshToken).toBeCalled();
    });

    it('401 - rejects when no refresh token cookie', async () => {
      const res = await request(app)
        .post('/refresh')
        .set('x-user-id', user.id);

      expect(res.status).toBe(401);
    });

    it('401 - rejects when token is not found in DB (expired or revoked)', async () => {
      const token = createValidRefreshToken();
      mockFindRefreshToken.mockResolvedValue(null as any);

      const res = await request(app)
        .post('/refresh')
        .set('Cookie', signedCookieHeader('refreshToken', token))
        .set('x-user-id', user.id);

      expect(res.status).toBe(401);
    });
  });

  describe('POST /logout', () => {
    it('204 - revokes all refresh tokens for the user', async () => {
      const user = createMockUser();
      mockDeleteRefreshTokenByUserId.mockResolvedValue(undefined as any);

      const res = await request(app)
        .post('/logout')
        .set('x-user-id', user.id);

      expect(res.status).toBe(204);
      expect(mockDeleteRefreshTokenByUserId).toHaveBeenCalledWith(user.id);
    });
  });
});
