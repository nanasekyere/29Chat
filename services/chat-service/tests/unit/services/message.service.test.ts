import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '@29chat/common';
import { createMockMessage, createMockRoom, createMockRoomMember } from '../../helpers/mocks';

vi.mock('@29chat/database', () => ({
  messagesQueries: {
    createMessage: vi.fn(),
    getMessageById: vi.fn(),
    getMessagesByRoomId: vi.fn(),
    updateMessage: vi.fn(),
    softDeleteMessage: vi.fn(),
  },
  roomsQueries: {
    getRoomById: vi.fn(),
  },
  roomMembersQueries: {
    getMemberByRoomAndUser: vi.fn(),
  },
}));

import { messagesQueries, roomsQueries, roomMembersQueries } from '@29chat/database';
import {
  sendMessage,
  getMessagesByRoomId,
  editMessage,
  deleteMessage,
} from '../../../src/services/message.service';

const mockCreateMessage = vi.mocked(messagesQueries.createMessage);
const mockGetMessageById = vi.mocked(messagesQueries.getMessageById);
const mockGetMessagesByRoomId = vi.mocked(messagesQueries.getMessagesByRoomId);
const mockUpdateMessage = vi.mocked(messagesQueries.updateMessage);
const mockSoftDeleteMessage = vi.mocked(messagesQueries.softDeleteMessage);
const mockGetRoomById = vi.mocked(roomsQueries.getRoomById);
const mockGetMemberByRoomAndUser = vi.mocked(roomMembersQueries.getMemberByRoomAndUser);

