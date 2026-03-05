import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockMessage, createMockMessages } from '../../helpers/mocks';

const mockRedisClient = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  keys: vi.fn(),
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

      const result = await getMessageCache('00000000-0000-4000-a000-000000000100');

      expect(mockRedisClient.get).toHaveBeenCalledWith('message:00000000-0000-4000-a000-000000000100');
      expect(result).toEqual(JSON.parse(JSON.stringify(msg)));
    });

    it('returns null on cache miss', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await getMessageCache('00000000-0000-4000-a000-000000000100');

      expect(result).toBeNull();
    });
  });

  describe('setMessageCache', () => {
    it('stringifies message and sets with TTL', async () => {
      const msg = createMockMessage();
      mockRedisClient.set.mockResolvedValue('OK');

      await setMessageCache(msg);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'message:00000000-0000-4000-a000-000000000100',
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

      const result = await getRoomMessagesCache('00000000-0000-4000-a000-000000000010', 50, 0);

      expect(mockRedisClient.get).toHaveBeenCalledWith('room:00000000-0000-4000-a000-000000000010:messages:50:0');
      expect(result).toEqual(JSON.parse(JSON.stringify(messages)));
    });

    it('returns null on cache miss', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await getRoomMessagesCache('00000000-0000-4000-a000-000000000010', 50, 0);

      expect(result).toBeNull();
    });
  });

  describe('setRoomMessagesCache', () => {
    it('stringifies messages and sets with TTL', async () => {
      const messages = createMockMessages(3);
      mockRedisClient.set.mockResolvedValue('OK');

      await setRoomMessagesCache('00000000-0000-4000-a000-000000000010', 50, 0, messages);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'room:00000000-0000-4000-a000-000000000010:messages:50:0',
        JSON.stringify(messages),
        'EX',
        300
      );
    });
  });

  describe('invalidateMessageCache', () => {
    it('calls del with correct key', async () => {
      mockRedisClient.del.mockResolvedValue(1);

      await invalidateMessageCache('00000000-0000-4000-a000-000000000100');

      expect(mockRedisClient.del).toHaveBeenCalledWith('message:00000000-0000-4000-a000-000000000100');
    });
  });

  describe('invalidateRoomMessagesCache', () => {
    it('finds keys by pattern and deletes them', async () => {
      const keys = ['room:00000000-0000-4000-a000-000000000010:messages:50:0', 'room:00000000-0000-4000-a000-000000000010:messages:50:50'];
      mockRedisClient.keys.mockResolvedValue(keys);
      mockRedisClient.del.mockResolvedValue(2);

      await invalidateRoomMessagesCache('00000000-0000-4000-a000-000000000010');

      expect(mockRedisClient.keys).toHaveBeenCalledWith('room:00000000-0000-4000-a000-000000000010:messages:*');
      expect(mockRedisClient.del).toHaveBeenCalledWith(...keys);
    });
  });
});
