import amqplib, { Channel, ChannelModel, ConsumeMessage } from "amqplib";
import { createMessage } from "../services/message.service";
import { AppError, createLogger } from "@29chat/common";
import { NewMessage } from "@29chat/database";

const logger = createLogger('message-storage-service');

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost:5672";
const MAX_RETRIES = Number(process.env.CONSUMER_MAX_RETRIES) || 3;
const QUEUE = "messages.new";
const DLX = "messages.dlx";
const DLQ = "messages.dead";

let connection: ChannelModel;
let channel: Channel;

export async function startConsumer() {
  connection = await amqplib.connect(RABBITMQ_URL);
  channel = await connection.createChannel();

  await channel.assertExchange(DLX, "direct", { durable: true });
  await channel.assertQueue(DLQ, { durable: true });
  await channel.bindQueue(DLQ, DLX, QUEUE);

  await channel.assertQueue(QUEUE, {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": DLX,
      "x-dead-letter-routing-key": QUEUE,
    },
  });
  channel.prefetch(1);

  channel.consume(QUEUE, async (msg: ConsumeMessage | null) => {
    if (!msg) return;

    const retryCount = (msg.properties.headers?.["x-retry-count"] as number) || 0;

    try {
      const newMsg = JSON.parse(msg.content.toString()) as NewMessage;

      await createMessage(newMsg);

      channel.ack(msg);
    } catch (error) {
      logger.error(error);

      if (error instanceof AppError && retryCount < MAX_RETRIES) {
        channel.ack(msg);
        channel.sendToQueue(QUEUE, msg.content, {
          persistent: true,
          headers: { "x-retry-count": retryCount + 1}
        });
      } else {
        channel.nack(msg, false, false);
      }
    }
  });
}

export async function stopConsumer() {
  await channel?.close();
  await connection?.close();
}
