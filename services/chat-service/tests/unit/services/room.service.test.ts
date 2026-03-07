import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '@29chat/common';
import { MOCK_USER_ID, MOCK_USER_ID_2, MOCK_ROOM_ID } from '../../helpers/mocks';

vi.mock('@29chat/database', () => ({
  roomsQueries: {
    createRoomWithMember: vi.fn(),
    getRoomById: vi.fn(),
    addRoomMember: vi.fn(),
    removeRoomMember: vi.fn(),
    getRoomMembers: vi.fn(),
    getRoomsByUserId: vi.fn(),
    isRoomMember: vi.fn(),
  },
}));

import { roomsQueries } from '@29chat/database';
import {
  createRoom,
  joinRoom,
  leaveRoom,
  getRoomMembers,
  getRoomsByUserId,
} from '../../../src/services/room.service';

const mockDbCreateRoomWithMember = vi.mocked(roomsQueries.createRoomWithMember);
const mockDbGetRoomById = vi.mocked(roomsQueries.getRoomById);
const mockDbAddMember = vi.mocked(roomsQueries.addRoomMember);
const mockDbRemoveMember = vi.mocked(roomsQueries.removeRoomMember);
const mockDbGetMembers = vi.mocked(roomsQueries.getRoomMembers);
const mockDbGetRoomsByUser = vi.mocked(roomsQueries.getRoomsByUserId);
const mockDbIsRoomMember = vi.mocked(roomsQueries.isRoomMember);

