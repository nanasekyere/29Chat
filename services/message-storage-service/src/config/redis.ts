import { Redis } from "ioredis";
import { createLogger } from "@29chat/common";

const logger = createLogger('message-storage-service');

export const redis = new Redis(process.env.REDIS_URL!);

redis.on("ready", () => {
  logger.info("Redis connected");
});

redis.on("error", (err) => {
  logger.error("Redis connection error", { error: err.message });
});

process.on("SIGTERM", () => {
  redis.quit();
});
