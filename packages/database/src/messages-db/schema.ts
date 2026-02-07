import { pgTable, uuid, varchar, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const roomTypes = pgEnum("room_types", ["group", "direct"]);
export const roomMemberRoles = pgEnum("room_member_roles", ["admin", "member"]);
export const messageContentTypes = pgEnum("message_content_types", ["text", "image", "audio", "video", "file"]);

export const roomsTable = pgTable("rooms", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  type: roomTypes("type").notNull().default("direct"),
  createdBy: uuid("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const roomMembersTable = pgTable("room_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  roomId: uuid("room_id").notNull().references(() => roomsTable.id),
  userId: uuid("user_id").notNull(),
  role: roomMemberRoles("role").notNull().default("member"),
  joinedAt: timestamp("joined_at").notNull().default(sql`now()`),
});

export const messagesTable = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  roomId: uuid("room_id").notNull().references(() => roomsTable.id),
  senderId: uuid("sender_id").notNull(),
  content: varchar("content", { length: 255 }).notNull(),
  contentType: messageContentTypes("content_type").notNull().default("text"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  editedAt: timestamp("edited_at"),
  deletedAt: timestamp("deleted_at"),
});
