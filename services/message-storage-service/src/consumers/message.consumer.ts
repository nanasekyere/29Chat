import amqplib, { Channel, ChannelModel, ConsumeMessage } from "amqplib";
import { createMessage } from "../services/message.service";
import { AppError, MessageContentType } from "@29chat/common";
import { logger } from "../config/logger";

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost:5672";
const QUEUE = "messages.new";

let connection: ChannelModel;
let channel: Channel;

export async function startConsumer() {
  connection = await amqplib.connect(RABBITMQ_URL);
  channel = await connection.createChannel();

  await channel.assertQueue(QUEUE, { durable: true });
  channel.prefetch(1);

  channel.consume(QUEUE, async (msg: ConsumeMessage | null) => {
    if (!msg) return;

    try {
      const msgContent = JSON.parse(msg.content.toString());
      const senderId = msgContent.senderId as string;
      const roomId = msgContent.roomId as string;
      const content = msgContent.content as string;
      const contentType = msgContent.contentType as MessageContentType;

      await createMessage({ senderId, roomId, content, contentType });

      channel.ack(msg);
    } catch (error) {
      logger.error(error);
      channel.nack(msg, false, error instanceof AppError);
    }
  });
}

export async function stopConsumer() {
  await channel?.close();
  await connection?.close();
}
