import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '@29chat/common';
import { createMockRoom, createMockRoomMember } from '../../helpers/mocks';

vi.mock('@29chat/database', () => ({
  roomsQueries: {
    createRoom: vi.fn(),
    getRoomById: vi.fn(),
    getRoomsByUserId: vi.fn(),
    deleteRoom: vi.fn(),
    findDirectRoomBetweenUsers: vi.fn(),
  },
  roomMembersQueries: {
    addMember: vi.fn(),
    removeMember: vi.fn(),
    getMembersByRoomId: vi.fn(),
    getMemberByRoomAndUser: vi.fn(),
    getAdminCount: vi.fn(),
  },
}));

import { roomsQueries, roomMembersQueries } from '@29chat/database';
import { createRoom, getRoomById, getRoomsByUserId, addMember, removeMember, deleteRoom } from '../../../src/services/room.service';

const mockCreateRoom = vi.mocked(roomsQueries.createRoom);
const mockGetRoomById = vi.mocked(roomsQueries.getRoomById);
const mockGetRoomsByUserId = vi.mocked(roomsQueries.getRoomsByUserId);
const mockDeleteRoom = vi.mocked(roomsQueries.deleteRoom);
const mockFindDirectRoom = vi.mocked(roomsQueries.findDirectRoomBetweenUsers);
const mockAddMember = vi.mocked(roomMembersQueries.addMember);
const mockRemoveMember = vi.mocked(roomMembersQueries.removeMember);
const mockGetMembersByRoomId = vi.mocked(roomMembersQueries.getMembersByRoomId);
const mockGetMemberByRoomAndUser = vi.mocked(roomMembersQueries.getMemberByRoomAndUser);
const mockGetAdminCount = vi.mocked(roomMembersQueries.getAdminCount);

