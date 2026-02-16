import { eq, and } from 'drizzle-orm';
import db from '..';
import { refreshTokensTable } from '../schema';

export const saveRefreshToken = async (userId: string, token: string) => {
  await db.insert(refreshTokensTable).values({ userId, token, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });
};

export const findRefreshToken = async (userId: string, token: string) => {
  const refreshToken = await db.select().from(refreshTokensTable).where(and(eq(refreshTokensTable.userId, userId), eq(refreshTokensTable.token, token)));
  return refreshToken[0];
};

export const deleteRefreshToken = async (userId: string, token: string) => {
  await db.delete(refreshTokensTable).where(and(eq(refreshTokensTable.userId, userId), eq(refreshTokensTable.token, token)));
};

export const deleteRefreshTokenByUserId = async (userId: string) => {
  await db.delete(refreshTokensTable).where(eq(refreshTokensTable.userId, userId));
};
