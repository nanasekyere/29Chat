import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import { createMockRoom, createMockRoomMember, createMockMessage } from '../helpers/mocks';

// Mock database layer
vi.mock('@29chat/database', () => ({
  roomsQueries: {
    getRoomById: vi.fn(),
    getRoomsByUserId: vi.fn(),
  },
  roomMembersQueries: {
    getMemberByRoomAndUser: vi.fn(),
    getMembersByRoomId: vi.fn(),
  },
  messagesQueries: {
    createMessage: vi.fn(),
    getMessageById: vi.fn(),
    getMessagesByRoomId: vi.fn(),
    updateMessage: vi.fn(),
    softDeleteMessage: vi.fn(),
  },
  usersQueries: {
    updateUser: vi.fn(),
  },
}));

import { roomsQueries, roomMembersQueries, messagesQueries, usersQueries } from '@29chat/database';
import { setupSocketServer } from '../../src/app';

const JWT_SECRET = 'test-secret';
const PORT = 0; // Random available port

function createToken(payload: Record<string, any>) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

function connectClient(port: number, token?: string): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    const client = Client(`http://localhost:${port}`, {
      auth: token ? { token } : {},
      transports: ['websocket'],
      forceNew: true,
    });
    client.on('connect', () => resolve(client));
    client.on('connect_error', (err) => reject(err));
    setTimeout(() => reject(new Error('Connection timeout')), 3000);
  });
}

