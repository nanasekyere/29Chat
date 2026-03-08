import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createMockSocket,
  createMockIo,
  MOCK_USER_ID,
  MOCK_ROOM_ID,
  MOCK_ROOM_ID_2,
} from '../../helpers/mocks';

vi.mock('../../../src/services/room.service', () => ({
  getRoomsByUserId: vi.fn(),
}));

const mockRedis = vi.hoisted(() => ({
  publish: vi.fn().mockResolvedValue(1),
  subscribe: vi.fn().mockResolvedValue(undefined),
  on: vi.fn(),
}));

vi.mock('ioredis', () => ({
  default: class {
    publish = mockRedis.publish;
    subscribe = mockRedis.subscribe;
    on = mockRedis.on;
  },
}));

import * as roomService from '../../../src/services/room.service';
import { registerPresenceHandlers } from '../../../src/handlers/presence.handler';

const mockGetRoomsByUserId = vi.mocked(roomService.getRoomsByUserId);
const mockRedisPublish = vi.mocked(mockRedis.publish);

describe('presence handler', () => {
  let mockSocket: ReturnType<typeof createMockSocket>;
  let mockIo: ReturnType<typeof createMockIo>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket = createMockSocket();
    mockIo = createMockIo();
  });

  describe('user connect', () => {
    it('joins socket to all user rooms', async () => {
      const rooms = [
        { id: MOCK_ROOM_ID, name: 'General', type: 'group' as const, createdBy: MOCK_USER_ID, createdAt: new Date(), updatedAt: new Date() },
        { id: MOCK_ROOM_ID_2, name: 'Random', type: 'group' as const, createdBy: MOCK_USER_ID, createdAt: new Date(), updatedAt: new Date() },
      ];
      mockGetRoomsByUserId.mockResolvedValue(rooms);

      await registerPresenceHandlers(mockIo as any, mockSocket as any);

      expect(mockGetRoomsByUserId).toHaveBeenCalledWith(MOCK_USER_ID);
      expect(mockSocket.join).toHaveBeenCalledWith(MOCK_ROOM_ID);
      expect(mockSocket.join).toHaveBeenCalledWith(MOCK_ROOM_ID_2);
    });

    it('publishes user:connected event to Redis for the presence-service', async () => {
      const rooms = [
        { id: MOCK_ROOM_ID, name: 'General', type: 'group' as const, createdBy: MOCK_USER_ID, createdAt: new Date(), updatedAt: new Date() },
      ];
      mockGetRoomsByUserId.mockResolvedValue(rooms);

      await registerPresenceHandlers(mockIo as any, mockSocket as any);

      expect(mockRedisPublish).toHaveBeenCalledWith(
        'presence:events',
        JSON.stringify({ event: 'user:connected', userId: MOCK_USER_ID })
      );
    });
  });

  describe('disconnect', () => {
    it('publishes user:disconnected event to Redis for the presence-service', async () => {
      const rooms = [
        { id: MOCK_ROOM_ID, name: 'General', type: 'group' as const, createdBy: MOCK_USER_ID, createdAt: new Date(), updatedAt: new Date() },
      ];
      mockGetRoomsByUserId.mockResolvedValue(rooms);

      await registerPresenceHandlers(mockIo as any, mockSocket as any);

      const disconnectCall = mockSocket.on.mock.calls.find((c: any[]) => c[0] === 'disconnect');
      expect(disconnectCall).toBeDefined();

      const disconnectHandler = disconnectCall![1];

      vi.clearAllMocks();

      await disconnectHandler();

      expect(mockRedisPublish).toHaveBeenCalledWith(
        'presence:events',
        JSON.stringify({ event: 'user:disconnected', userId: MOCK_USER_ID })
      );
    });
  });

  describe('presence:status', () => {
    it('publishes status change to Redis and broadcasts to user rooms', async () => {
      const rooms = [
        { id: MOCK_ROOM_ID, name: 'General', type: 'group' as const, createdBy: MOCK_USER_ID, createdAt: new Date(), updatedAt: new Date() },
      ];
      mockGetRoomsByUserId.mockResolvedValue(rooms);

      await registerPresenceHandlers(mockIo as any, mockSocket as any);

      const statusCall = mockSocket.on.mock.calls.find((c: any[]) => c[0] === 'presence:status');
      expect(statusCall).toBeDefined();

      const statusHandler = statusCall![1];

      vi.clearAllMocks();
      mockGetRoomsByUserId.mockResolvedValue(rooms);

      await statusHandler({ status: 'away' });

      expect(mockRedisPublish).toHaveBeenCalledWith(
        'presence:events',
        JSON.stringify({ event: 'status:changed', userId: MOCK_USER_ID, status: 'away' })
      );
      expect(mockIo.to).toHaveBeenCalledWith(MOCK_ROOM_ID);
      expect(mockIo.to(MOCK_ROOM_ID).emit).toHaveBeenCalledWith('presence:status', {
        userId: MOCK_USER_ID,
        status: 'away',
      });
    });

    it('rejects invalid status values', async () => {
      const rooms = [
        { id: MOCK_ROOM_ID, name: 'General', type: 'group' as const, createdBy: MOCK_USER_ID, createdAt: new Date(), updatedAt: new Date() },
      ];
      mockGetRoomsByUserId.mockResolvedValue(rooms);

      await registerPresenceHandlers(mockIo as any, mockSocket as any);

      const statusCall = mockSocket.on.mock.calls.find((c: any[]) => c[0] === 'presence:status');
      const statusHandler = statusCall![1];
      const callback = vi.fn();

      vi.clearAllMocks();

      await statusHandler({ status: 'invalid-status' }, callback);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) })
      );
      expect(mockRedisPublish).not.toHaveBeenCalled();
    });
  });
});