describe('room service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createRoom', () => {
    it('inserts room and adds creator as admin member', async () => {
      const room = {
        id: MOCK_ROOM_ID,
        name: 'General',
        type: 'group' as const,
        createdBy: MOCK_USER_ID,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const member = { id: 'member-1', roomId: MOCK_ROOM_ID, userId: MOCK_USER_ID, role: 'admin' as const, joinedAt: new Date() };
      mockDbCreateRoomWithMember.mockResolvedValue({ room, member });

      const result = await createRoom('General', 'group', MOCK_USER_ID);

      expect(mockDbCreateRoomWithMember).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'General',
          type: 'group',
          createdBy: MOCK_USER_ID,
        }),
        MOCK_USER_ID,
        'admin',
      );
      expect(result).toEqual(room);
    });

    it('throws AppError 400 if room name is empty', async () => {
      await expect(createRoom('', 'group', MOCK_USER_ID)).rejects.toThrow(AppError);
      await expect(createRoom('', 'group', MOCK_USER_ID)).rejects.toThrow(
        'Room name cannot be empty'
      );
    });

    it('throws AppError 400 if room type is invalid', async () => {
      await expect(createRoom('General', 'invalid' as any, MOCK_USER_ID)).rejects.toThrow(
        AppError
      );
    });
  });

  describe('joinRoom', () => {
    it('adds user as member with role member', async () => {
      const room = { id: MOCK_ROOM_ID, name: 'General', type: 'group' as const, createdBy: MOCK_USER_ID, createdAt: new Date(), updatedAt: new Date() };
      mockDbGetRoomById.mockResolvedValue(room);
      mockDbIsRoomMember.mockResolvedValue(false);
      mockDbAddMember.mockResolvedValue({ id: 'member-2', roomId: MOCK_ROOM_ID, userId: MOCK_USER_ID_2, role: 'member' as const, joinedAt: new Date() });

      await joinRoom(MOCK_ROOM_ID, MOCK_USER_ID_2);

      expect(mockDbAddMember).toHaveBeenCalledWith(
        expect.objectContaining({
          roomId: MOCK_ROOM_ID,
          userId: MOCK_USER_ID_2,
          role: 'member',
        })
      );
    });

    it('throws AppError 404 if room does not exist', async () => {
      mockDbGetRoomById.mockResolvedValue(null);

      await expect(joinRoom('nonexistent', MOCK_USER_ID_2)).rejects.toThrow(AppError);
      await expect(joinRoom('nonexistent', MOCK_USER_ID_2)).rejects.toThrow('Room not found');
    });

    it('throws AppError 409 if user is already a member', async () => {
      const room = { id: MOCK_ROOM_ID, name: 'General', type: 'group' as const, createdBy: MOCK_USER_ID, createdAt: new Date(), updatedAt: new Date() };
      mockDbGetRoomById.mockResolvedValue(room);
      mockDbIsRoomMember.mockResolvedValue(true);

      await expect(joinRoom(MOCK_ROOM_ID, MOCK_USER_ID_2)).rejects.toThrow(AppError);
      await expect(joinRoom(MOCK_ROOM_ID, MOCK_USER_ID_2)).rejects.toThrow('Already a member');
    });
  });

  describe('leaveRoom', () => {
    it('removes user from room members', async () => {
      const room = { id: MOCK_ROOM_ID, name: 'General', type: 'group' as const, createdBy: MOCK_USER_ID, createdAt: new Date(), updatedAt: new Date() };
      mockDbGetRoomById.mockResolvedValue(room);
      mockDbIsRoomMember.mockResolvedValue(true);
      mockDbRemoveMember.mockResolvedValue(undefined as any);

      await leaveRoom(MOCK_ROOM_ID, MOCK_USER_ID_2);

      expect(mockDbRemoveMember).toHaveBeenCalledWith(MOCK_ROOM_ID, MOCK_USER_ID_2);
    });

    it('throws AppError 404 if room does not exist', async () => {
      mockDbGetRoomById.mockResolvedValue(null);

      await expect(leaveRoom('nonexistent', MOCK_USER_ID)).rejects.toThrow(AppError);
      await expect(leaveRoom('nonexistent', MOCK_USER_ID)).rejects.toThrow('Room not found');
    });

    it('throws AppError 400 if user is not a member', async () => {
      const room = { id: MOCK_ROOM_ID, name: 'General', type: 'group' as const, createdBy: MOCK_USER_ID, createdAt: new Date(), updatedAt: new Date() };
      mockDbGetRoomById.mockResolvedValue(room);
      mockDbIsRoomMember.mockResolvedValue(false);

      await expect(leaveRoom(MOCK_ROOM_ID, MOCK_USER_ID_2)).rejects.toThrow(AppError);
      await expect(leaveRoom(MOCK_ROOM_ID, MOCK_USER_ID_2)).rejects.toThrow('Not a member');
    });
  });

  describe('getRoomMembers', () => {
    it('returns array of room members', async () => {
      const members = [
        { id: 'member-1', roomId: MOCK_ROOM_ID, userId: MOCK_USER_ID, role: 'admin' as const, joinedAt: new Date() },
        { id: 'member-2', roomId: MOCK_ROOM_ID, userId: MOCK_USER_ID_2, role: 'member' as const, joinedAt: new Date() },
      ];
      const room = { id: MOCK_ROOM_ID, name: 'General', type: 'group' as const, createdBy: MOCK_USER_ID, createdAt: new Date(), updatedAt: new Date() };
      mockDbGetRoomById.mockResolvedValue(room);
      mockDbGetMembers.mockResolvedValue(members);

      const result = await getRoomMembers(MOCK_ROOM_ID);

      expect(mockDbGetMembers).toHaveBeenCalledWith(MOCK_ROOM_ID);
      expect(result).toEqual(members);
    });

    it('throws AppError 404 if room does not exist', async () => {
      mockDbGetRoomById.mockResolvedValue(null);

      await expect(getRoomMembers('nonexistent')).rejects.toThrow(AppError);
      await expect(getRoomMembers('nonexistent')).rejects.toThrow('Room not found');
    });
  });

  describe('getRoomsByUserId', () => {
    it('returns all rooms the user is a member of', async () => {
      const rooms = [
        { id: MOCK_ROOM_ID, name: 'General', type: 'group' as const, createdBy: MOCK_USER_ID, createdAt: new Date(), updatedAt: new Date() },
      ];
      mockDbGetRoomsByUser.mockResolvedValue(rooms);

      const result = await getRoomsByUserId(MOCK_USER_ID);

      expect(mockDbGetRoomsByUser).toHaveBeenCalledWith(MOCK_USER_ID);
      expect(result).toEqual(rooms);
    });

    it('returns empty array if user has no rooms', async () => {
      mockDbGetRoomsByUser.mockResolvedValue([]);

      const result = await getRoomsByUserId(MOCK_USER_ID);

      expect(result).toEqual([]);
    });
  });
});
