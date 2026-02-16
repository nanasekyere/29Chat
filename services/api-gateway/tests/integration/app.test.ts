import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// Mock proxy middleware
vi.mock('../../src/middleware/proxy.middleware', () => {
  const { Router } = require('express');
  const router = Router();
  router.use('/auth', (_req: any, res: any) => res.json({ proxied: 'auth' }));
  router.use('/chat', (_req: any, res: any) => res.json({ proxied: 'chat' }));
  return { default: router };
});

// Mock logger
vi.mock('../../src/utils/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    log: vi.fn(),
    write: vi.fn(),
  },
}));

// Mock express-winston
vi.mock('express-winston', () => ({
  default: {
    logger: () => (_req: any, _res: any, next: any) => next(),
    errorLogger: () => (_req: any, _res: any, next: any) => next(),
  },
}));

import app from '../../src/app';

describe('app', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  describe('GET /health', () => {
    it('returns 200 with { message: "OK" }', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: 'OK' });
    });
  });

  describe('protected routes', () => {
    it('returns 401 for protected route without token', async () => {
      const res = await request(app).get('/api/chat/rooms');

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ message: 'Unauthorized' });
    });
  });

  describe('public auth routes', () => {
    it('allows /api/auth/login without token', async () => {
      const res = await request(app).post('/api/auth/login');

      // Should reach the proxy
      expect(res.status).not.toBe(401);
    });

    it('allows /api/auth/register without token', async () => {
      const res = await request(app).post('/api/auth/register');

      expect(res.status).not.toBe(401);
    });
  });
});
