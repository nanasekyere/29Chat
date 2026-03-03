import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockChannel = {
  assertQueue: vi.fn(),
  consume: vi.fn(),
  ack: vi.fn(),
  nack: vi.fn(),
  close: vi.fn(),
};

const mockConnection = {
  createChannel: vi.fn().mockResolvedValue(mockChannel),
  close: vi.fn(),
};

vi.mock('amqplib', () => ({
  default: {
    connect: vi.fn().mockResolvedValue(mockConnection),
  },
}));

vi.mock('../../../src/services/message.service', () => ({
  createMessage: vi.fn(),
}));

import amqplib from 'amqplib';
import { createMessage } from '../../../src/services/message.service';
import { startConsumer, stopConsumer } from '../../../src/consumers/message.consumer';

const mockConnect = vi.mocked(amqplib.connect);
const mockCreateMessage = vi.mocked(createMessage);

describe('message consumer', () => {
  beforeEach(() => {
    process.env.RABBITMQ_URL = 'amqp://localhost:5672';
    vi.clearAllMocks();
    mockConnect.mockResolvedValue(mockConnection as any);
    mockConnection.createChannel.mockResolvedValue(mockChannel as any);
  });

  describe('startConsumer', () => {
    it('connects to RABBITMQ_URL', async () => {
      await startConsumer();

      expect(mockConnect).toHaveBeenCalledWith('amqp://localhost:5672');
    });

    it('creates a channel from the connection', async () => {
      await startConsumer();

      expect(mockConnection.createChannel).toHaveBeenCalled();
    });

    it('asserts queue "messages.new"', async () => {
      await startConsumer();

      expect(mockChannel.assertQueue).toHaveBeenCalledWith('messages.new', { durable: true });
    });

    it('calls consume on the queue', async () => {
      await startConsumer();

      expect(mockChannel.consume).toHaveBeenCalledWith('messages.new', expect.any(Function));
    });
  });

  describe('handleMessage', () => {
    async function getHandleMessage() {
      await startConsumer();
      return mockChannel.consume.mock.calls[0][1];
    }

    it('parses JSON buffer, calls messageService.createMessage, and acks', async () => {
      const handler = await getHandleMessage();
      const messageData = { roomId: 'room-1', senderId: 'user-1', content: 'Hello', contentType: 'text' };
      const msg = { content: Buffer.from(JSON.stringify(messageData)) };
      mockCreateMessage.mockResolvedValue({} as any);

      await handler(msg);

      expect(mockCreateMessage).toHaveBeenCalledWith(messageData);
      expect(mockChannel.ack).toHaveBeenCalledWith(msg);
    });

    it('nacks with requeue=false on invalid JSON', async () => {
      const handler = await getHandleMessage();
      const msg = { content: Buffer.from('not json') };

      await handler(msg);

      expect(mockChannel.nack).toHaveBeenCalledWith(msg, false, false);
    });

    it('nacks with requeue=true on service error', async () => {
      const handler = await getHandleMessage();
      const messageData = { roomId: 'room-1', senderId: 'user-1', content: 'Hello', contentType: 'text' };
      const msg = { content: Buffer.from(JSON.stringify(messageData)) };
      mockCreateMessage.mockRejectedValue(new Error('Service failure'));

      await handler(msg);

      expect(mockChannel.nack).toHaveBeenCalledWith(msg, false, true);
    });
  });

  describe('stopConsumer', () => {
    it('closes channel and connection', async () => {
      await startConsumer();
      await stopConsumer();

      expect(mockChannel.close).toHaveBeenCalled();
      expect(mockConnection.close).toHaveBeenCalled();
    });
  });
});
