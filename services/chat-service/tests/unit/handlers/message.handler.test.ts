import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '@29chat/common';
import {
  createMockSocket,
  createMockIo,
  createMockMessage,
  createMockMessages,
  MOCK_USER_ID,
  MOCK_ROOM_ID,
  MOCK_MSG_ID,
} from '../../helpers/mocks';

vi.mock('../../../src/services/message.service', () => ({
  sendMessage: vi.fn(),
  getMessagesByRoomId: vi.fn(),
  editMessage: vi.fn(),
  deleteMessage: vi.fn(),
}));

import * as messageService from '../../../src/services/message.service';
import { registerMessageHandlers } from '../../../src/handlers/message.handler';

const mockSendMessage = vi.mocked(messageService.sendMessage);
const mockGetMessages = vi.mocked(messageService.getMessagesByRoomId);
const mockEditMessage = vi.mocked(messageService.editMessage);
const mockDeleteMessage = vi.mocked(messageService.deleteMessage);

describe('message handler', () => {
  let mockSocket: ReturnType<typeof createMockSocket>;
  let mockIo: ReturnType<typeof createMockIo>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket = createMockSocket();
    mockIo = createMockIo();
  });

  function getHandler(eventName: string) {
    registerMessageHandlers(mockIo as any, mockSocket as any);
    const call = mockSocket.on.mock.calls.find((c: any[]) => c[0] === eventName);
    if (!call) throw new Error(`No handler registered for event: ${eventName}`);
    return call[1];
  }

  describe('message:send', () => {
    it('calls messageService.sendMessage and emits message:new to the room', async () => {
      const created = createMockMessage();
      mockSendMessage.mockResolvedValue(created as any);
      const callback = vi.fn();

      const handler = getHandler('message:send');
      await handler(
        { roomId: MOCK_ROOM_ID, content: 'Hello', contentType: 'text' },
        callback
      );

      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          roomId: MOCK_ROOM_ID,
          senderId: MOCK_USER_ID,
          content: 'Hello',
          contentType: 'text',
        })
      );
      expect(mockSocket.to).toHaveBeenCalledWith(MOCK_ROOM_ID);
      expect(mockSocket.to(MOCK_ROOM_ID).emit).toHaveBeenCalledWith('message:new', created);
      expect(callback).toHaveBeenCalledWith({ success: true, message: created });
    });

    it('calls callback with error on service failure', async () => {
      mockSendMessage.mockRejectedValue(new AppError('Message content cannot be empty', 400));
      const callback = vi.fn();

      const handler = getHandler('message:send');
      await handler(
        { roomId: MOCK_ROOM_ID, content: '', contentType: 'text' },
        callback
      );

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) })
      );
    });
  });

  describe('message:history', () => {
    it('calls messageService.getMessagesByRoomId and returns messages via callback', async () => {
      const messages = createMockMessages(3);
      mockGetMessages.mockResolvedValue(messages);
      const callback = vi.fn();

      const handler = getHandler('message:history');
      await handler({ roomId: MOCK_ROOM_ID, limit: 50, offset: 0 }, callback);

      expect(mockGetMessages).toHaveBeenCalledWith(MOCK_ROOM_ID, 50, 0);
      expect(callback).toHaveBeenCalledWith({ success: true, messages });
    });

    it('calls callback with error if roomId is missing', async () => {
      const callback = vi.fn();

      const handler = getHandler('message:history');
      await handler({ limit: 50, offset: 0 }, callback);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) })
      );
    });
  });

  describe('message:edit', () => {
    it('calls messageService.editMessage and emits message:edited to room', async () => {
      const updated = createMockMessage({ content: 'Edited', editedAt: new Date() });
      mockEditMessage.mockResolvedValue(updated);
      const callback = vi.fn();

      const handler = getHandler('message:edit');
      await handler({ messageId: MOCK_MSG_ID, content: 'Edited' }, callback);

      expect(mockEditMessage).toHaveBeenCalledWith(MOCK_MSG_ID, MOCK_USER_ID, 'Edited');
      expect(mockSocket.to).toHaveBeenCalledWith(updated.roomId);
      expect(mockSocket.to(updated.roomId).emit).toHaveBeenCalledWith('message:edited', updated);
      expect(callback).toHaveBeenCalledWith({ success: true, message: updated });
    });

    it('calls callback with error if not authorized', async () => {
      mockEditMessage.mockRejectedValue(new AppError('Not authorized', 403));
      const callback = vi.fn();

      const handler = getHandler('message:edit');
      await handler({ messageId: MOCK_MSG_ID, content: 'Edited' }, callback);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) })
      );
    });
  });

  describe('message:delete', () => {
    it('calls messageService.deleteMessage and emits message:deleted to room', async () => {
      const existing = createMockMessage();
      mockDeleteMessage.mockResolvedValue(existing as any);
      const callback = vi.fn();

      const handler = getHandler('message:delete');
      await handler({ messageId: MOCK_MSG_ID, roomId: MOCK_ROOM_ID }, callback);

      expect(mockDeleteMessage).toHaveBeenCalledWith(MOCK_MSG_ID, MOCK_USER_ID);
      expect(mockSocket.to).toHaveBeenCalledWith(MOCK_ROOM_ID);
      expect(mockSocket.to(MOCK_ROOM_ID).emit).toHaveBeenCalledWith('message:deleted', {
        messageId: MOCK_MSG_ID,
      });
      expect(callback).toHaveBeenCalledWith({ success: true });
    });

    it('calls callback with error if not authorized', async () => {
      mockDeleteMessage.mockRejectedValue(new AppError('Not authorized', 403));
      const callback = vi.fn();

      const handler = getHandler('message:delete');
      await handler({ messageId: MOCK_MSG_ID, roomId: MOCK_ROOM_ID }, callback);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) })
      );
    });
  });
});
