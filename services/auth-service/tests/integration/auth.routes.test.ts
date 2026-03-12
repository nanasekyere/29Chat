import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
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

describe('auth routes', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.JWT_EXPIRES_IN = '1h';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';
    vi.clearAllMocks();
  });

  describe('POST /register', () => {
    it('201 - creates user and returns { user, token, refreshToken }', async () => {
      mockGetUserByEmail.mockResolvedValue(null);
      mockCreateUser.mockResolvedValue(createMockUser() as any);

      const res = await request(app)
        .post('/register')
        .send({ email: 'new@example.com', password: '$2b$10$hashedpassword', name: 'New User' });

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('test@example.com');
      expect(res.body.user).not.toHaveProperty('password');
      expect(res.body.token).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
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
    it('200 - returns { user, token, refreshToken } with no password', async () => {
      const realHash = await bcrypt.hash('password123', 10);
      const user = createMockUser({ password: realHash });
      mockGetUserByEmail.mockResolvedValue(user);

      const res = await request(app)
        .post('/login')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user).not.toHaveProperty('password');
      expect(res.body.token).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
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

    it('200 - returns new access token and rotated refresh token', async () => {
      const refreshToken = createValidRefreshToken();
      mockFindRefreshToken.mockResolvedValue({ token: refreshToken } as any);
      mockGetUserById.mockResolvedValue(user);
      mockDeleteRefreshToken.mockResolvedValue(undefined as any);
      mockSaveRefreshToken.mockResolvedValue(undefined as any);

      const res = await request(app)
        .post('/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      // expect rotation
      expect(mockDeleteRefreshToken).toHaveBeenCalledWith(user.id, refreshToken);
      expect(mockSaveRefreshToken).toBeCalled();
    });

    it('401 - rejects expired refresh token', async () => {
      const expiredToken = jwt.sign(
        { id: user.id },
        process.env.JWT_REFRESH_SECRET!,
        { expiresIn: '0s' }
      );

      const res = await request(app)
        .post('/refresh')
        .send({ refreshToken: expiredToken });

      expect(res.status).toBe(401);
    });

    it('401 - rejects invalid refresh token', async () => {
      const res = await request(app)
        .post('/refresh')
        .send({ refreshToken: 'totally-invalid-token' });

      expect(res.status).toBe(401);
    });

    it('401 - rejects refresh token not found in DB', async () => {
      const refreshToken = createValidRefreshToken();
      mockFindRefreshToken.mockResolvedValue(null as any);

      const res = await request(app)
        .post('/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /logout', () => {
    it('204 - invalidates refresh token in DB', async () => {
      const user = createMockUser();
      const refreshToken = jwt.sign(
        { id: user.id },
        process.env.JWT_REFRESH_SECRET!,
        { expiresIn: '7d' }
      );
      mockFindRefreshToken.mockResolvedValue({ token: refreshToken } as any);
      mockDeleteRefreshTokenByUserId.mockResolvedValue(undefined as any);

      const res = await request(app)
        .post('/logout')
        .send({ refreshToken });

      expect(res.status).toBe(204);
      expect(mockDeleteRefreshTokenByUserId).toHaveBeenCalledWith(user.id);
    });
  });
});
