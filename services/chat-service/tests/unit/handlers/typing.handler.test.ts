import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockSocket, createMockIo, MOCK_USER_ID, MOCK_ROOM_ID } from '../../helpers/mocks';
import { registerTypingHandlers } from '../../../src/handlers/typing.handler';

describe('typing handler', () => {
  let mockSocket: ReturnType<typeof createMockSocket>;
  let mockIo: ReturnType<typeof createMockIo>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket = createMockSocket();
    mockIo = createMockIo();
  });

  function getHandler(eventName: string) {
    registerTypingHandlers(mockIo as any, mockSocket as any);
    const call = mockSocket.on.mock.calls.find((c: any[]) => c[0] === eventName);
    if (!call) throw new Error(`No handler registered for event: ${eventName}`);
    return call[1];
  }

  describe('typing:start', () => {
    it('broadcasts typing:start to the room excluding sender', () => {
      const handler = getHandler('typing:start');
      handler({ roomId: MOCK_ROOM_ID });

      expect(mockSocket.to).toHaveBeenCalledWith(MOCK_ROOM_ID);
      expect(mockSocket.to(MOCK_ROOM_ID).emit).toHaveBeenCalledWith('typing:start', {
        userId: MOCK_USER_ID,
        roomId: MOCK_ROOM_ID,
      });
    });

    it('does nothing if roomId is missing', () => {
      const handler = getHandler('typing:start');
      handler({});

      expect(mockSocket.to).not.toHaveBeenCalled();
    });
  });

  describe('typing:stop', () => {
    it('broadcasts typing:stop to the room excluding sender', () => {
      const handler = getHandler('typing:stop');
      handler({ roomId: MOCK_ROOM_ID });

      expect(mockSocket.to).toHaveBeenCalledWith(MOCK_ROOM_ID);
      expect(mockSocket.to(MOCK_ROOM_ID).emit).toHaveBeenCalledWith('typing:stop', {
        userId: MOCK_USER_ID,
        roomId: MOCK_ROOM_ID,
      });
    });

    it('does nothing if roomId is missing', () => {
      const handler = getHandler('typing:stop');
      handler({});

      expect(mockSocket.to).not.toHaveBeenCalled();
    });
  });
});
