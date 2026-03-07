import { NewMessage } from "@29chat/database";

import { AppError, createLogger } from "@29chat/common";
import { rabbitManager } from "../rabbitmq.manager";

const logger = createLogger("chat-service");

export async function sendMessage(msg: NewMessage) {
  if (msg.content.length < 1) throw new AppError("Message content cannot be empty", 400);
  if (!msg.roomId) throw new AppError("Message has no room ID", 400);
  if (!msg.senderId) throw new AppError("Message has no sender ID", 400);

  const send = await rabbitManager.sendMessage(msg)
  if (!send) throw new AppError("Message was not queued", 500);
}
