import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { AppError } from '@29chat/common';

vi.mock('../../../src/services/room.service', () => ({
  createRoom: vi.fn(),
  joinRoom: vi.fn(),
  leaveRoom: vi.fn(),
  getRoomMembers: vi.fn(),
  getRoomsByUserId: vi.fn(),
}));

import * as roomService from '../../../src/services/room.service';
import * as controller from '../../../src/controllers/room.controller';
import { MOCK_USER_ID, MOCK_ROOM_ID } from '../../helpers/mocks';

function createMockReq(overrides: Partial<Request> = {}): Request {
  return {
    body: {},
    params: {},
    user: { id: MOCK_USER_ID },
    ...overrides,
  } as unknown as Request;
}

function createMockRes(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  };
  return res as unknown as Response;
}

describe('room controller', () => {
  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    res = createMockRes();
    next = vi.fn();
  });

  describe('createRoom', () => {
    it('creates a room and returns 201', async () => {
      const room = { id: MOCK_ROOM_ID, name: 'general', type: 'group' };
      vi.mocked(roomService.createRoom).mockResolvedValue(room as any);

      const req = createMockReq({
        body: { name: 'general', type: 'group' },
      });

      await controller.createRoom(req, res, next);

      expect(roomService.createRoom).toHaveBeenCalledWith('general', 'group', MOCK_USER_ID);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ room });
    });

    it('passes errors to next', async () => {
      vi.mocked(roomService.createRoom).mockRejectedValue(new AppError('Failed to create room', 500));

      const req = createMockReq({
        body: { name: 'general', type: 'group' },
      });

      await controller.createRoom(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });
  });

  describe('getRooms', () => {
    it('returns rooms for the authenticated user', async () => {
      const rooms = [{ id: MOCK_ROOM_ID, name: 'general' }];
      vi.mocked(roomService.getRoomsByUserId).mockResolvedValue(rooms as any);

      const req = createMockReq();

      await controller.getRooms(req, res, next);

      expect(roomService.getRoomsByUserId).toHaveBeenCalledWith(MOCK_USER_ID);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ rooms });
    });

    it('passes errors to next', async () => {
      vi.mocked(roomService.getRoomsByUserId).mockRejectedValue(new AppError('Failed to get rooms', 500));

      const req = createMockReq();

      await controller.getRooms(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });
  });

  describe('joinRoom', () => {
    it('joins a room and returns 200', async () => {
      vi.mocked(roomService.joinRoom).mockResolvedValue(undefined);

      const req = createMockReq({ params: { roomId: MOCK_ROOM_ID } } as any);

      await controller.joinRoom(req, res, next);

      expect(roomService.joinRoom).toHaveBeenCalledWith(MOCK_ROOM_ID, MOCK_USER_ID);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Joined room' });
    });

    it('passes errors to next', async () => {
      vi.mocked(roomService.joinRoom).mockRejectedValue(new AppError('Failed to join room', 500));

      const req = createMockReq({ params: { roomId: MOCK_ROOM_ID } } as any);

      await controller.joinRoom(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });
  });

  describe('leaveRoom', () => {
    it('leaves a room and returns 200', async () => {
      vi.mocked(roomService.leaveRoom).mockResolvedValue(undefined);

      const req = createMockReq({ params: { roomId: MOCK_ROOM_ID } } as any);

      await controller.leaveRoom(req, res, next);

      expect(roomService.leaveRoom).toHaveBeenCalledWith(MOCK_ROOM_ID, MOCK_USER_ID);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Left room' });
    });

    it('passes errors to next', async () => {
      vi.mocked(roomService.leaveRoom).mockRejectedValue(new AppError('Failed to leave room', 500));

      const req = createMockReq({ params: { roomId: MOCK_ROOM_ID } } as any);

      await controller.leaveRoom(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });
  });

  describe('getRoomMembers', () => {
    it('returns members for a room', async () => {
      const members = [{ userId: MOCK_USER_ID, role: 'admin' }];
      vi.mocked(roomService.getRoomMembers).mockResolvedValue(members as any);

      const req = createMockReq({ params: { roomId: MOCK_ROOM_ID } } as any);

      await controller.getRoomMembers(req, res, next);

      expect(roomService.getRoomMembers).toHaveBeenCalledWith(MOCK_ROOM_ID);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ members });
    });

    it('passes errors to next', async () => {
      vi.mocked(roomService.getRoomMembers).mockRejectedValue(new AppError('Failed to get members', 500));

      const req = createMockReq({ params: { roomId: MOCK_ROOM_ID } } as any);

      await controller.getRoomMembers(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });
  });
});
