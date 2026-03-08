import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createMockSocket,
  createMockIo,
  MOCK_USER_ID,
  MOCK_SOCKET_ID,
} from '../../helpers/mocks';

vi.mock('../../../src/handlers/message.handler', () => ({
  registerMessageHandlers: vi.fn(),
}));

vi.mock('../../../src/handlers/typing.handler', () => ({
  registerTypingHandlers: vi.fn(),
}));

vi.mock('../../../src/handlers/presence.handler', () => ({
  registerPresenceHandlers: vi.fn(),
}));

vi.mock('../../../src/services/socket.service', () => ({
  socketService: {
    addConnection: vi.fn(),
    removeConnection: vi.fn(),
  },
}));

import { registerMessageHandlers } from '../../../src/handlers/message.handler';
import { registerTypingHandlers } from '../../../src/handlers/typing.handler';
import { registerPresenceHandlers } from '../../../src/handlers/presence.handler';
import { socketService } from '../../../src/services/socket.service';
import { handleConnection } from '../../../src/controllers/socket.controller';

describe('socket controller', () => {
  let mockSocket: ReturnType<typeof createMockSocket>;
  let mockIo: ReturnType<typeof createMockIo>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket = createMockSocket();
    mockIo = createMockIo();
  });

  describe('handleConnection', () => {
    it('registers message handlers on the socket', async () => {
      await handleConnection(mockIo as any, mockSocket as any);

      expect(registerMessageHandlers).toHaveBeenCalledWith(mockIo, mockSocket);
    });

    it('registers typing handlers on the socket', async () => {
      await handleConnection(mockIo as any, mockSocket as any);

      expect(registerTypingHandlers).toHaveBeenCalledWith(mockIo, mockSocket);
    });

    it('registers presence handlers on the socket', async () => {
      await handleConnection(mockIo as any, mockSocket as any);

      expect(registerPresenceHandlers).toHaveBeenCalledWith(mockIo, mockSocket);
    });

    it('tracks the connection in socketService', async () => {
      await handleConnection(mockIo as any, mockSocket as any);

      expect(socketService.addConnection).toHaveBeenCalledWith(
        MOCK_USER_ID,
        MOCK_SOCKET_ID
      );
    });

    it('registers a disconnect handler', async () => {
      await handleConnection(mockIo as any, mockSocket as any);

      const disconnectCall = mockSocket.on.mock.calls.find(
        (c: any[]) => c[0] === 'disconnect'
      );
      expect(disconnectCall).toBeDefined();
    });

    it('removes connection from socketService on disconnect', async () => {
      await handleConnection(mockIo as any, mockSocket as any);

      const disconnectCall = mockSocket.on.mock.calls.find(
        (c: any[]) => c[0] === 'disconnect'
      );
      const disconnectHandler = disconnectCall![1];

      await disconnectHandler();

      expect(socketService.removeConnection).toHaveBeenCalledWith(
        MOCK_USER_ID,
        MOCK_SOCKET_ID
      );
    });

    it('handles errors during handler registration gracefully', async () => {
      vi.mocked(registerPresenceHandlers).mockRejectedValue(
        new Error('Redis connection failed')
      );

      await expect(
        handleConnection(mockIo as any, mockSocket as any)
      ).resolves.not.toThrow();

      expect(registerMessageHandlers).toHaveBeenCalled();
      expect(registerTypingHandlers).toHaveBeenCalled();
    });

    it('disconnects socket if no userId in socket.data', async () => {
      const unauthSocket = createMockSocket({ data: {} });

      await handleConnection(mockIo as any, unauthSocket as any);

      expect(registerMessageHandlers).not.toHaveBeenCalled();
      expect(registerTypingHandlers).not.toHaveBeenCalled();
      expect(registerPresenceHandlers).not.toHaveBeenCalled();
      expect(unauthSocket.disconnect).toHaveBeenCalled();
    });
  });
});
