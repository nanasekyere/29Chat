import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createMockMessage, createMockMessages, MOCK_USER_ID, MOCK_ROOM_ID, MOCK_MSG_ID } from '../helpers/mocks';

// Mock db
vi.mock('@29chat/database', () => ({
  messagesQueries: {
    createMessage: vi.fn(),
    getMessageById: vi.fn(),
    getMessagesByRoomId: vi.fn(),
    updateMessage: vi.fn(),
    softDeleteMessage: vi.fn(),
  },
}));

// Mock Redis client
const mockRedisClient = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  keys: vi.fn(),
}));

vi.mock('../../src/config/redis', () => ({
  redis: mockRedisClient,
}));

import { messagesQueries } from '@29chat/database';
import express from 'express';
import messageRoutes from '../../src/routes/message.routes';
import { createErrorMiddleware } from '@29chat/common';

const OTHER_USER_ID = '00000000-0000-4000-a000-000000000002';
const NONEXISTENT_ID = '00000000-0000-4000-a000-000000000999';

// Test app that simulates gateway setting req.user
const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  req.user = { id: MOCK_USER_ID } as Express.User;
  next();
});
app.use('/', messageRoutes);
app.use(createErrorMiddleware('message-storage-service'));

const mockGetById = vi.mocked(messagesQueries.getMessageById);
const mockGetByRoom = vi.mocked(messagesQueries.getMessagesByRoomId);
const mockUpdate = vi.mocked(messagesQueries.updateMessage);
const mockSoftDelete = vi.mocked(messagesQueries.softDeleteMessage);

describe('message routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedisClient.get.mockResolvedValue(null);
    mockRedisClient.set.mockResolvedValue('OK');
    mockRedisClient.del.mockResolvedValue(1);
    mockRedisClient.keys.mockResolvedValue([]);
  });

  describe('GET /:roomId', () => {
    it('200 - returns messages for a room', async () => {
      const messages = createMockMessages(3);
      mockGetByRoom.mockResolvedValue(messages);

      const res = await request(app).get(`/${MOCK_ROOM_ID}`);

      expect(res.status).toBe(200);
      expect(res.body.messages).toHaveLength(3);
    });

    it('200 - accepts pagination query params', async () => {
      mockGetByRoom.mockResolvedValue([]);

      const res = await request(app).get(`/${MOCK_ROOM_ID}?limit=10&offset=5`);

      expect(res.status).toBe(200);
      expect(mockGetByRoom).toHaveBeenCalledWith(MOCK_ROOM_ID, 10, 5);
    });

    it('200 - returns empty array when no messages', async () => {
      mockGetByRoom.mockResolvedValue([]);

      const res = await request(app).get(`/${MOCK_ROOM_ID}`);

      expect(res.status).toBe(200);
      expect(res.body.messages).toEqual([]);
    });

    it('400 - invalid roomId', async () => {
      const res = await request(app).get('/not-a-uuid');

      expect(res.status).toBe(400);
    });
  });

  describe('GET /:roomId/:messageId', () => {
    it('200 - returns a single message', async () => {
      const msg = createMockMessage();
      mockGetById.mockResolvedValue(msg);

      const res = await request(app).get(`/${MOCK_ROOM_ID}/${MOCK_MSG_ID}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBeDefined();
      expect(res.body.message.id).toBe(MOCK_MSG_ID);
    });

    it('404 - message not found', async () => {
      mockGetById.mockResolvedValue(null);

      const res = await request(app).get(`/${MOCK_ROOM_ID}/${NONEXISTENT_ID}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Message not found');
    });
  });

  describe('PUT /:messageId', () => {
    it('200 - updates message content', async () => {
      const existing = createMockMessage();
      const updated = createMockMessage({ content: 'Updated content', editedAt: new Date() });
      mockGetById.mockResolvedValue(existing);
      mockUpdate.mockResolvedValue(updated);

      const res = await request(app)
        .put(`/${MOCK_MSG_ID}`)
        .send({ content: 'Updated content' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBeDefined();
    });

    it('400 - empty content', async () => {
      const existing = createMockMessage();
      mockGetById.mockResolvedValue(existing);

      const res = await request(app)
        .put(`/${MOCK_MSG_ID}`)
        .send({ content: '' });

      expect(res.status).toBe(400);
    });

    it('403 - not message owner', async () => {
      const existing = createMockMessage({ senderId: OTHER_USER_ID });
      mockGetById.mockResolvedValue(existing);

      const res = await request(app)
        .put(`/${MOCK_MSG_ID}`)
        .send({ content: 'Updated' });

      expect(res.status).toBe(403);
    });

    it('404 - message not found', async () => {
      mockGetById.mockResolvedValue(null);

      const res = await request(app)
        .put(`/${NONEXISTENT_ID}`)
        .send({ content: 'Updated' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /:messageId', () => {
    it('204 - deletes message successfully', async () => {
      const existing = createMockMessage();
      mockGetById.mockResolvedValue(existing);
      mockSoftDelete.mockResolvedValue(undefined);

      const res = await request(app)
        .delete(`/${MOCK_MSG_ID}`);

      expect(res.status).toBe(204);
    });

    it('403 - not message owner', async () => {
      const existing = createMockMessage({ senderId: OTHER_USER_ID });
      mockGetById.mockResolvedValue(existing);

      const res = await request(app)
        .delete(`/${MOCK_MSG_ID}`);

      expect(res.status).toBe(403);
    });

    it('404 - message not found', async () => {
      mockGetById.mockResolvedValue(null);

      const res = await request(app)
        .delete(`/${NONEXISTENT_ID}`);

      expect(res.status).toBe(404);
    });
  });
});
