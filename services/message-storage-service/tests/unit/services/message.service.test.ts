import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '@29chat/common';
import { createMockMessage, createMockNewMessage, createMockMessages } from '../../helpers/mocks';

vi.mock('@29chat/database', () => ({
  messagesQueries: {
    createMessage: vi.fn(),
    getMessageById: vi.fn(),
    getMessagesByRoomId: vi.fn(),
    updateMessage: vi.fn(),
    softDeleteMessage: vi.fn(),
  },
}));

vi.mock('../../../src/services/cache.service', () => ({
  getMessageCache: vi.fn(),
  setMessageCache: vi.fn(),
  getRoomMessagesCache: vi.fn(),
  setRoomMessagesCache: vi.fn(),
  invalidateMessageCache: vi.fn(),
  invalidateRoomMessagesCache: vi.fn(),
}));

import { messagesQueries } from '@29chat/database';
import * as cache from '../../../src/services/cache.service';
import {
  createMessage,
  getMessageById,
  getMessagesByRoomId,
  updateMessage,
  softDeleteMessage,
} from '../../../src/services/message.service';

const mockDbCreate = vi.mocked(messagesQueries.createMessage);
const mockDbGetById = vi.mocked(messagesQueries.getMessageById);
const mockDbGetByRoom = vi.mocked(messagesQueries.getMessagesByRoomId);
const mockDbUpdate = vi.mocked(messagesQueries.updateMessage);
const mockDbSoftDelete = vi.mocked(messagesQueries.softDeleteMessage);

const mockCacheGet = vi.mocked(cache.getMessageCache);
const mockCacheSet = vi.mocked(cache.setMessageCache);
const mockCacheGetRoom = vi.mocked(cache.getRoomMessagesCache);
const mockCacheSetRoom = vi.mocked(cache.setRoomMessagesCache);
const mockCacheInvalidateMsg = vi.mocked(cache.invalidateMessageCache);
const mockCacheInvalidateRoom = vi.mocked(cache.invalidateRoomMessagesCache);

