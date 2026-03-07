import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '@29chat/common';
import {
  createMockMessage,
  createMockNewMessage,
  createMockMessages,
  MOCK_USER_ID,
  MOCK_ROOM_ID,
  MOCK_MSG_ID,
} from '../../helpers/mocks';

const { mockChannel, mockConnection } = vi.hoisted(() => {
  const mockChannel = {
    assertQueue: vi.fn(),
    sendToQueue: vi.fn().mockReturnValue(true),
    close: vi.fn(),
  };

  const mockConnection = {
    createChannel: vi.fn().mockResolvedValue(mockChannel),
    close: vi.fn(),
  };

  return { mockChannel, mockConnection };
});

vi.mock('amqplib', () => ({
  default: {
    connect: vi.fn().mockResolvedValue(mockConnection),
  },
}));

vi.mock('@29chat/database', () => ({
  messagesQueries: {
    getMessageById: vi.fn(),
    getMessagesByRoomId: vi.fn(),
    updateMessage: vi.fn(),
    softDeleteMessage: vi.fn(),
  },
}));

import amqplib from 'amqplib';
import { messagesQueries } from '@29chat/database';
import {
  sendMessage,
  getMessagesByRoomId,
  editMessage,
  deleteMessage,
} from '../../../src/services/message.service';

const mockConnect = vi.mocked(amqplib.connect);
const mockDbGetById = vi.mocked(messagesQueries.getMessageById);
const mockDbGetByRoom = vi.mocked(messagesQueries.getMessagesByRoomId);
const mockDbUpdate = vi.mocked(messagesQueries.updateMessage);
const mockDbSoftDelete = vi.mocked(messagesQueries.softDeleteMessage);

describe('message service', () => {
  beforeEach(() => {
    process.env.RABBITMQ_URL = 'amqp://localhost:5672';
    vi.clearAllMocks();
    mockConnect.mockResolvedValue(mockConnection as any);
    mockConnection.createChannel.mockResolvedValue(mockChannel as any);
  });

  describe('sendMessage', () => {
    it('publishes NewMessage to AMQP queue as JSON buffer', async () => {
      const newMsg = createMockNewMessage();

      await sendMessage(newMsg);

      expect(mockChannel.assertQueue).toHaveBeenCalledWith('messages.new', { durable: true });
      expect(mockChannel.sendToQueue).toHaveBeenCalledWith(
        'messages.new',
        Buffer.from(JSON.stringify(newMsg))
      );
    });

    it('throws AppError 400 if content is empty', async () => {
      const newMsg = createMockNewMessage({ content: '' });

      await expect(sendMessage(newMsg)).rejects.toThrow(AppError);
      await expect(sendMessage(newMsg)).rejects.toThrow('Message content cannot be empty');
    });

    it('throws AppError 400 if roomId is missing', async () => {
      const newMsg = createMockNewMessage({ roomId: '' });

      await expect(sendMessage(newMsg)).rejects.toThrow(AppError);
    });

    it('throws AppError 400 if senderId is missing', async () => {
      const newMsg = createMockNewMessage({ senderId: '' });

      await expect(sendMessage(newMsg)).rejects.toThrow(AppError);
    });
  });

  describe('getMessagesByRoomId', () => {
    it('fetches messages from DB', async () => {
      const messages = createMockMessages(3);
      mockDbGetByRoom.mockResolvedValue(messages);

      const result = await getMessagesByRoomId(MOCK_ROOM_ID, 50, 0);

      expect(mockDbGetByRoom).toHaveBeenCalledWith(MOCK_ROOM_ID, 50, 0);
      expect(result).toEqual(messages);
    });

    it('uses default limit=50 and offset=0', async () => {
      mockDbGetByRoom.mockResolvedValue([]);

      await getMessagesByRoomId(MOCK_ROOM_ID);

      expect(mockDbGetByRoom).toHaveBeenCalledWith(MOCK_ROOM_ID, 50, 0);
    });

    it('returns empty array when no messages found', async () => {
      mockDbGetByRoom.mockResolvedValue([]);

      const result = await getMessagesByRoomId(MOCK_ROOM_ID);

      expect(result).toEqual([]);
    });
  });

  describe('editMessage', () => {
    it('updates message content and sets editedAt', async () => {
      const existing = createMockMessage();
      mockDbGetById.mockResolvedValue(existing);
      const updated = createMockMessage({ content: 'Updated', editedAt: new Date() });
      mockDbUpdate.mockResolvedValue(updated);

      const result = await editMessage(MOCK_MSG_ID, MOCK_USER_ID, 'Updated');

      expect(mockDbGetById).toHaveBeenCalledWith(MOCK_MSG_ID);
      expect(mockDbUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Updated',
          editedAt: expect.any(Date),
        })
      );
      expect(result).toEqual(updated);
    });

    it('throws AppError 404 if message not found', async () => {
      mockDbGetById.mockResolvedValue(null);

      await expect(editMessage('nonexistent', MOCK_USER_ID, 'Updated')).rejects.toThrow(AppError);
      await expect(editMessage('nonexistent', MOCK_USER_ID, 'Updated')).rejects.toThrow(
        'Message not found'
      );
    });

    it('throws AppError 403 if senderId does not match', async () => {
      const existing = createMockMessage({ senderId: 'other-user' });
      mockDbGetById.mockResolvedValue(existing);

      await expect(editMessage(MOCK_MSG_ID, MOCK_USER_ID, 'Updated')).rejects.toThrow(AppError);
      await expect(editMessage(MOCK_MSG_ID, MOCK_USER_ID, 'Updated')).rejects.toThrow(
        'Not authorized'
      );
    });

    it('throws AppError 400 if new content is empty', async () => {
      const existing = createMockMessage();
      mockDbGetById.mockResolvedValue(existing);

      await expect(editMessage(MOCK_MSG_ID, MOCK_USER_ID, '')).rejects.toThrow(AppError);
      await expect(editMessage(MOCK_MSG_ID, MOCK_USER_ID, '')).rejects.toThrow(
        'Message content cannot be empty'
      );
    });
  });

  describe('deleteMessage', () => {
    it('soft-deletes message via DB', async () => {
      const existing = createMockMessage();
      mockDbGetById.mockResolvedValue(existing);
      mockDbSoftDelete.mockResolvedValue(undefined);

      await deleteMessage(MOCK_MSG_ID, MOCK_USER_ID);

      expect(mockDbSoftDelete).toHaveBeenCalledWith(MOCK_MSG_ID);
    });

    it('throws AppError 404 if message not found', async () => {
      mockDbGetById.mockResolvedValue(null);

      await expect(deleteMessage('nonexistent', MOCK_USER_ID)).rejects.toThrow(AppError);
      await expect(deleteMessage('nonexistent', MOCK_USER_ID)).rejects.toThrow('Message not found');
    });

    it('throws AppError 403 if senderId does not match', async () => {
      const existing = createMockMessage({ senderId: 'other-user' });
      mockDbGetById.mockResolvedValue(existing);

      await expect(deleteMessage(MOCK_MSG_ID, MOCK_USER_ID)).rejects.toThrow(AppError);
      await expect(deleteMessage(MOCK_MSG_ID, MOCK_USER_ID)).rejects.toThrow('Not authorized');
    });
  });
});