describe('room service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createRoom', () => {
    const groupInput = {
      name: 'My Group',
      type: 'group' as const,
      createdBy: 'user-uuid-1',
      memberIds: ['user-uuid-2', 'user-uuid-3'],
    };

    it('creates room and adds creator as admin member', async () => {
      const room = createMockRoom();
      mockCreateRoom.mockResolvedValue(room);
      mockAddMember.mockResolvedValue(undefined as any);

      const result = await createRoom(groupInput);

      expect(mockCreateRoom).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'My Group',
          type: 'group',
          createdBy: 'user-uuid-1',
        })
      );
      // Creator should be added as admin
      expect(mockAddMember).toHaveBeenCalledWith(
        expect.objectContaining({
          roomId: room.id,
          userId: 'user-uuid-1',
          role: 'admin',
        })
      );
      expect(result).toEqual(expect.objectContaining({ id: room.id }));
    });

    it('adds all provided members to the room', async () => {
      const room = createMockRoom();
      mockCreateRoom.mockResolvedValue(room);
      mockAddMember.mockResolvedValue(undefined as any);

      await createRoom(groupInput);

      // Creator + 2 members = 3 addMember calls
      expect(mockAddMember).toHaveBeenCalledTimes(3);
      expect(mockAddMember).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-uuid-2', role: 'member' })
      );
      expect(mockAddMember).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-uuid-3', role: 'member' })
      );
    });

    it('throws AppError 400 for direct room with more than 2 members', async () => {
      const directInput = {
        name: 'DM',
        type: 'direct' as const,
        createdBy: 'user-uuid-1',
        memberIds: ['user-uuid-2', 'user-uuid-3'],
      };

      await expect(createRoom(directInput)).rejects.toThrow(AppError);
      await expect(createRoom(directInput)).rejects.toThrow(
        expect.objectContaining({ statusCode: 400 })
      );
    });

    it('throws AppError 409 if direct room already exists between users', async () => {
      const directInput = {
        name: 'DM',
        type: 'direct' as const,
        createdBy: 'user-uuid-1',
        memberIds: ['user-uuid-2'],
      };
      mockFindDirectRoom.mockResolvedValue(createMockRoom({ type: 'direct' }));

      await expect(createRoom(directInput)).rejects.toThrow(AppError);
      await expect(createRoom(directInput)).rejects.toThrow(
        expect.objectContaining({ statusCode: 409 })
      );
    });

    it('throws AppError 400 for empty room name', async () => {
      const input = { ...groupInput, name: '' };

      await expect(createRoom(input)).rejects.toThrow(AppError);
      await expect(createRoom(input)).rejects.toThrow(
        expect.objectContaining({ statusCode: 400 })
      );
    });

    it('throws AppError 400 for group room with 0 members', async () => {
      const input = { ...groupInput, memberIds: [] };

      await expect(createRoom(input)).rejects.toThrow(AppError);
      await expect(createRoom(input)).rejects.toThrow(
        expect.objectContaining({ statusCode: 400 })
      );
    });
  });

  describe('getRoomById', () => {
    it('returns room with members', async () => {
      const room = createMockRoom();
      const members = [
        createMockRoomMember({ userId: 'user-uuid-1', role: 'admin' }),
        createMockRoomMember({ id: 'member-uuid-2', userId: 'user-uuid-2' }),
      ];
      mockGetRoomById.mockResolvedValue(room);
      mockGetMembersByRoomId.mockResolvedValue(members);

      const result = await getRoomById('room-uuid-1');

      expect(result.room).toEqual(room);
      expect(result.members).toEqual(members);
    });

    it('throws AppError 404 when room not found', async () => {
      mockGetRoomById.mockResolvedValue(null as any);

      await expect(getRoomById('nonexistent')).rejects.toThrow(AppError);
      await expect(getRoomById('nonexistent')).rejects.toThrow(
        expect.objectContaining({ statusCode: 404 })
      );
    });
  });

  describe('getRoomsByUserId', () => {
    it('returns all rooms user belongs to', async () => {
      const rooms = [createMockRoom(), createMockRoom({ id: 'room-uuid-2', name: 'Room 2' })];
      mockGetRoomsByUserId.mockResolvedValue(rooms);

      const result = await getRoomsByUserId('user-uuid-1');

      expect(mockGetRoomsByUserId).toHaveBeenCalledWith('user-uuid-1');
      expect(result).toHaveLength(2);
    });

    it('returns empty array for user with no rooms', async () => {
      mockGetRoomsByUserId.mockResolvedValue([]);

      const result = await getRoomsByUserId('user-uuid-99');

      expect(result).toEqual([]);
    });
  });

  describe('addMember', () => {
    it('adds member to room and returns updated members', async () => {
      const room = createMockRoom();
      mockGetRoomById.mockResolvedValue(room);
      mockGetMemberByRoomAndUser.mockResolvedValue(null as any);
      mockAddMember.mockResolvedValue(undefined as any);
      const members = [createMockRoomMember()];
      mockGetMembersByRoomId.mockResolvedValue(members);

      const result = await addMember('room-uuid-1', 'user-uuid-2');

      expect(mockAddMember).toHaveBeenCalledWith(
        expect.objectContaining({
          roomId: 'room-uuid-1',
          userId: 'user-uuid-2',
          role: 'member',
        })
      );
      expect(result).toEqual(members);
    });

    it('throws AppError 404 if room not found', async () => {
      mockGetRoomById.mockResolvedValue(null as any);

      await expect(addMember('nonexistent', 'user-uuid-2')).rejects.toThrow(AppError);
      await expect(addMember('nonexistent', 'user-uuid-2')).rejects.toThrow(
        expect.objectContaining({ statusCode: 404 })
      );
    });

    it('throws AppError 409 if user already a member', async () => {
      mockGetRoomById.mockResolvedValue(createMockRoom());
      mockGetMemberByRoomAndUser.mockResolvedValue(createMockRoomMember());

      await expect(addMember('room-uuid-1', 'user-uuid-1')).rejects.toThrow(AppError);
      await expect(addMember('room-uuid-1', 'user-uuid-1')).rejects.toThrow(
        expect.objectContaining({ statusCode: 409 })
      );
    });
  });

  describe('removeMember', () => {
    it('removes member from room', async () => {
      const room = createMockRoom();
      const adminMember = createMockRoomMember({ userId: 'user-uuid-1', role: 'admin' });
      const targetMember = createMockRoomMember({ id: 'member-uuid-2', userId: 'user-uuid-2' });
      mockGetRoomById.mockResolvedValue(room);
      mockGetMemberByRoomAndUser
        .mockResolvedValueOnce(adminMember) // requestor is admin
        .mockResolvedValueOnce(targetMember); // target exists
      mockRemoveMember.mockResolvedValue(undefined as any);

      await removeMember('room-uuid-1', 'user-uuid-2', 'user-uuid-1');

      expect(mockRemoveMember).toHaveBeenCalledWith('room-uuid-1', 'user-uuid-2');
    });

    it('throws AppError 403 if non-admin tries to remove', async () => {
      const room = createMockRoom();
      const nonAdminMember = createMockRoomMember({ userId: 'user-uuid-3', role: 'member' });
      mockGetRoomById.mockResolvedValue(room);
      mockGetMemberByRoomAndUser.mockResolvedValue(nonAdminMember);

      await expect(removeMember('room-uuid-1', 'user-uuid-2', 'user-uuid-3')).rejects.toThrow(AppError);
      await expect(removeMember('room-uuid-1', 'user-uuid-2', 'user-uuid-3')).rejects.toThrow(
        expect.objectContaining({ statusCode: 403 })
      );
    });

    it('throws AppError 400 if trying to remove last admin', async () => {
      const room = createMockRoom();
      const adminMember = createMockRoomMember({ userId: 'user-uuid-1', role: 'admin' });
      mockGetRoomById.mockResolvedValue(room);
      mockGetMemberByRoomAndUser.mockResolvedValue(adminMember);
      mockGetAdminCount.mockResolvedValue(1);

      await expect(removeMember('room-uuid-1', 'user-uuid-1', 'user-uuid-1')).rejects.toThrow(AppError);
      await expect(removeMember('room-uuid-1', 'user-uuid-1', 'user-uuid-1')).rejects.toThrow(
        expect.objectContaining({ statusCode: 400 })
      );
    });

    it('throws AppError 400 if trying to remove room creator', async () => {
      const room = createMockRoom({ createdBy: 'user-uuid-2' });
      const adminMember = createMockRoomMember({ userId: 'user-uuid-1', role: 'admin' });
      mockGetRoomById.mockResolvedValue(room);
      mockGetMemberByRoomAndUser.mockResolvedValue(adminMember);

      await expect(removeMember('room-uuid-1', 'user-uuid-2', 'user-uuid-1')).rejects.toThrow(AppError);
      await expect(removeMember('room-uuid-1', 'user-uuid-2', 'user-uuid-1')).rejects.toThrow(
        expect.objectContaining({ statusCode: 400 })
      );
    });
  });

  describe('deleteRoom', () => {
    it('deletes room when requester is admin', async () => {
      const room = createMockRoom();
      const adminMember = createMockRoomMember({ userId: 'user-uuid-1', role: 'admin' });
      mockGetRoomById.mockResolvedValue(room);
      mockGetMemberByRoomAndUser.mockResolvedValue(adminMember);
      mockDeleteRoom.mockResolvedValue(undefined as any);

      await deleteRoom('room-uuid-1', 'user-uuid-1');

      expect(mockDeleteRoom).toHaveBeenCalledWith('room-uuid-1');
    });

    it('throws AppError 403 if non-admin tries to delete', async () => {
      const room = createMockRoom();
      const member = createMockRoomMember({ userId: 'user-uuid-2', role: 'member' });
      mockGetRoomById.mockResolvedValue(room);
      mockGetMemberByRoomAndUser.mockResolvedValue(member);

      await expect(deleteRoom('room-uuid-1', 'user-uuid-2')).rejects.toThrow(AppError);
      await expect(deleteRoom('room-uuid-1', 'user-uuid-2')).rejects.toThrow(
        expect.objectContaining({ statusCode: 403 })
      );
    });
  });
});
