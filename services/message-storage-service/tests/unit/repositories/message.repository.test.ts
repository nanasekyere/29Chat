import { describe, it, expect, vi, beforeEach } from 'vitest';
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

import { messagesQueries } from '@29chat/database';
import {
  createMessage,
  getMessageById,
  getMessagesByRoomId,
  updateMessage,
  softDeleteMessage,
} from '../../../src/repositories/message.repository';

const mockCreate = vi.mocked(messagesQueries.createMessage);
const mockGetById = vi.mocked(messagesQueries.getMessageById);
const mockGetByRoom = vi.mocked(messagesQueries.getMessagesByRoomId);
const mockUpdate = vi.mocked(messagesQueries.updateMessage);
const mockSoftDelete = vi.mocked(messagesQueries.softDeleteMessage);

describe('message repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createMessage', () => {
    it('delegates to messagesQueries.createMessage and returns result', async () => {
      const newMsg = createMockNewMessage();
      const created = createMockMessage();
      mockCreate.mockResolvedValue(created);

      const result = await createMessage(newMsg);

      expect(mockCreate).toHaveBeenCalledWith(newMsg);
      expect(result).toEqual(created);
    });

    it('propagates errors from messagesQueries', async () => {
      mockCreate.mockRejectedValue(new Error('DB error'));

      await expect(createMessage(createMockNewMessage())).rejects.toThrow('DB error');
    });
  });

  describe('getMessageById', () => {
    it('delegates to messagesQueries.getMessageById and returns message', async () => {
      const msg = createMockMessage();
      mockGetById.mockResolvedValue(msg);

      const result = await getMessageById('msg-uuid-1');

      expect(mockGetById).toHaveBeenCalledWith('msg-uuid-1');
      expect(result).toEqual(msg);
    });

    it('returns null when message not found', async () => {
      mockGetById.mockResolvedValue(null);

      const result = await getMessageById('nonexistent');

      expect(result).toBeNull();
    });

    it('propagates errors from messagesQueries', async () => {
      mockGetById.mockRejectedValue(new Error('DB error'));

      await expect(getMessageById('msg-uuid-1')).rejects.toThrow('DB error');
    });
  });

  describe('getMessagesByRoomId', () => {
    it('delegates to messagesQueries.getMessagesByRoomId with limit and offset', async () => {
      const messages = createMockMessages(3);
      mockGetByRoom.mockResolvedValue(messages);

      const result = await getMessagesByRoomId('room-uuid-1', 20, 10);

      expect(mockGetByRoom).toHaveBeenCalledWith('room-uuid-1', { limit: 20, offset: 10 });
      expect(result).toEqual(messages);
    });

    it('returns empty array when no messages found', async () => {
      mockGetByRoom.mockResolvedValue([]);

      const result = await getMessagesByRoomId('room-uuid-1', 50, 0);

      expect(result).toEqual([]);
    });

    it('propagates errors from messagesQueries', async () => {
      mockGetByRoom.mockRejectedValue(new Error('DB error'));

      await expect(getMessagesByRoomId('room-uuid-1', 50, 0)).rejects.toThrow('DB error');
    });
  });

  describe('updateMessage', () => {
    it('delegates to messagesQueries.updateMessage and returns updated message', async () => {
      const msg = createMockMessage({ content: 'Updated content' });
      mockUpdate.mockResolvedValue(msg);

      const result = await updateMessage(msg);

      expect(mockUpdate).toHaveBeenCalledWith(msg);
      expect(result).toEqual(msg);
    });

    it('propagates errors from messagesQueries', async () => {
      mockUpdate.mockRejectedValue(new Error('DB error'));

      await expect(updateMessage(createMockMessage())).rejects.toThrow('DB error');
    });
  });

  describe('softDeleteMessage', () => {
    it('delegates to messagesQueries.softDeleteMessage', async () => {
      mockSoftDelete.mockResolvedValue(undefined);

      await softDeleteMessage('msg-uuid-1');

      expect(mockSoftDelete).toHaveBeenCalledWith('msg-uuid-1');
    });

    it('propagates errors from messagesQueries', async () => {
      mockSoftDelete.mockRejectedValue(new Error('DB error'));

      await expect(softDeleteMessage('msg-uuid-1')).rejects.toThrow('DB error');
    });
  });
});
