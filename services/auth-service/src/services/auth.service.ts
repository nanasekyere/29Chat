import { ChatUser, AppError } from "@29chat/common";
import bcrypt from "bcrypt";
import { createToken } from "./token.service";
import { createUser, getUserByEmail } from "@29chat/database";

export async function register({
  email,
  password,
  name,
}: {
  email: string;
  password: string;
  name: string;
}) {
  const existingUser = await getUserByEmail(email);
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
    await createUser(user);
  } catch (error) {
    const dbError = error as { code?: string };
    if (dbError.code) {
      throw new AppError("Email already registered", 409);
    }
    throw new AppError("Failed to create user", 500);
  }

  const token = createToken(user);
  const { password: _, ...sanitizedUser } = user;

  return { user: sanitizedUser, token };
}
