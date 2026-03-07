import { eq, and } from "drizzle-orm";
import db from "..";
import { roomsTable, roomMembersTable } from "../schema";

import { Room, NewRoom, RoomMember, NewRoomMember } from "../types";

// Room table

export const createRoom = async (room: NewRoom) => {
  const [created] = await db.insert(roomsTable).values(room).returning();
  return created as Room;
};

export const getRoomById = async (id: string) => {
  const room = await db
    .select()
    .from(roomsTable)
    .where(eq(roomsTable.id, id));
  return (room[0] as Room) ?? null;
};

export const deleteRoom = async (id: string) => {
  await db.delete(roomsTable).where(eq(roomsTable.id, id));
};

// Room members table

export const addRoomMember = async (member: NewRoomMember) => {
  const [created] = await db
    .insert(roomMembersTable)
    .values(member)
    .returning();
  return created as RoomMember;
};

export const getRoomMembers = async (roomId: string) => {
  const members = await db
    .select()
    .from(roomMembersTable)
    .where(eq(roomMembersTable.roomId, roomId));
  return members as RoomMember[];
};

export const getRoomsByUserId = async (userId: string) => {
  const rooms = await db
    .select({ room: roomsTable })
    .from(roomMembersTable)
    .innerJoin(roomsTable, eq(roomMembersTable.roomId, roomsTable.id))
    .where(eq(roomMembersTable.userId, userId));
  return rooms.map((r) => r.room) as Room[];
};

export const isRoomMember = async (roomId: string, userId: string) => {
  const member = await db
    .select()
    .from(roomMembersTable)
    .where(
      and(
        eq(roomMembersTable.roomId, roomId),
        eq(roomMembersTable.userId, userId),
      ),
    );
  return member.length > 0;
};

export const removeRoomMember = async (roomId: string, userId: string) => {
  await db
    .delete(roomMembersTable)
    .where(
      and(
        eq(roomMembersTable.roomId, roomId),
        eq(roomMembersTable.userId, userId),
      ),
    );
};

export const updateMemberRole = async (
  roomId: string,
  userId: string,
  role: "admin" | "member",
) => {
  const [updated] = await db
    .update(roomMembersTable)
    .set({ role })
    .where(
      and(
        eq(roomMembersTable.roomId, roomId),
        eq(roomMembersTable.userId, userId),
      ),
    )
    .returning();
  return updated as RoomMember;
};
