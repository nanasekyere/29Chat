import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockSocket, createMockIo, createMockRoom } from '../../helpers/mocks';

vi.mock('../../../src/services/room.service', () => ({
  getRoomsByUserId: vi.fn(),
}));

vi.mock('@29chat/database', () => ({
  usersQueries: {
    updateUser: vi.fn(),
  },
}));

import { getRoomsByUserId } from '../../../src/services/room.service';
import { usersQueries } from '@29chat/database';
import { registerPresenceHandlers } from '../../../src/handlers/presence.handler';

const mockGetRoomsByUserId = vi.mocked(getRoomsByUserId);
const mockUpdateUser = vi.mocked(usersQueries.updateUser);

describe('presence handler', () => {
  let socket: ReturnType<typeof createMockSocket>;
  let io: ReturnType<typeof createMockIo>;
  let handlers: Record<string, Function>;

  beforeEach(() => {
    vi.clearAllMocks();
    socket = createMockSocket();
    io = createMockIo();
    handlers = {};

    socket.on = vi.fn((event: string, handler: Function) => {
      handlers[event] = handler;
    }) as any;
  });

  describe('connection', () => {
    it('broadcasts user_online to all rooms user belongs to', async () => {
      const rooms = [
        createMockRoom({ id: 'room-1' }),
        createMockRoom({ id: 'room-2' }),
      ];
      mockGetRoomsByUserId.mockResolvedValue(rooms);

      await registerPresenceHandlers(io as any, socket as any);

      // Should join all room channels
      expect(socket.join).toHaveBeenCalledWith('room-1');
      expect(socket.join).toHaveBeenCalledWith('room-2');

      // Should broadcast user_online to each room
      expect(io.to).toHaveBeenCalledWith('room-1');
      expect(io.to).toHaveBeenCalledWith('room-2');
      expect(io.emit).toHaveBeenCalledWith('user_online', {
        userId: 'user-uuid-1',
      });
    });
  });

  describe('disconnect', () => {
    it('broadcasts user_offline and updates lastActive', async () => {
      const rooms = [createMockRoom({ id: 'room-1' })];
      mockGetRoomsByUserId.mockResolvedValue(rooms);
      mockUpdateUser.mockResolvedValue(undefined as any);

      await registerPresenceHandlers(io as any, socket as any);

      // Trigger disconnect
      await handlers['disconnect']();

      expect(io.to).toHaveBeenCalledWith('room-1');
      expect(io.emit).toHaveBeenCalledWith('user_offline', {
        userId: 'user-uuid-1',
      });
      expect(mockUpdateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'user-uuid-1',
          lastActive: expect.any(Date),
        })
      );
    });
  });

  describe('multi-connection edge cases', () => {
    it('only emits user_offline when ALL connections from same user close', async () => {
      // This test defines the expected behavior for connection tracking.
      // The presence handler should track connection count per user.
      const rooms = [createMockRoom({ id: 'room-1' })];
      mockGetRoomsByUserId.mockResolvedValue(rooms);

      // Simulate two connections from same user
      const socket1 = createMockSocket({ id: 'socket-1' });
      const socket2 = createMockSocket({ id: 'socket-2' });
      const handlers1: Record<string, Function> = {};
      const handlers2: Record<string, Function> = {};

      socket1.on = vi.fn((event: string, handler: Function) => {
        handlers1[event] = handler;
      }) as any;
      socket2.on = vi.fn((event: string, handler: Function) => {
        handlers2[event] = handler;
      }) as any;

      await registerPresenceHandlers(io as any, socket1 as any);
      await registerPresenceHandlers(io as any, socket2 as any);

      vi.clearAllMocks();
      mockGetRoomsByUserId.mockResolvedValue(rooms);

      // First disconnect — should NOT broadcast user_offline
      await handlers1['disconnect']();
      expect(io.emit).not.toHaveBeenCalledWith('user_offline', expect.anything());

      // Second disconnect — NOW should broadcast user_offline
      await handlers2['disconnect']();
      expect(io.emit).toHaveBeenCalledWith('user_offline', { userId: 'user-uuid-1' });
    });

    it('does not re-broadcast user_online if user already online in room', async () => {
      const rooms = [createMockRoom({ id: 'room-1' })];
      mockGetRoomsByUserId.mockResolvedValue(rooms);

      const socket1 = createMockSocket({ id: 'socket-1' });
      socket1.on = vi.fn() as any;
      await registerPresenceHandlers(io as any, socket1 as any);

      const onlineCalls = (io.emit as any).mock.calls.filter(
        (call: any[]) => call[0] === 'user_online'
      ).length;

      vi.clearAllMocks();
      mockGetRoomsByUserId.mockResolvedValue(rooms);

      const socket2 = createMockSocket({ id: 'socket-2' });
      socket2.on = vi.fn() as any;
      await registerPresenceHandlers(io as any, socket2 as any);

      // Should NOT emit user_online again for same user
      expect(io.emit).not.toHaveBeenCalledWith('user_online', expect.anything());
    });
  });
});
