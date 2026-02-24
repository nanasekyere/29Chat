import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockSocket, createMockIo, createMockMessage } from '../../helpers/mocks';

vi.mock('../../../src/services/message.service', () => ({
  sendMessage: vi.fn(),
  editMessage: vi.fn(),
  deleteMessage: vi.fn(),
}));

import { sendMessage, editMessage, deleteMessage } from '../../../src/services/message.service';
import { registerMessageHandlers } from '../../../src/handlers/message.handler';

const mockSendMessage = vi.mocked(sendMessage);
const mockEditMessage = vi.mocked(editMessage);
const mockDeleteMessage = vi.mocked(deleteMessage);

describe('message handler', () => {
  let socket: ReturnType<typeof createMockSocket>;
  let io: ReturnType<typeof createMockIo>;
  let handlers: Record<string, Function>;

  beforeEach(() => {
    vi.clearAllMocks();
    socket = createMockSocket();
    io = createMockIo();
    handlers = {};

    // Capture registered event handlers
    socket.on = vi.fn((event: string, handler: Function) => {
      handlers[event] = handler;
    }) as any;

    registerMessageHandlers(io as any, socket as any);
  });

  describe('send_message', () => {
    it('calls sendMessage and emits new_message to room', async () => {
      const message = createMockMessage();
      mockSendMessage.mockResolvedValue(message);

      await handlers['send_message']({
        roomId: 'room-uuid-1',
        content: 'Hello!',
        contentType: 'text',
      });

      expect(mockSendMessage).toHaveBeenCalledWith({
        roomId: 'room-uuid-1',
        senderId: 'user-uuid-1',
        content: 'Hello!',
        contentType: 'text',
      });
      expect(io.to).toHaveBeenCalledWith('room-uuid-1');
      expect(io.emit).toHaveBeenCalledWith('new_message', message);
    });

    it('emits error event to sender on service error', async () => {
      mockSendMessage.mockRejectedValue(new Error('Room not found'));

      await handlers['send_message']({
        roomId: 'room-uuid-1',
        content: 'Hello!',
        contentType: 'text',
      });

      expect(socket.emit).toHaveBeenCalledWith('error', expect.objectContaining({
        message: expect.any(String),
      }));
    });
  });

  describe('edit_message', () => {
    it('calls editMessage and emits message_edited to room', async () => {
      const updatedMessage = createMockMessage({ content: 'Edited', editedAt: new Date() });
      mockEditMessage.mockResolvedValue(updatedMessage);

      await handlers['edit_message']({
        messageId: 'message-uuid-1',
        content: 'Edited',
      });

      expect(mockEditMessage).toHaveBeenCalledWith('message-uuid-1', 'user-uuid-1', 'Edited');
      expect(io.to).toHaveBeenCalledWith(updatedMessage.roomId);
      expect(io.emit).toHaveBeenCalledWith('message_edited', updatedMessage);
    });

    it('emits error event to sender on service error', async () => {
      mockEditMessage.mockRejectedValue(new Error('Forbidden'));

      await handlers['edit_message']({
        messageId: 'message-uuid-1',
        content: 'Edited',
      });

      expect(socket.emit).toHaveBeenCalledWith('error', expect.objectContaining({
        message: expect.any(String),
      }));
    });
  });

  describe('delete_message', () => {
    it('calls deleteMessage and emits message_deleted to room', async () => {
      mockDeleteMessage.mockResolvedValue(undefined as any);

      await handlers['delete_message']({
        messageId: 'message-uuid-1',
        roomId: 'room-uuid-1',
      });

      expect(mockDeleteMessage).toHaveBeenCalledWith('message-uuid-1', 'user-uuid-1');
      expect(io.to).toHaveBeenCalledWith('room-uuid-1');
      expect(io.emit).toHaveBeenCalledWith('message_deleted', { messageId: 'message-uuid-1' });
    });

    it('emits error event to sender on service error', async () => {
      mockDeleteMessage.mockRejectedValue(new Error('Not found'));

      await handlers['delete_message']({
        messageId: 'message-uuid-1',
        roomId: 'room-uuid-1',
      });

      expect(socket.emit).toHaveBeenCalledWith('error', expect.objectContaining({
        message: expect.any(String),
      }));
    });
  });
});
