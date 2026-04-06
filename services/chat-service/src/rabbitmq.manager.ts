import amqplib, { Channel, ChannelModel, Options } from "amqplib";
import { createLogger } from "@29chat/common";
import { NewMessage } from "@29chat/database";

class RabbitManager {
  private connection?: ChannelModel
  private channel?: Channel
  private readonly QUEUE = 'messages.new'
  private readonly url = process.env.RABBITMQ_URL || "amqp://localhost:5672"
  private readonly logger = createLogger("chat-service-rabbitmq")

  async init() {
    this.connection = await amqplib.connect(this.url);
    this.channel = await this.connection.createChannel();

    await this.channel.assertQueue(this.QUEUE, {
      durable: true,
      arguments: {
        "x-dead-letter-exchange": "messages.dlx",
        "x-dead-letter-routing-key": this.QUEUE,
      },
    });

    this.logger.info("RabbitMQ initialised")

  }

  async closeManager() {
    await this.channel?.close();
    await this.connection?.close();
    this.channel = undefined;
    this.connection = undefined;
  }

  async sendMessage(msg: NewMessage) {
    if (!this.channel) throw new Error("RabbitMQ Connection not initialised");

    const content = Buffer.from(JSON.stringify(msg));

    return this.channel.sendToQueue(this.QUEUE, content, { persistent: true });
  }
}

export const rabbitManager = new RabbitManager();
