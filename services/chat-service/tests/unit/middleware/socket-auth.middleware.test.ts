import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockSocket } from '../../helpers/mocks';

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn(),
  },
}));

import jwt from 'jsonwebtoken';
import { socketAuthMiddleware } from '../../../src/middleware/socket-auth.middleware';

const mockVerify = vi.mocked(jwt.verify);

describe('socket-auth middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
  });

  it('allows connection with valid JWT in auth.token', () => {
    const decoded = { id: 'user-uuid-1', email: 'test@example.com', name: 'Test User' };
    mockVerify.mockReturnValue(decoded as any);
    const socket = createMockSocket();
    const next = vi.fn();

    socketAuthMiddleware(socket as any, next);

    expect(mockVerify).toHaveBeenCalledWith('valid-jwt-token', 'test-secret');
    expect(next).toHaveBeenCalledWith();
  });

  it('attaches decoded user payload to socket.data', () => {
    const decoded = { id: 'user-uuid-1', email: 'test@example.com', name: 'Test User' };
    mockVerify.mockReturnValue(decoded as any);
    const socket = createMockSocket({ data: {} });
    const next = vi.fn();

    socketAuthMiddleware(socket as any, next);

    expect(socket.data.user).toEqual(decoded);
  });

  it('rejects connection with missing token', () => {
    const socket = createMockSocket({
      handshake: { auth: {} },
    });
    const next = vi.fn();

    socketAuthMiddleware(socket as any, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('Authentication'),
    }));
  });

  it('rejects connection with invalid token', () => {
    mockVerify.mockImplementation(() => {
      throw new Error('invalid signature');
    });
    const socket = createMockSocket({
      handshake: { auth: { token: 'bad-token' } },
    });
    const next = vi.fn();

    socketAuthMiddleware(socket as any, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('Authentication'),
    }));
  });

  it('rejects connection with expired token', () => {
    mockVerify.mockImplementation(() => {
      const err = new Error('jwt expired');
      err.name = 'TokenExpiredError';
      throw err;
    });
    const socket = createMockSocket({
      handshake: { auth: { token: 'expired-token' } },
    });
    const next = vi.fn();

    socketAuthMiddleware(socket as any, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('expired'),
    }));
  });
});
