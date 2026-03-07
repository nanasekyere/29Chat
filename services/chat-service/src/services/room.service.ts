import { AppError } from "@29chat/common";
import { roomsQueries, RoomType, MemberRole } from "@29chat/database";
import { roomTypes } from "@29chat/database/dist/messages-db/schema";

export async function createRoom(
  name: string,
  type: RoomType,
  createdBy: string,
) {
  try {
    if (name.length < 1) throw new AppError("Room name cannot be empty", 400);
    if (!roomTypes.enumValues.includes(type))
      throw new AppError("Invalid room type", 400);

    const { room } = await roomsQueries.createRoomWithMember(
      { name, type, createdBy },
      createdBy,
      "admin"
    );

    return room;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("Failed to create room", 500);
  }
}

export async function joinRoom(roomId: string, userId: string) {
  try {
    await assertRoomExists(roomId);

    await addRoomMember(roomId, userId, "member");
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("Failed to add to room", 500);
  }
}

export async function leaveRoom(roomId: string, userId: string) {
  try {
    await assertRoomExists(roomId);
    await assertRoomMembership(roomId, userId);

    await roomsQueries.removeRoomMember(roomId, userId);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("Failed to leave room", 500);
  }
}

export async function getRoomMembers(roomId: string) {
  try {
    await assertRoomExists(roomId);
    return await roomsQueries.getRoomMembers(roomId);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("Failed to get room members", 500);
  }
}

export async function getRoomsByUserId(userId: string) {
  try {
    return await roomsQueries.getRoomsByUserId(userId);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("Failed to get users rooms", 500);
  }
}

async function addRoomMember(roomId: string, userId: string, role: MemberRole) {
  await assertRoomMembership(roomId, userId, false);

  const newMember = await roomsQueries.addRoomMember({
    roomId,
    userId,
    role,
  });

  if (!newMember) throw new AppError("Failed to add to room", 500);
}

async function assertRoomExists(roomId: string) {
  const room = await roomsQueries.getRoomById(roomId);
  if (!room) throw new AppError("Room not found", 404);
}

async function assertRoomMembership(
  roomId: string,
  userId: string,
  expectedMembership: boolean = true,
) {
  const isMember = await roomsQueries.isRoomMember(roomId, userId);
  if (expectedMembership && !isMember) throw new AppError("Not a member", 400);
  if (!expectedMembership && isMember)
    throw new AppError("Already a member", 409);
}
