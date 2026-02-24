import { eq } from 'drizzle-orm';
import db from '.';
import { messagesTable } from './schema'
import { Message } from '@29chat/common';

export const createMessage = async (msg: Message) => {
  await db.insert(messagesTable).values(msg);
}

export const getMessageById = async (id: string) => {
  const message = await db.select().from(messagesTable).where(eq(messagesTable.id, id));
  return message[0] as Message | null;
}

export const getMessagesByRoomId = async (roomId: string) => {
  const messages = await db.select().from(messagesTable).where(eq(messagesTable.roomId, roomId));
  return messages as Message[];
}

export const updateMessage = async (msg: Message) => {
  await db.update(messagesTable).set(msg).where(eq(messagesTable.id, msg.id));
}

export const softDeleteMessage = async (id: string) => {
  await db.delete(messagesTable).where(eq(messagesTable.id, id));
}
