import { eq } from 'drizzle-orm';
import db from '..';
import { usersTable } from '../schema';
import { ChatUser, NewChatUser } from '../types';

export const getUserByEmail = async (email: string): Promise<ChatUser | null> => {
  const user = await db.select().from(usersTable).where(eq(usersTable.email, email));
  return user[0] ?? null;
};

export const getUserById = async (id: string): Promise<ChatUser | null> => {
  const user = await db.select().from(usersTable).where(eq(usersTable.id, id));
  return user[0] ?? null;
};

export const createUser = async (user: NewChatUser): Promise<ChatUser> => {
  const [created] = await db.insert(usersTable).values(user).returning();
  return created;
};

export const updateUser = async (user: ChatUser) => {
  await db.update(usersTable).set(user).where(eq(usersTable.id, user.id));
};

export const deleteUser = async (id: string) => {
  await db.delete(usersTable).where(eq(usersTable.id, id));
};

export const getAllUsers = async (): Promise<ChatUser[]> => {
  const users = await db.select().from(usersTable);
  return users as ChatUser[];
};
