import { eq, and } from "drizzle-orm";
import db from "..";
import { roomsTable, roomMembersTable } from "../schema";

import { Room, NewRoom, RoomMember, NewRoomMember, MemberRole } from "../types";

// Room table

export const createRoom = async (room: NewRoom): Promise<Room> => {
  const [created] = await db.insert(roomsTable).values(room).returning();
  return created as Room;
};

export const getRoomById = async (id: string): Promise<Room | null> => {
  const room = await db
    .select()
    .from(roomsTable)
    .where(eq(roomsTable.id, id));
  return (room[0] as Room) ?? null;
};

export const deleteRoom = async (id: string): Promise<void> => {
  await db.delete(roomsTable).where(eq(roomsTable.id, id));
};

export const createRoomWithMember = async (
  room: NewRoom,
  userId: string,
  role: MemberRole,
): Promise<{ room: Room; member: RoomMember }> => {
  return await db.transaction(async (tx) => {
    const [createdRoom] = await tx.insert(roomsTable).values(room).returning();
    const [createdMember] = await tx
      .insert(roomMembersTable)
      .values({ roomId: createdRoom.id, userId, role })
      .returning();
    return { room: createdRoom as Room, member: createdMember as RoomMember };
  });
};


// Room members table

export const addRoomMember = async (member: NewRoomMember): Promise<RoomMember> => {
  const [created] = await db
    .insert(roomMembersTable)
    .values(member)
    .returning();
  return created as RoomMember;
};

export const getRoomMembers = async (roomId: string): Promise<RoomMember[]> => {
  const members = await db
    .select()
    .from(roomMembersTable)
    .where(eq(roomMembersTable.roomId, roomId));
  return members as RoomMember[];
};

export const getRoomsByUserId = async (userId: string): Promise<Room[]> => {
  const rooms = await db
    .select({ room: roomsTable })
    .from(roomMembersTable)
    .innerJoin(roomsTable, eq(roomMembersTable.roomId, roomsTable.id))
    .where(eq(roomMembersTable.userId, userId));
  return rooms.map((r) => r.room) as Room[];
};

export const isRoomMember = async (roomId: string, userId: string): Promise<boolean> => {
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

export const removeRoomMember = async (roomId: string, userId: string): Promise<void> => {
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
): Promise<RoomMember> => {
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
