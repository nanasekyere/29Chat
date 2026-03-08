import Redis from "ioredis";
import * as roomService from "../services/room.service";
import { Server, Socket } from "socket.io";
import { PresenceEvents } from "../types/socket.types";
import { createLogger } from "@29chat/common";
const VALID_STATUSES = ["online", "offline", "away", "busy"] as const;

const logger = createLogger("chat-service");
const redis = new Redis(process.env.REDIS_URL!);

export async function registerPresenceHandlers(io: Server, socket: Socket) {
  const userId = socket.data.userId as string;
  const rooms = await roomService.getRoomsByUserId(userId);

  redis.on("ready", () => {
    logger.info("Chat Service - Redis connected");
  });

  redis.on("error", (err) => {
    logger.error("Redis connection error", { error: err.message });
  });

  process.on("SIGTERM", () => {
    redis.quit();
  });

  for (const room of rooms) {
    socket.join(room.id);
  }

  redis.publish(
    PresenceEvents.events,
    JSON.stringify({ event: PresenceEvents.connected, userId }),
  );

  socket.on(PresenceEvents.disconnect, async () => {
    redis.publish(
      PresenceEvents.events,
      JSON.stringify({ event: PresenceEvents.disconnected, userId }),
    );
  });

  socket.on(PresenceEvents.status, async (data, callback) => {
    try {
      if (!VALID_STATUSES.includes(data.status)) {
        throw new Error("Invalid Status");
      }

      for (const room of rooms) {
        io.to(room.id).emit(PresenceEvents.status, { userId, status: data.status})
      }

      redis.publish(
        PresenceEvents.events,
        JSON.stringify({
          event: 'status:changed',
          userId,
          status: data.status
        })
      )
    } catch (error: any) {
      callback({ error: error.message });
    }

  })
}
