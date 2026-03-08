import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  MOCK_USER_ID,
  MOCK_USER_ID_2,
  MOCK_SOCKET_ID,
  MOCK_SOCKET_ID_2,
} from '../../helpers/mocks';
import { SocketService } from '../../../src/services/socket.service';

describe('socket service', () => {
  let service: SocketService;

  beforeEach(() => {
    service = SocketService.getInstance();
  });

  afterEach(() => {
    service.closeSocket();
  })
  
  describe('addConnection', () => {
    it('tracks a user-socket mapping', () => {
      service.addConnection(MOCK_USER_ID, MOCK_SOCKET_ID);

      expect(service.getSocketIds(MOCK_USER_ID)).toContain(MOCK_SOCKET_ID);
    });

    it('supports multiple sockets per user (multi-device)', () => {
      service.addConnection(MOCK_USER_ID, MOCK_SOCKET_ID);
      service.addConnection(MOCK_USER_ID, MOCK_SOCKET_ID_2);

      const sockets = service.getSocketIds(MOCK_USER_ID);
      expect(sockets).toHaveLength(2);
      expect(sockets).toContain(MOCK_SOCKET_ID);
      expect(sockets).toContain(MOCK_SOCKET_ID_2);
    });

    it('tracks different users independently', () => {
      service.addConnection(MOCK_USER_ID, MOCK_SOCKET_ID);
      service.addConnection(MOCK_USER_ID_2, MOCK_SOCKET_ID_2);

      expect(service.getSocketIds(MOCK_USER_ID)).toEqual([MOCK_SOCKET_ID]);
      expect(service.getSocketIds(MOCK_USER_ID_2)).toEqual([MOCK_SOCKET_ID_2]);
    });
  });

  describe('removeConnection', () => {
    it('removes a specific socket for a user', () => {
      service.addConnection(MOCK_USER_ID, MOCK_SOCKET_ID);
      service.addConnection(MOCK_USER_ID, MOCK_SOCKET_ID_2);

      service.removeConnection(MOCK_USER_ID, MOCK_SOCKET_ID);

      const sockets = service.getSocketIds(MOCK_USER_ID);
      expect(sockets).toHaveLength(1);
      expect(sockets).toContain(MOCK_SOCKET_ID_2);
    });

    it('cleans up user entry when last socket is removed', () => {
      service.addConnection(MOCK_USER_ID, MOCK_SOCKET_ID);

      service.removeConnection(MOCK_USER_ID, MOCK_SOCKET_ID);

      expect(service.getSocketIds(MOCK_USER_ID)).toEqual([]);
      expect(service.isOnline(MOCK_USER_ID)).toBe(false);
    });

    it('is a no-op for unknown userId', () => {
      expect(() =>
        service.removeConnection('nonexistent', MOCK_SOCKET_ID)
      ).not.toThrow();
    });

    it('is a no-op for unknown socketId', () => {
      service.addConnection(MOCK_USER_ID, MOCK_SOCKET_ID);

      service.removeConnection(MOCK_USER_ID, 'unknown-socket');

      expect(service.getSocketIds(MOCK_USER_ID)).toEqual([MOCK_SOCKET_ID]);
    });
  });

  describe('getSocketIds', () => {
    it('returns empty array for untracked user', () => {
      expect(service.getSocketIds('unknown-user')).toEqual([]);
    });

    it('returns all socket IDs for a connected user', () => {
      service.addConnection(MOCK_USER_ID, MOCK_SOCKET_ID);
      service.addConnection(MOCK_USER_ID, MOCK_SOCKET_ID_2);

      expect(service.getSocketIds(MOCK_USER_ID)).toEqual(
        expect.arrayContaining([MOCK_SOCKET_ID, MOCK_SOCKET_ID_2])
      );
    });
  });

  describe('isOnline', () => {
    it('returns false for untracked user', () => {
      expect(service.isOnline(MOCK_USER_ID)).toBe(false);
    });

    it('returns true when user has at least one connection', () => {
      service.addConnection(MOCK_USER_ID, MOCK_SOCKET_ID);

      expect(service.isOnline(MOCK_USER_ID)).toBe(true);
    });

    it('returns false after all connections are removed', () => {
      service.addConnection(MOCK_USER_ID, MOCK_SOCKET_ID);
      service.removeConnection(MOCK_USER_ID, MOCK_SOCKET_ID);

      expect(service.isOnline(MOCK_USER_ID)).toBe(false);
    });
  });

  describe('getOnlineUsers', () => {
    it('returns empty array when no users connected', () => {
      expect(service.getOnlineUsers()).toEqual([]);
    });

    it('returns all user IDs with active connections', () => {
      service.addConnection(MOCK_USER_ID, MOCK_SOCKET_ID);
      service.addConnection(MOCK_USER_ID_2, MOCK_SOCKET_ID_2);

      const online = service.getOnlineUsers();
      expect(online).toHaveLength(2);
      expect(online).toContain(MOCK_USER_ID);
      expect(online).toContain(MOCK_USER_ID_2);
    });

    it('excludes users who have fully disconnected', () => {
      service.addConnection(MOCK_USER_ID, MOCK_SOCKET_ID);
      service.addConnection(MOCK_USER_ID_2, MOCK_SOCKET_ID_2);

      service.removeConnection(MOCK_USER_ID_2, MOCK_SOCKET_ID_2);

      expect(service.getOnlineUsers()).toEqual([MOCK_USER_ID]);
    });
  });
});
