import { Message } from "@29chat/common";
import { redis } from "../config/redis";

export async function getMessageCache(msgId: string): Promise<Message | null> {
  const data = await redis.get(`message:${msgId}`);
  return data ? JSON.parse(data) : null;
}

export async function setMessageCache(msg: Message) {
  await redis.set(`message:${msg.id}`, JSON.stringify(msg), "EX", 3600);
}

export async function getRoomMessagesCache(
  roomId: string,
  limit: number,
  offset: number,
): Promise<Message[] | null> {
  const data = await redis.get(`room:${roomId}:messages:${limit}:${offset}`);
  return data ? JSON.parse(data) : null;
}

export async function setRoomMessagesCache(
  roomId: string,
  limit: number,
  offset: number,
  messages: Message[],
) {
  await redis.set(
    `room:${roomId}:messages:${limit}:${offset}`,
    JSON.stringify(messages),
    "EX",
    300,
  );
}

export async function invalidateMessageCache(msgId: string) {
  await redis.del(`message:${msgId}`);
}

export async function invalidateRoomMessagesCache(roomId: string) {
  const keys = await redis.keys(`room:${roomId}:messages:*`);
  if (keys.length) await redis.del(...keys);
}
