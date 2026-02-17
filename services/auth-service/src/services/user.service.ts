import { AppError, ChatUser } from "@29chat/common";
import { usersQueries } from "@29chat/database";

export async function getUser(id: string): Promise<ChatUser> {
  const foundUser = await usersQueries.getUserById(id);

  if (!foundUser) throw new AppError("Could not find user in db", 500);

  return foundUser;
}
