import { ChatUser, AppError } from "@29chat/common";
import bcrypt from "bcrypt";
import { createAccessToken, createRefreshToken } from "./token.service";
import { usersQueries } from "@29chat/database";

export async function register({
  email,
  password,
  name,
}: {
  email: string;
  password: string;
  name: string;
}) {
  const existingUser = await usersQueries.getUserByEmail(email);
  if (existingUser) {
    throw new AppError("Email already registered", 409);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user: ChatUser = {
    id: crypto.randomUUID(),
    email,
    password: hashedPassword,
    name,
    status: "online",
    lastActive: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  try {
    await usersQueries.createUser(user);
  } catch (error) {
    const dbError = error as { code?: string };
    if (dbError.code) {
      throw new AppError("Email already registered", 409);
    }
    throw new AppError("Failed to create user", 500);
  }

  const token = createAccessToken(user);
  const refreshToken = await createRefreshToken(user);
  const { password: _, ...sanitizedUser } = user;

  return { user: sanitizedUser, token, refreshToken };
}
