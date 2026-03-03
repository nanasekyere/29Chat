import { Redis } from "ioredis";
import { logger } from "./logger";

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
