import { InferEnum } from "drizzle-orm";
import { usersTable, refreshTokensTable, userStatuses } from "./schema";

export type ChatUser = typeof usersTable.$inferSelect;
export type NewChatUser = typeof usersTable.$inferInsert;
export type RefreshToken = typeof refreshTokensTable.$inferSelect;
export type NewRefreshToken = typeof refreshTokensTable.$inferInsert;
export type UserStatuses = InferEnum<typeof userStatuses>;
