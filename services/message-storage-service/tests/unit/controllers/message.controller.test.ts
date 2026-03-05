import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '@29chat/common';
import { createMockMessage, createMockMessages } from '../../helpers/mocks';

vi.mock('../../../src/services/message.service', () => ({
  getMessageById: vi.fn(),
  getMessagesByRoomId: vi.fn(),
  updateMessage: vi.fn(),
  softDeleteMessage: vi.fn(),
}));

import * as messageService from '../../../src/services/message.service';
import { getMessages, getMessage, updateMessage, deleteMessage } from '../../../src/controllers/message.controller';

const mockGetByRoom = vi.mocked(messageService.getMessagesByRoomId);
const mockGetById = vi.mocked(messageService.getMessageById);
const mockUpdate = vi.mocked(messageService.updateMessage);
const mockDelete = vi.mocked(messageService.softDeleteMessage);

function createMockReq(overrides: any = {}) {
  return {
    params: {},
    query: {},
    body: {},
    user: { id: '00000000-0000-4000-a000-000000000001' },
    ...overrides,
  } as any;
}

function createMockRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  return res;
}

describe('message controller', () => {
  const next = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMessages', () => {
    it('returns 200 with messages from req.params.roomId', async () => {
      const messages = createMockMessages(3);
      mockGetByRoom.mockResolvedValue(messages);
      const req = createMockReq({ params: { roomId: '00000000-0000-4000-a000-000000000010' }, query: {} });
      const res = createMockRes();

      await getMessages(req, res, next);

      expect(mockGetByRoom).toHaveBeenCalledWith('00000000-0000-4000-a000-000000000010', 50, 0);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ messages });
    });

    it('passes limit and offset from query params', async () => {
      mockGetByRoom.mockResolvedValue([]);
      const req = createMockReq({
        params: { roomId: '00000000-0000-4000-a000-000000000010' },
        query: { limit: '20', offset: '10' },
      });
      const res = createMockRes();

      await getMessages(req, res, next);

      expect(mockGetByRoom).toHaveBeenCalledWith('00000000-0000-4000-a000-000000000010', 20, 10);
    });

    it('calls next with error on service failure', async () => {
      const error = new Error('Service error');
      mockGetByRoom.mockRejectedValue(error);
      const req = createMockReq({ params: { roomId: '00000000-0000-4000-a000-000000000010' } });
      const res = createMockRes();

      await getMessages(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getMessage', () => {
    it('returns 200 with message from req.params.messageId', async () => {
      const msg = createMockMessage();
      mockGetById.mockResolvedValue(msg);
      const req = createMockReq({ params: { messageId: '00000000-0000-4000-a000-000000000100' } });
      const res = createMockRes();

      await getMessage(req, res, next);

      expect(mockGetById).toHaveBeenCalledWith('00000000-0000-4000-a000-000000000100');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: msg });
    });

    it('calls next with AppError 404 when message not found', async () => {
      mockGetById.mockRejectedValue(new AppError('Message not found', 404));
      const req = createMockReq({ params: { messageId: 'nonexistent' } });
      const res = createMockRes();

      await getMessage(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Message not found');
    });

    it('calls next with error on service failure', async () => {
      const error = new Error('Service error');
      mockGetById.mockRejectedValue(error);
      const req = createMockReq({ params: { messageId: '00000000-0000-4000-a000-000000000100' } });
      const res = createMockRes();

      await getMessage(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('updateMessage', () => {
    it('returns 200 with updated message', async () => {
      const updated = createMockMessage({ content: 'Updated' });
      mockUpdate.mockResolvedValue(updated);
      const req = createMockReq({
        params: { messageId: '00000000-0000-4000-a000-000000000100' },
        body: { content: 'Updated' },
        user: { id: '00000000-0000-4000-a000-000000000001' },
      });
      const res = createMockRes();

      await updateMessage(req, res, next);

      expect(mockUpdate).toHaveBeenCalledWith('00000000-0000-4000-a000-000000000100', '00000000-0000-4000-a000-000000000001', 'Updated');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: updated });
    });

    it('calls next with error on service failure', async () => {
      const error = new AppError('Not authorized', 403);
      mockUpdate.mockRejectedValue(error);
      const req = createMockReq({
        params: { messageId: '00000000-0000-4000-a000-000000000100' },
        body: { content: 'Updated' },
        user: { id: '00000000-0000-4000-a000-000000000001' },
      });
      const res = createMockRes();

      await updateMessage(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('deleteMessage', () => {
    it('returns 204 on successful delete', async () => {
      mockDelete.mockResolvedValue(undefined);
      const req = createMockReq({
        params: { messageId: '00000000-0000-4000-a000-000000000100' },
        user: { id: '00000000-0000-4000-a000-000000000001' },
      });
      const res = createMockRes();

      await deleteMessage(req, res, next);

      expect(mockDelete).toHaveBeenCalledWith('00000000-0000-4000-a000-000000000100', '00000000-0000-4000-a000-000000000001');
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    it('calls next with error on service failure', async () => {
      const error = new AppError('Not authorized', 403);
      mockDelete.mockRejectedValue(error);
      const req = createMockReq({
        params: { messageId: '00000000-0000-4000-a000-000000000100' },
        user: { id: '00000000-0000-4000-a000-000000000001' },
      });
      const res = createMockRes();

      await deleteMessage(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
