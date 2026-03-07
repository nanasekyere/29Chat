import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockSocket } from '../../helpers/mocks';
import { socketRateLimit } from '../../../src/middleware/rate-limit.middleware';

describe('socketRateLimit middleware', () => {
  let next: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    next = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows events under the rate limit threshold', () => {
    const socket = createMockSocket();
    const rateLimiter = socketRateLimit({ maxEvents: 5, windowMs: 1000 });

    rateLimiter(socket as any, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('rejects events that exceed the rate limit', () => {
    const socket = createMockSocket();
    const rateLimiter = socketRateLimit({ maxEvents: 3, windowMs: 1000 });

    // Use up the limit
    for (let i = 0; i < 3; i++) {
      rateLimiter(socket as any, vi.fn());
    }

    // This one should be rejected
    rateLimiter(socket as any, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(next.mock.calls[0][0].message).toMatch(/rate limit/i);
  });

  it('resets the counter after the time window expires', () => {
    const socket = createMockSocket();
    const rateLimiter = socketRateLimit({ maxEvents: 2, windowMs: 1000 });

    // Use up the limit
    rateLimiter(socket as any, vi.fn());
    rateLimiter(socket as any, vi.fn());

    // Advance past window
    vi.advanceTimersByTime(1001);

    // Should be allowed again
    rateLimiter(socket as any, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('tracks rate per socket, not globally', () => {
    const socket1 = createMockSocket({ id: 'socket-1' });
    const socket2 = createMockSocket({ id: 'socket-2' });
    const rateLimiter = socketRateLimit({ maxEvents: 2, windowMs: 1000 });

    // Use up limit for socket1
    rateLimiter(socket1 as any, vi.fn());
    rateLimiter(socket1 as any, vi.fn());

    // socket2 should still be allowed
    rateLimiter(socket2 as any, next);

    expect(next).toHaveBeenCalledWith();
  });
});
