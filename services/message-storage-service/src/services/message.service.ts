import { messagesQueries } from "@29chat/database";
import { AppError } from "@29chat/common";
import { Message, NewMessage } from "@29chat/database";
import * as cache from "./cache.service";

export async function createMessage(msg: NewMessage): Promise<Message> {
  try {
    if (msg.content.length < 1) throw new AppError("Message content cannot be empty", 400);

    const message = await messagesQueries.createMessage(msg);
    if (!message) throw new AppError("Failed to create message in database", 500);

    cache.invalidateRoomMessagesCache(message.roomId);
    return message;

  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("Failed to create message", 500);
  }
}

export async function getMessageById(messageId: string): Promise<Message> {
  try {
    const cached = await cache.getMessageCache(messageId);
    if (cached) return cached;

    const message = await messagesQueries.getMessageById(messageId);
    if (!message) throw new AppError("Message not found", 404);

    await cache.setMessageCache(message);
    return message;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("Failed to get message", 500);
  }
}

export async function getMessagesByRoomId(
  roomId: string,
  limit: number = 50,
  offset: number = 0,
): Promise<Message[]> {
  try {
    const cached = await cache.getRoomMessagesCache(roomId, limit, offset);
    if (cached) return cached;

    const messages = await messagesQueries.getMessagesByRoomId(
      roomId,
      limit,
      offset,
    );

    await cache.setRoomMessagesCache(roomId, limit, offset, messages);
    return messages;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("Failed to get room messages", 500);
  }
}

export async function updateMessage(
  messageId: string,
  senderId: string,
  content: string,
): Promise<Message> {
  try {
    if (content.length < 1)
      throw new AppError("Message content cannot be empty", 400);

    const msgToUpdate = await getMessageById(messageId);
    if (msgToUpdate.senderId !== senderId)
      throw new AppError("Not authorized", 403);

    const updated = await messagesQueries.updateMessage({
      ...msgToUpdate,
      content,
      editedAt: new Date(),
    });
    if (!updated) throw new AppError("Failed to update message in DB", 500);

    await cache.invalidateMessageCache(messageId);
    await cache.invalidateRoomMessagesCache(updated.roomId);

    return updated;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("Failed to update message", 500);
  }
}

export async function softDeleteMessage(
  messageId: string,
  senderId: string,
): Promise<void> {
  try {
    const msgToDelete = await getMessageById(messageId);
    if (msgToDelete.senderId !== senderId) throw new AppError("Not authorized", 403);

    await messagesQueries.softDeleteMessage(messageId);
    await cache.invalidateMessageCache(messageId);
    await cache.invalidateRoomMessagesCache(msgToDelete.roomId);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("Failed to delete message", 500);
  }
}
