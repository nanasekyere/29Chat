import { eq } from "drizzle-orm";
import db from "..";
import { messagesTable } from "../schema";
import { Message, NewMessage } from "../types";

export const createMessage = async (msg: NewMessage) => {
  const [message] = await db.insert(messagesTable).values(msg).returning();
  return message as Message;
};

export const getMessageById = async (id: string) => {
  const message = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.id, id));
  return message[0] as Message | null;
};

export const getMessagesByRoomId = async (
  roomId: string,
  limit: number = 50,
  offset: number = 0,
) => {
  const messages = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.roomId, roomId))
    .limit(limit)
    .offset(offset);
  return messages as Message[];
};

export const updateMessage = async (msg: Message) => {
  const [message] = await db
    .update(messagesTable)
    .set(msg)
    .where(eq(messagesTable.id, msg.id))
    .returning();
  return message as Message;
};

export const softDeleteMessage = async (id: string) => {
  await db.delete(messagesTable).where(eq(messagesTable.id, id));
};
