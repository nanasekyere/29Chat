import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockSocket } from '../../helpers/mocks';
import { registerTypingHandlers } from '../../../src/handlers/typing.handler';

describe('typing handler', () => {
  let socket: ReturnType<typeof createMockSocket>;
  let handlers: Record<string, Function>;

  beforeEach(() => {
    vi.clearAllMocks();
    socket = createMockSocket();
    handlers = {};

    socket.on = vi.fn((event: string, handler: Function) => {
      handlers[event] = handler;
    }) as any;

    registerTypingHandlers(socket as any);
  });

  describe('typing_start', () => {
    it('broadcasts user_typing to room excluding sender', () => {
      handlers['typing_start']({ roomId: 'room-uuid-1' });

      expect(socket.broadcast.to).toHaveBeenCalledWith('room-uuid-1');
      expect(socket.broadcast.emit).toHaveBeenCalledWith('user_typing', {
        userId: 'user-uuid-1',
        roomId: 'room-uuid-1',
      });
    });
  });

  describe('typing_stop', () => {
    it('broadcasts user_stopped_typing to room excluding sender', () => {
      handlers['typing_stop']({ roomId: 'room-uuid-1' });

      expect(socket.broadcast.to).toHaveBeenCalledWith('room-uuid-1');
      expect(socket.broadcast.emit).toHaveBeenCalledWith('user_stopped_typing', {
        userId: 'user-uuid-1',
        roomId: 'room-uuid-1',
      });
    });
  });
});
