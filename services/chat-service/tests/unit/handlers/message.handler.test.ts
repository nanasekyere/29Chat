import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '@29chat/common';
import {
  createMockSocket,
  createMockIo,
  MOCK_USER_ID,
  MOCK_ROOM_ID,
} from '../../helpers/mocks';

vi.mock('../../../src/services/message.service', () => ({
  sendMessage: vi.fn(),
}));

import * as messageService from '../../../src/services/message.service';
import { registerMessageHandlers } from '../../../src/handlers/message.handler';

const mockSendMessage = vi.mocked(messageService.sendMessage);

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
      mockSendMessage.mockResolvedValue(undefined);
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
      expect(mockSocket.to(MOCK_ROOM_ID).emit).toHaveBeenCalledWith(
        'message:new',
        expect.objectContaining({
          roomId: MOCK_ROOM_ID,
          senderId: MOCK_USER_ID,
          content: 'Hello',
          contentType: 'text',
        })
      );
      expect(callback).toHaveBeenCalledWith({ success: true });
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
});
