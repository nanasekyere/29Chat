import { InferEnum } from "drizzle-orm";
import { roomsTable, roomMembersTable, messagesTable, roomTypes, roomMemberRoles } from "./schema";

export type Room = typeof roomsTable.$inferSelect;
export type NewRoom = typeof roomsTable.$inferInsert;
export type RoomMember = typeof roomMembersTable.$inferSelect;
export type NewRoomMember = typeof roomMembersTable.$inferInsert;
export type Message = typeof messagesTable.$inferSelect;
export type NewMessage = typeof messagesTable.$inferInsert;
export type RoomType = InferEnum<typeof roomTypes>;
export type MemberRole = InferEnum<typeof roomMemberRoles>;