describe('message service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createMessage', () => {
    it('calls messagesQueries.createMessage and invalidates room cache', async () => {
      const newMsg = createMockNewMessage();
      const created = createMockMessage();
      mockDbCreate.mockResolvedValue(created);

      const result = await createMessage(newMsg);

      expect(mockDbCreate).toHaveBeenCalledWith(newMsg);
      expect(mockCacheInvalidateRoom).toHaveBeenCalledWith(newMsg.roomId);
      expect(result).toEqual(created);
    });

    it('throws AppError 400 if content is empty', async () => {
      const newMsg = createMockNewMessage({ content: '' });

      await expect(createMessage(newMsg)).rejects.toThrow(AppError);
      await expect(createMessage(newMsg)).rejects.toThrow('Message content cannot be empty');
    });
  });

  describe('getMessageById', () => {
    it('returns cached message on cache hit (skips DB)', async () => {
      const msg = createMockMessage();
      mockCacheGet.mockResolvedValue(msg);

      const result = await getMessageById('msg-uuid-1');

      expect(mockCacheGet).toHaveBeenCalledWith('msg-uuid-1');
      expect(mockDbGetById).not.toHaveBeenCalled();
      expect(result).toEqual(msg);
    });

    it('fetches from DB on cache miss and populates cache', async () => {
      const msg = createMockMessage();
      mockCacheGet.mockResolvedValue(null);
      mockDbGetById.mockResolvedValue(msg);

      const result = await getMessageById('msg-uuid-1');

      expect(mockDbGetById).toHaveBeenCalledWith('msg-uuid-1');
      expect(mockCacheSet).toHaveBeenCalledWith(msg);
      expect(result).toEqual(msg);
    });

    it('throws AppError 404 if not found in cache or DB', async () => {
      mockCacheGet.mockResolvedValue(null);
      mockDbGetById.mockResolvedValue(null);

      await expect(getMessageById('nonexistent')).rejects.toThrow(AppError);
      await expect(getMessageById('nonexistent')).rejects.toThrow('Message not found');
      expect(mockCacheSet).not.toHaveBeenCalled();
    });
  });

  describe('getMessagesByRoomId', () => {
    it('returns cached messages on cache hit', async () => {
      const messages = createMockMessages(3);
      mockCacheGetRoom.mockResolvedValue(messages);

      const result = await getMessagesByRoomId('room-uuid-1', 50, 0);

      expect(mockCacheGetRoom).toHaveBeenCalledWith('room-uuid-1', 50, 0);
      expect(mockDbGetByRoom).not.toHaveBeenCalled();
      expect(result).toEqual(messages);
    });

    it('fetches from DB on cache miss and populates cache', async () => {
      const messages = createMockMessages(3);
      mockCacheGetRoom.mockResolvedValue(null);
      mockDbGetByRoom.mockResolvedValue(messages);

      const result = await getMessagesByRoomId('room-uuid-1', 50, 0);

      expect(mockDbGetByRoom).toHaveBeenCalledWith('room-uuid-1', 50, 0);
      expect(mockCacheSetRoom).toHaveBeenCalledWith('room-uuid-1', 50, 0, messages);
      expect(result).toEqual(messages);
    });

    it('uses defaults limit=50, offset=0', async () => {
      mockCacheGetRoom.mockResolvedValue(null);
      mockDbGetByRoom.mockResolvedValue([]);

      await getMessagesByRoomId('room-uuid-1');

      expect(mockCacheGetRoom).toHaveBeenCalledWith('room-uuid-1', 50, 0);
      expect(mockDbGetByRoom).toHaveBeenCalledWith('room-uuid-1', 50, 0);
    });
  });

  describe('updateMessage', () => {
    it('updates message content, sets editedAt, invalidates caches', async () => {
      mockCacheGet.mockResolvedValue(null);
      const existing = createMockMessage();
      mockDbGetById.mockResolvedValue(existing);
      const updated = createMockMessage({ content: 'Updated', editedAt: new Date() });
      mockDbUpdate.mockResolvedValue(updated);

      const result = await updateMessage('msg-uuid-1', 'user-uuid-1', 'Updated');

      expect(mockDbGetById).toHaveBeenCalledWith('msg-uuid-1');
      expect(mockDbUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Updated',
          editedAt: expect.any(Date),
        })
      );
      expect(mockCacheInvalidateMsg).toHaveBeenCalledWith('msg-uuid-1');
      expect(mockCacheInvalidateRoom).toHaveBeenCalledWith('room-uuid-1');
      expect(result).toEqual(updated);
    });

    it('throws AppError 404 if message not found', async () => {
      mockCacheGet.mockResolvedValue(null);
      mockDbGetById.mockResolvedValue(null);

      await expect(updateMessage('nonexistent', 'user-uuid-1', 'Updated')).rejects.toThrow(AppError);
      await expect(updateMessage('nonexistent', 'user-uuid-1', 'Updated')).rejects.toThrow('Message not found');
    });

    it('throws AppError 403 if senderId does not match', async () => {
      mockCacheGet.mockResolvedValue(null);
      const existing = createMockMessage({ senderId: 'other-user' });
      mockDbGetById.mockResolvedValue(existing);

      await expect(updateMessage('msg-uuid-1', 'user-uuid-1', 'Updated')).rejects.toThrow(AppError);
      await expect(updateMessage('msg-uuid-1', 'user-uuid-1', 'Updated')).rejects.toThrow('Not authorized');
    });

    it('throws AppError 400 if content is empty', async () => {
      mockCacheGet.mockResolvedValue(null);
      const existing = createMockMessage();
      mockDbGetById.mockResolvedValue(existing);

      await expect(updateMessage('msg-uuid-1', 'user-uuid-1', '')).rejects.toThrow(AppError);
      await expect(updateMessage('msg-uuid-1', 'user-uuid-1', '')).rejects.toThrow('Message content cannot be empty');
    });
  });

  describe('softDeleteMessage', () => {
    it('calls messagesQueries.softDeleteMessage and invalidates caches', async () => {
      mockCacheGet.mockResolvedValue(null);
      const existing = createMockMessage();
      mockDbGetById.mockResolvedValue(existing);
      mockDbSoftDelete.mockResolvedValue(undefined);

      await softDeleteMessage('msg-uuid-1', 'user-uuid-1');

      expect(mockDbSoftDelete).toHaveBeenCalledWith('msg-uuid-1');
      expect(mockCacheInvalidateMsg).toHaveBeenCalledWith('msg-uuid-1');
      expect(mockCacheInvalidateRoom).toHaveBeenCalledWith('room-uuid-1');
    });

    it('throws AppError 404 if message not found', async () => {
      mockCacheGet.mockResolvedValue(null);
      mockDbGetById.mockResolvedValue(null);

      await expect(softDeleteMessage('nonexistent', 'user-uuid-1')).rejects.toThrow(AppError);
      await expect(softDeleteMessage('nonexistent', 'user-uuid-1')).rejects.toThrow('Message not found');
    });

    it('throws AppError 403 if senderId does not match', async () => {
      mockCacheGet.mockResolvedValue(null);
      const existing = createMockMessage({ senderId: 'other-user' });
      mockDbGetById.mockResolvedValue(existing);

      await expect(softDeleteMessage('msg-uuid-1', 'user-uuid-1')).rejects.toThrow(AppError);
      await expect(softDeleteMessage('msg-uuid-1', 'user-uuid-1')).rejects.toThrow('Not authorized');
    });
  });
});
