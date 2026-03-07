import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockSocket, MOCK_USER_ID } from '../../helpers/mocks';

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn(),
  },
}));

import jwt from 'jsonwebtoken';
import { socketAuth } from '../../../src/middleware/socket-auth.middleware';

const mockVerify = vi.mocked(jwt.verify);

describe('socketAuth middleware', () => {
  let next: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
    next = vi.fn();
  });

  it('calls next() and sets socket.data.userId when token is valid', () => {
    const socket = createMockSocket({ data: {} });
    mockVerify.mockReturnValue({ id: MOCK_USER_ID } as any);

    socketAuth(socket as any, next);

    expect(mockVerify).toHaveBeenCalledWith('valid-jwt-token', 'test-secret');
    expect(socket.data.userId).toBe(MOCK_USER_ID);
    expect(next).toHaveBeenCalledWith();
  });

  it('calls next(Error) when no token is provided in handshake', () => {
    const socket = createMockSocket({
      handshake: { auth: {}, headers: {} },
    });

    socketAuth(socket as any, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(next.mock.calls[0][0].message).toMatch(/token/i);
  });

  it('calls next(Error) when token verification fails', () => {
    const socket = createMockSocket();
    mockVerify.mockImplementation(() => {
      throw new Error('invalid signature');
    });

    socketAuth(socket as any, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('calls next(Error) when token is expired', () => {
    const socket = createMockSocket();
    const expiredError = new Error('jwt expired');
    expiredError.name = 'TokenExpiredError';
    mockVerify.mockImplementation(() => {
      throw expiredError;
    });

    socketAuth(socket as any, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  it('falls back to authorization header if handshake.auth.token is missing', () => {
    const socket = createMockSocket({
      data: {},
      handshake: {
        auth: {},
        headers: { authorization: 'Bearer header-jwt-token' },
      },
    });
    mockVerify.mockReturnValue({ id: MOCK_USER_ID } as any);

    socketAuth(socket as any, next);

    expect(mockVerify).toHaveBeenCalledWith('header-jwt-token', 'test-secret');
    expect(socket.data.userId).toBe(MOCK_USER_ID);
    expect(next).toHaveBeenCalledWith();
  });
});
