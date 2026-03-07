import amqplib, { Channel, ChannelModel, ConsumeMessage } from "amqplib";
import { createMessage } from "../services/message.service";
import { AppError, createLogger } from "@29chat/common";
import { NewMessage } from "@29chat/database";

const logger = createLogger('message-storage-service');

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
      const newMsg = JSON.parse(msg.content.toString()) as NewMessage;

      await createMessage(newMsg);

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