describe('message service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendMessage', () => {
    const input = {
      roomId: 'room-uuid-1',
      senderId: 'user-uuid-1',
      content: 'Hello, world!',
      contentType: 'text' as const,
    };

    it('creates message in DB and returns message object', async () => {
      const room = createMockRoom();
      const member = createMockRoomMember();
      const message = createMockMessage();
      mockGetRoomById.mockResolvedValue(room);
      mockGetMemberByRoomAndUser.mockResolvedValue(member);
      mockCreateMessage.mockResolvedValue(message);

      const result = await sendMessage(input);

      expect(mockCreateMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          roomId: 'room-uuid-1',
          senderId: 'user-uuid-1',
          content: 'Hello, world!',
          contentType: 'text',
        })
      );
      expect(result).toEqual(message);
    });

    it('throws AppError 404 if room does not exist', async () => {
      mockGetRoomById.mockResolvedValue(null as any);

      await expect(sendMessage(input)).rejects.toThrow(AppError);
      await expect(sendMessage(input)).rejects.toThrow(
        expect.objectContaining({ statusCode: 404 })
      );
    });

    it('throws AppError 403 if sender is not a room member', async () => {
      mockGetRoomById.mockResolvedValue(createMockRoom());
      mockGetMemberByRoomAndUser.mockResolvedValue(null as any);

      await expect(sendMessage(input)).rejects.toThrow(AppError);
      await expect(sendMessage(input)).rejects.toThrow(
        expect.objectContaining({ statusCode: 403 })
      );
    });

    it('throws AppError 400 for empty content', async () => {
      const emptyInput = { ...input, content: '' };

      await expect(sendMessage(emptyInput)).rejects.toThrow(AppError);
      await expect(sendMessage(emptyInput)).rejects.toThrow(
        expect.objectContaining({ statusCode: 400 })
      );
    });

    it('throws AppError 400 for whitespace-only content', async () => {
      const whitespaceInput = { ...input, content: '   \n\t  ' };

      await expect(sendMessage(whitespaceInput)).rejects.toThrow(AppError);
      await expect(sendMessage(whitespaceInput)).rejects.toThrow(
        expect.objectContaining({ statusCode: 400 })
      );
    });

    it('throws AppError 400 for content exceeding 255 characters', async () => {
      const longInput = { ...input, content: 'a'.repeat(256) };
      mockGetRoomById.mockResolvedValue(createMockRoom());
      mockGetMemberByRoomAndUser.mockResolvedValue(createMockRoomMember());

      await expect(sendMessage(longInput)).rejects.toThrow(AppError);
      await expect(sendMessage(longInput)).rejects.toThrow(
        expect.objectContaining({ statusCode: 400 })
      );
    });

    it('validates contentType is one of: text, image, audio, video, file', async () => {
      const invalidInput = { ...input, contentType: 'gif' as any };
      mockGetRoomById.mockResolvedValue(createMockRoom());
      mockGetMemberByRoomAndUser.mockResolvedValue(createMockRoomMember());

      await expect(sendMessage(invalidInput)).rejects.toThrow(AppError);
      await expect(sendMessage(invalidInput)).rejects.toThrow(
        expect.objectContaining({ statusCode: 400 })
      );
    });
  });

  describe('getMessagesByRoomId', () => {
    it('returns paginated messages with limit and offset', async () => {
      const messages = [
        createMockMessage(),
        createMockMessage({ id: 'message-uuid-2', content: 'Second message' }),
      ];
      mockGetRoomById.mockResolvedValue(createMockRoom());
      mockGetMemberByRoomAndUser.mockResolvedValue(createMockRoomMember());
      mockGetMessagesByRoomId.mockResolvedValue(messages);

      const result = await getMessagesByRoomId('room-uuid-1', 'user-uuid-1', { limit: 50, offset: 0 });

      expect(mockGetMessagesByRoomId).toHaveBeenCalledWith('room-uuid-1', { limit: 50, offset: 0 });
      expect(result).toHaveLength(2);
    });

    it('throws AppError 403 if requester is not in room', async () => {
      mockGetRoomById.mockResolvedValue(createMockRoom());
      mockGetMemberByRoomAndUser.mockResolvedValue(null as any);

      await expect(
        getMessagesByRoomId('room-uuid-1', 'outsider-uuid', { limit: 50, offset: 0 })
      ).rejects.toThrow(AppError);
      await expect(
        getMessagesByRoomId('room-uuid-1', 'outsider-uuid', { limit: 50, offset: 0 })
      ).rejects.toThrow(expect.objectContaining({ statusCode: 403 }));
    });

    it('returns empty array for room with no messages', async () => {
      mockGetRoomById.mockResolvedValue(createMockRoom());
      mockGetMemberByRoomAndUser.mockResolvedValue(createMockRoomMember());
      mockGetMessagesByRoomId.mockResolvedValue([]);

      const result = await getMessagesByRoomId('room-uuid-1', 'user-uuid-1', { limit: 50, offset: 0 });

      expect(result).toEqual([]);
    });

    it('uses default pagination when no options provided', async () => {
      mockGetRoomById.mockResolvedValue(createMockRoom());
      mockGetMemberByRoomAndUser.mockResolvedValue(createMockRoomMember());
      mockGetMessagesByRoomId.mockResolvedValue([]);

      await getMessagesByRoomId('room-uuid-1', 'user-uuid-1');

      expect(mockGetMessagesByRoomId).toHaveBeenCalledWith('room-uuid-1', { limit: 50, offset: 0 });
    });
  });

  describe('editMessage', () => {
    it('updates message content and sets editedAt', async () => {
      const message = createMockMessage({ senderId: 'user-uuid-1' });
      const updatedMessage = createMockMessage({
        content: 'Updated content',
        editedAt: new Date(),
      });
      mockGetMessageById.mockResolvedValue(message);
      mockUpdateMessage.mockResolvedValue(updatedMessage);

      const result = await editMessage('message-uuid-1', 'user-uuid-1', 'Updated content');

      expect(mockUpdateMessage).toHaveBeenCalledWith('message-uuid-1', {
        content: 'Updated content',
        editedAt: expect.any(Date),
      });
      expect(result).toEqual(updatedMessage);
    });

    it('throws AppError 404 if message not found', async () => {
      mockGetMessageById.mockResolvedValue(null as any);

      await expect(editMessage('nonexistent', 'user-uuid-1', 'New content')).rejects.toThrow(AppError);
      await expect(editMessage('nonexistent', 'user-uuid-1', 'New content')).rejects.toThrow(
        expect.objectContaining({ statusCode: 404 })
      );
    });

    it('throws AppError 403 if not the message sender', async () => {
      const message = createMockMessage({ senderId: 'user-uuid-1' });
      mockGetMessageById.mockResolvedValue(message);

      await expect(editMessage('message-uuid-1', 'user-uuid-2', 'Hacked!')).rejects.toThrow(AppError);
      await expect(editMessage('message-uuid-1', 'user-uuid-2', 'Hacked!')).rejects.toThrow(
        expect.objectContaining({ statusCode: 403 })
      );
    });

    it('throws AppError 400 if editing a deleted message', async () => {
      const deletedMessage = createMockMessage({
        senderId: 'user-uuid-1',
        deletedAt: new Date(),
      });
      mockGetMessageById.mockResolvedValue(deletedMessage);

      await expect(editMessage('message-uuid-1', 'user-uuid-1', 'New content')).rejects.toThrow(AppError);
      await expect(editMessage('message-uuid-1', 'user-uuid-1', 'New content')).rejects.toThrow(
        expect.objectContaining({ statusCode: 400 })
      );
    });

    it('throws AppError 400 for empty new content', async () => {
      const message = createMockMessage({ senderId: 'user-uuid-1' });
      mockGetMessageById.mockResolvedValue(message);

      await expect(editMessage('message-uuid-1', 'user-uuid-1', '')).rejects.toThrow(AppError);
      await expect(editMessage('message-uuid-1', 'user-uuid-1', '')).rejects.toThrow(
        expect.objectContaining({ statusCode: 400 })
      );
    });
  });

  describe('deleteMessage', () => {
    it('soft-deletes message by setting deletedAt', async () => {
      const message = createMockMessage({ senderId: 'user-uuid-1' });
      const member = createMockRoomMember({ userId: 'user-uuid-1' });
      mockGetMessageById.mockResolvedValue(message);
      mockGetMemberByRoomAndUser.mockResolvedValue(member);
      mockSoftDeleteMessage.mockResolvedValue(undefined as any);

      await deleteMessage('message-uuid-1', 'user-uuid-1');

      expect(mockSoftDeleteMessage).toHaveBeenCalledWith('message-uuid-1', expect.any(Date));
    });

    it('throws AppError 403 if not sender and not room admin', async () => {
      const message = createMockMessage({ senderId: 'user-uuid-1' });
      const nonAdminMember = createMockRoomMember({ userId: 'user-uuid-2', role: 'member' });
      mockGetMessageById.mockResolvedValue(message);
      mockGetMemberByRoomAndUser.mockResolvedValue(nonAdminMember);

      await expect(deleteMessage('message-uuid-1', 'user-uuid-2')).rejects.toThrow(AppError);
      await expect(deleteMessage('message-uuid-1', 'user-uuid-2')).rejects.toThrow(
        expect.objectContaining({ statusCode: 403 })
      );
    });

    it('allows room admin to delete any message', async () => {
      const message = createMockMessage({ senderId: 'user-uuid-1' });
      const adminMember = createMockRoomMember({ userId: 'user-uuid-2', role: 'admin' });
      mockGetMessageById.mockResolvedValue(message);
      mockGetMemberByRoomAndUser.mockResolvedValue(adminMember);
      mockSoftDeleteMessage.mockResolvedValue(undefined as any);

      await deleteMessage('message-uuid-1', 'user-uuid-2');

      expect(mockSoftDeleteMessage).toHaveBeenCalledWith('message-uuid-1', expect.any(Date));
    });

    it('is idempotent if message already soft-deleted', async () => {
      const deletedMessage = createMockMessage({
        senderId: 'user-uuid-1',
        deletedAt: new Date(),
      });
      const member = createMockRoomMember({ userId: 'user-uuid-1' });
      mockGetMessageById.mockResolvedValue(deletedMessage);
      mockGetMemberByRoomAndUser.mockResolvedValue(member);

      await deleteMessage('message-uuid-1', 'user-uuid-1');

      // Should not call softDeleteMessage again
      expect(mockSoftDeleteMessage).not.toHaveBeenCalled();
    });

    it('throws AppError 404 if message not found', async () => {
      mockGetMessageById.mockResolvedValue(null as any);

      await expect(deleteMessage('nonexistent', 'user-uuid-1')).rejects.toThrow(AppError);
      await expect(deleteMessage('nonexistent', 'user-uuid-1')).rejects.toThrow(
        expect.objectContaining({ statusCode: 404 })
      );
    });
  });
});
