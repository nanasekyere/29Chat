import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockMessage, createMockMessages } from '../../helpers/mocks';

const mockRedisClient = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
}));

vi.mock('../../../src/config/redis', () => ({
  redis: mockRedisClient,
}));

import {
  getMessageCache,
  setMessageCache,
  getRoomMessagesCache,
  setRoomMessagesCache,
  invalidateMessageCache,
  invalidateRoomMessagesCache,
} from '../../../src/services/cache.service';

describe('cache service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMessageCache', () => {
    it('returns parsed Message on cache hit', async () => {
      const msg = createMockMessage();
      mockRedisClient.get.mockResolvedValue(JSON.stringify(msg));

      const result = await getMessageCache('msg-uuid-1');

      expect(mockRedisClient.get).toHaveBeenCalledWith('message:msg-uuid-1');
      expect(result).toEqual(JSON.parse(JSON.stringify(msg)));
    });

    it('returns null on cache miss', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await getMessageCache('msg-uuid-1');

      expect(result).toBeNull();
    });
  });

  describe('setMessageCache', () => {
    it('stringifies message and sets with TTL', async () => {
      const msg = createMockMessage();
      mockRedisClient.set.mockResolvedValue('OK');

      await setMessageCache(msg);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'message:msg-uuid-1',
        JSON.stringify(msg),
        'EX',
        3600
      );
    });
  });

  describe('getRoomMessagesCache', () => {
    it('returns parsed Message[] on cache hit', async () => {
      const messages = createMockMessages(3);
      mockRedisClient.get.mockResolvedValue(JSON.stringify(messages));

      const result = await getRoomMessagesCache('room-uuid-1', 50, 0);

      expect(mockRedisClient.get).toHaveBeenCalledWith('room:room-uuid-1:messages:50:0');
      expect(result).toEqual(JSON.parse(JSON.stringify(messages)));
    });

    it('returns null on cache miss', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await getRoomMessagesCache('room-uuid-1', 50, 0);

      expect(result).toBeNull();
    });
  });

  describe('setRoomMessagesCache', () => {
    it('stringifies messages and sets with TTL', async () => {
      const messages = createMockMessages(3);
      mockRedisClient.set.mockResolvedValue('OK');

      await setRoomMessagesCache('room-uuid-1', 50, 0, messages);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'room:room-uuid-1:messages:50:0',
        JSON.stringify(messages),
        'EX',
        300
      );
    });
  });

  describe('invalidateMessageCache', () => {
    it('calls del with correct key', async () => {
      mockRedisClient.del.mockResolvedValue(1);

      await invalidateMessageCache('msg-uuid-1');

      expect(mockRedisClient.del).toHaveBeenCalledWith('message:msg-uuid-1');
    });
  });

  describe('invalidateRoomMessagesCache', () => {
    it('calls del with correct key pattern', async () => {
      mockRedisClient.del.mockResolvedValue(1);

      await invalidateRoomMessagesCache('room-uuid-1');

      expect(mockRedisClient.del).toHaveBeenCalledWith('room:room-uuid-1:messages:*');
    });
  });
});
