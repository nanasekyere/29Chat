import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createMockRoom, createMockRoomMember } from '../helpers/mocks';

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
import app from '../../src/app';

const mockCreateRoom = vi.mocked(roomsQueries.createRoom);
const mockGetRoomById = vi.mocked(roomsQueries.getRoomById);
const mockGetRoomsByUserId = vi.mocked(roomsQueries.getRoomsByUserId);
const mockDeleteRoom = vi.mocked(roomsQueries.deleteRoom);
const mockAddMember = vi.mocked(roomMembersQueries.addMember);
const mockRemoveMember = vi.mocked(roomMembersQueries.removeMember);
const mockGetMembersByRoomId = vi.mocked(roomMembersQueries.getMembersByRoomId);
const mockGetMemberByRoomAndUser = vi.mocked(roomMembersQueries.getMemberByRoomAndUser);

const JWT_SECRET = 'test-secret';
const user = { id: 'user-uuid-1', email: 'user1@example.com', name: 'User One' };

function authHeader() {
  const token = jwt.sign(user, JWT_SECRET, { expiresIn: '1h' });
  return `Bearer ${token}`;
}

describe('room routes', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    vi.clearAllMocks();
  });

  describe('POST /rooms', () => {
    it('201 - creates room and returns it', async () => {
      const room = createMockRoom();
      mockCreateRoom.mockResolvedValue(room);
      mockAddMember.mockResolvedValue(undefined as any);

      const res = await request(app)
        .post('/rooms')
        .set('Authorization', authHeader())
        .send({
          name: 'My Group',
          type: 'group',
          memberIds: ['user-uuid-2'],
        });

      expect(res.status).toBe(201);
      expect(res.body).toEqual(expect.objectContaining({ id: room.id, name: room.name }));
    });

    it('400 - returns error for missing name', async () => {
      const res = await request(app)
        .post('/rooms')
        .set('Authorization', authHeader())
        .send({ type: 'group', memberIds: ['user-uuid-2'] });

      expect(res.status).toBe(400);
    });

    it('401 - rejects request without auth token', async () => {
      const res = await request(app)
        .post('/rooms')
        .send({ name: 'My Group', type: 'group', memberIds: [] });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /rooms', () => {
    it('200 - returns all rooms for authenticated user', async () => {
      const rooms = [
        createMockRoom(),
        createMockRoom({ id: 'room-uuid-2', name: 'Room 2' }),
      ];
      mockGetRoomsByUserId.mockResolvedValue(rooms);

      const res = await request(app)
        .get('/rooms')
        .set('Authorization', authHeader());

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    it('401 - rejects request without auth token', async () => {
      const res = await request(app).get('/rooms');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /rooms/:id/members', () => {
    it('200 - adds member and returns updated members', async () => {
      const room = createMockRoom();
      const members = [createMockRoomMember(), createMockRoomMember({ id: 'member-2', userId: 'user-uuid-2' })];
      mockGetRoomById.mockResolvedValue(room);
      mockGetMemberByRoomAndUser.mockResolvedValue(null as any);
      mockAddMember.mockResolvedValue(undefined as any);
      mockGetMembersByRoomId.mockResolvedValue(members);

      const res = await request(app)
        .post('/rooms/room-uuid-1/members')
        .set('Authorization', authHeader())
        .send({ userId: 'user-uuid-2' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    it('401 - rejects request without auth token', async () => {
      const res = await request(app)
        .post('/rooms/room-uuid-1/members')
        .send({ userId: 'user-uuid-2' });

      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /rooms/:id/members/:userId', () => {
    it('200 - removes member from room', async () => {
      const room = createMockRoom();
      const adminMember = createMockRoomMember({ userId: 'user-uuid-1', role: 'admin' });
      mockGetRoomById.mockResolvedValue(room);
      mockGetMemberByRoomAndUser.mockResolvedValue(adminMember);
      mockRemoveMember.mockResolvedValue(undefined as any);

      const res = await request(app)
        .delete('/rooms/room-uuid-1/members/user-uuid-2')
        .set('Authorization', authHeader());

      expect(res.status).toBe(200);
    });

    it('401 - rejects request without auth token', async () => {
      const res = await request(app)
        .delete('/rooms/room-uuid-1/members/user-uuid-2');

      expect(res.status).toBe(401);
    });

    it('403 - rejects non-admin from removing members', async () => {
      const room = createMockRoom();
      const member = createMockRoomMember({ userId: 'user-uuid-1', role: 'member' });
      mockGetRoomById.mockResolvedValue(room);
      mockGetMemberByRoomAndUser.mockResolvedValue(member);

      const res = await request(app)
        .delete('/rooms/room-uuid-1/members/user-uuid-2')
        .set('Authorization', authHeader());

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /rooms/:id', () => {
    it('200 - deletes room when requester is admin', async () => {
      const room = createMockRoom();
      const adminMember = createMockRoomMember({ userId: 'user-uuid-1', role: 'admin' });
      mockGetRoomById.mockResolvedValue(room);
      mockGetMemberByRoomAndUser.mockResolvedValue(adminMember);
      mockDeleteRoom.mockResolvedValue(undefined as any);

      const res = await request(app)
        .delete('/rooms/room-uuid-1')
        .set('Authorization', authHeader());

      expect(res.status).toBe(200);
    });

    it('401 - rejects request without auth token', async () => {
      const res = await request(app).delete('/rooms/room-uuid-1');

      expect(res.status).toBe(401);
    });

    it('403 - rejects non-admin from deleting room', async () => {
      const room = createMockRoom();
      const member = createMockRoomMember({ userId: 'user-uuid-1', role: 'member' });
      mockGetRoomById.mockResolvedValue(room);
      mockGetMemberByRoomAndUser.mockResolvedValue(member);

      const res = await request(app)
        .delete('/rooms/room-uuid-1')
        .set('Authorization', authHeader());

      expect(res.status).toBe(403);
    });
  });
});
