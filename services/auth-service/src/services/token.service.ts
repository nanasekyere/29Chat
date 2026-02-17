import { AppError, ChatUser, JWTPayload } from "@29chat/common";
import jwt from "jsonwebtoken";
import { refreshTokensQueries } from "@29chat/database";

export function createAccessToken(user: ChatUser): string {
  const payload: JWTPayload = { id: user.id };

  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN! as jwt.SignOptions["expiresIn"],
  });
}

export async function createRefreshToken(user: ChatUser): Promise<string> {
  const payload: JWTPayload = { id: user.id };

  const token = jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN! as jwt.SignOptions["expiresIn"],
  });

  await refreshTokensQueries.saveRefreshToken(user.id, token);

  return token;
}

export function verifyToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
  } catch (error) {
    throw new AppError("Invalid token", 401);
  }
}

export function verifyRefreshToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as JWTPayload;
  } catch (error) {
    throw new AppError("Invalid refresh token", 401);
  }
}

export async function isRefreshTokenValid(
  userID: string,
  token: string,
): Promise<boolean> {
  const foundToken = await refreshTokensQueries.findRefreshToken(userID, token);

  if (!foundToken) return false;
  if (foundToken.expiresAt <= new Date()) return false;
  if (foundToken.token !== token) return false;

  return true;
}

export async function revokeRefreshToken(userID: string, token: string): Promise<void> {
  //TODO: validate inputs before calling db
  await refreshTokensQueries.deleteRefreshToken(userID, token);
}

export async function revokeAllRefreshTokens(userID: string): Promise<void> {
  await refreshTokensQueries.deleteRefreshTokenByUserId(userID)
}