describe('socket.io integration', () => {
  let httpServer: ReturnType<typeof createServer>;
  let ioServer: Server;
  let port: number;

  const user1 = { id: 'user-uuid-1', email: 'user1@example.com', name: 'User One' };
  const user2 = { id: 'user-uuid-2', email: 'user2@example.com', name: 'User Two' };

  beforeAll(async () => {
    process.env.JWT_SECRET = JWT_SECRET;
    httpServer = createServer();
    ioServer = setupSocketServer(httpServer);
    await new Promise<void>((resolve) => {
      httpServer.listen(PORT, () => {
        port = (httpServer.address() as any).port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    ioServer.close();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: user belongs to room-1
    vi.mocked(roomsQueries.getRoomsByUserId).mockResolvedValue([
      createMockRoom({ id: 'room-1' }),
    ]);
    vi.mocked(roomMembersQueries.getMemberByRoomAndUser).mockResolvedValue(
      createMockRoomMember()
    );
    vi.mocked(roomsQueries.getRoomById).mockResolvedValue(createMockRoom({ id: 'room-1' }));
  });

  describe('authentication', () => {
    it('connects with valid JWT', async () => {
      const token = createToken(user1);
      const client = await connectClient(port, token);
      expect(client.connected).toBe(true);
      client.disconnect();
    });

    it('rejects connection without token', async () => {
      await expect(connectClient(port)).rejects.toThrow();
    });

    it('rejects connection with expired token', async () => {
      const token = jwt.sign(user1, JWT_SECRET, { expiresIn: '0s' });
      await expect(connectClient(port, token)).rejects.toThrow();
    });
  });

  describe('messaging', () => {
    it('receives new_message in same room after send_message', async () => {
      const message = createMockMessage();
      vi.mocked(messagesQueries.createMessage).mockResolvedValue(message);

      const token = createToken(user1);
      const client = await connectClient(port, token);

      const received = new Promise((resolve) => {
        client.on('new_message', resolve);
      });

      client.emit('send_message', {
        roomId: 'room-1',
        content: 'Hello!',
        contentType: 'text',
      });

      const msg = await received;
      expect(msg).toEqual(expect.objectContaining({ content: 'Hello, world!' }));
      client.disconnect();
    });

    it('two clients in same room both receive new_message', async () => {
      const message = createMockMessage();
      vi.mocked(messagesQueries.createMessage).mockResolvedValue(message);

      const token1 = createToken(user1);
      const token2 = createToken(user2);
      const client1 = await connectClient(port, token1);
      const client2 = await connectClient(port, token2);

      const received1 = new Promise((resolve) => {
        client1.on('new_message', resolve);
      });
      const received2 = new Promise((resolve) => {
        client2.on('new_message', resolve);
      });

      client1.emit('send_message', {
        roomId: 'room-1',
        content: 'Hello both!',
        contentType: 'text',
      });

      const [msg1, msg2] = await Promise.all([received1, received2]);
      expect(msg1).toBeDefined();
      expect(msg2).toBeDefined();

      client1.disconnect();
      client2.disconnect();
    });

    it('client not in room does NOT receive new_message', async () => {
      const message = createMockMessage();
      vi.mocked(messagesQueries.createMessage).mockResolvedValue(message);

      // user2 is NOT in any rooms
      vi.mocked(roomsQueries.getRoomsByUserId)
        .mockResolvedValueOnce([createMockRoom({ id: 'room-1' })]) // user1
        .mockResolvedValueOnce([]); // user2

      const token1 = createToken(user1);
      const token2 = createToken(user2);
      const client1 = await connectClient(port, token1);
      const client2 = await connectClient(port, token2);

      let client2Received = false;
      client2.on('new_message', () => {
        client2Received = true;
      });

      client1.emit('send_message', {
        roomId: 'room-1',
        content: 'Secret!',
        contentType: 'text',
      });

      // Wait a bit then check
      await new Promise((r) => setTimeout(r, 200));
      expect(client2Received).toBe(false);

      client1.disconnect();
      client2.disconnect();
    });

    it('edit_message emits message_edited to room', async () => {
      const editedMessage = createMockMessage({ content: 'Edited', editedAt: new Date() });
      vi.mocked(messagesQueries.getMessageById).mockResolvedValue(
        createMockMessage({ senderId: user1.id })
      );
      vi.mocked(messagesQueries.updateMessage).mockResolvedValue(editedMessage);

      const token = createToken(user1);
      const client = await connectClient(port, token);

      const received = new Promise((resolve) => {
        client.on('message_edited', resolve);
      });

      client.emit('edit_message', {
        messageId: 'message-uuid-1',
        content: 'Edited',
      });

      const msg = await received;
      expect(msg).toEqual(expect.objectContaining({ content: 'Edited' }));
      client.disconnect();
    });

    it('delete_message emits message_deleted to room', async () => {
      vi.mocked(messagesQueries.getMessageById).mockResolvedValue(
        createMockMessage({ senderId: user1.id })
      );
      vi.mocked(messagesQueries.softDeleteMessage).mockResolvedValue(undefined as any);

      const token = createToken(user1);
      const client = await connectClient(port, token);

      const received = new Promise((resolve) => {
        client.on('message_deleted', resolve);
      });

      client.emit('delete_message', {
        messageId: 'message-uuid-1',
        roomId: 'room-1',
      });

      const msg = await received;
      expect(msg).toEqual(expect.objectContaining({ messageId: 'message-uuid-1' }));
      client.disconnect();
    });
  });

  describe('typing', () => {
    it('typing_start broadcasts user_typing to other room members', async () => {
      const token1 = createToken(user1);
      const token2 = createToken(user2);
      const client1 = await connectClient(port, token1);
      const client2 = await connectClient(port, token2);

      const received = new Promise((resolve) => {
        client2.on('user_typing', resolve);
      });

      client1.emit('typing_start', { roomId: 'room-1' });

      const data = await received;
      expect(data).toEqual(expect.objectContaining({
        userId: user1.id,
        roomId: 'room-1',
      }));

      client1.disconnect();
      client2.disconnect();
    });
  });

  describe('presence', () => {
    it('user_offline emitted when client disconnects', async () => {
      const token1 = createToken(user1);
      const token2 = createToken(user2);
      const client1 = await connectClient(port, token1);
      const client2 = await connectClient(port, token2);

      const received = new Promise((resolve) => {
        client2.on('user_offline', resolve);
      });

      client1.disconnect();

      const data = await received;
      expect(data).toEqual(expect.objectContaining({ userId: user1.id }));

      client2.disconnect();
    });
  });

  describe('edge cases', () => {
    it('handles malformed event payloads gracefully', async () => {
      const token = createToken(user1);
      const client = await connectClient(port, token);

      const received = new Promise((resolve) => {
        client.on('error', resolve);
      });

      // Send garbage payload
      client.emit('send_message', null);

      const err = await received;
      expect(err).toEqual(expect.objectContaining({ message: expect.any(String) }));
      client.disconnect();
    });

    it('messages arrive in order during rapid fire', async () => {
      const messages = Array.from({ length: 10 }, (_, i) =>
        createMockMessage({ id: `msg-${i}`, content: `Message ${i}` })
      );
      let callIndex = 0;
      vi.mocked(messagesQueries.createMessage).mockImplementation(async () => {
        return messages[callIndex++];
      });

      const token = createToken(user1);
      const client = await connectClient(port, token);

      const received: any[] = [];
      client.on('new_message', (msg) => received.push(msg));

      // Rapid-fire 10 messages
      for (let i = 0; i < 10; i++) {
        client.emit('send_message', {
          roomId: 'room-1',
          content: `Message ${i}`,
          contentType: 'text',
        });
      }

      // Wait for all to arrive
      await new Promise((r) => setTimeout(r, 500));
      expect(received).toHaveLength(10);

      // Verify ordering
      for (let i = 0; i < 10; i++) {
        expect(received[i].content).toBe(`Message ${i}`);
      }

      client.disconnect();
    });

    it('multiple simultaneous connections from same user handled', async () => {
      const token = createToken(user1);
      const client1 = await connectClient(port, token);
      const client2 = await connectClient(port, token);

      // Both should be connected
      expect(client1.connected).toBe(true);
      expect(client2.connected).toBe(true);

      client1.disconnect();
      client2.disconnect();
    });
  });
});
