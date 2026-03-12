import { AppError } from "@29chat/common";
import { NewChatUser } from "@29chat/database";
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

  const newUser: NewChatUser = {
    email,
    password: hashedPassword,
    name,
  };

  try {
    const user = await usersQueries.createUser(newUser);
    if (!user) throw new AppError("Failed to create user on db", 500);
    const token = createAccessToken(user);
    const refreshToken = await createRefreshToken(user);
    const { password: _, ...sanitizedUser } = user;

    return { user: sanitizedUser, token, refreshToken };
  } catch (error) {
    if (error instanceof AppError) throw error;
    const dbError = error as { code?: string };
    if (dbError.code) {
      throw new AppError("Email already registered", 409);
    }
    throw new AppError("Failed to create user", 500);
  }
}
