import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockNewMessage } from '../helpers/mocks';

const { mockChannel, mockConnection } = vi.hoisted(() => {
  const mockChannel = {
    assertQueue: vi.fn(),
    sendToQueue: vi.fn().mockReturnValue(true),
    close: vi.fn(),
  };

  const mockConnection = {
    createChannel: vi.fn().mockResolvedValue(mockChannel),
    close: vi.fn(),
  };

  return { mockChannel, mockConnection };
});

vi.mock('amqplib', () => ({
  default: {
    connect: vi.fn().mockResolvedValue(mockConnection),
  },
}));

import amqplib from 'amqplib';
import { rabbitManager } from '../../src/rabbitmq.manager';

const mockConnect = vi.mocked(amqplib.connect);

describe('RabbitManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConnect.mockResolvedValue(mockConnection as any);
    mockConnection.createChannel.mockResolvedValue(mockChannel as any);
  });

  afterEach(async () => {
    await rabbitManager.closeManager();
  });

  describe('sendMessage', () => {
    it('throws if called before init', async () => {
      await expect(rabbitManager.sendMessage(createMockNewMessage())).rejects.toThrow(
        'RabbitMQ Connection not initialised'
      );
    });

    it('serializes and publishes message to queue with persistent flag', async () => {
      await rabbitManager.init();
      const msg = createMockNewMessage();

      const result = await rabbitManager.sendMessage(msg);

      expect(mockChannel.sendToQueue).toHaveBeenCalledWith(
        'messages.new',
        Buffer.from(JSON.stringify(msg)),
        { persistent: true }
      );
      expect(result).toBe(true);
    });
  });

  describe('init', () => {
    it('connects to RabbitMQ and asserts the queue', async () => {
      await rabbitManager.init();

      expect(mockConnect).toHaveBeenCalledWith(expect.stringContaining('amqp://'));
      expect(mockConnection.createChannel).toHaveBeenCalled();
      expect(mockChannel.assertQueue).toHaveBeenCalledWith('messages.new', expect.objectContaining({ durable: true }));
    });
  });

  describe('closeManager', () => {
    it('closes channel and connection', async () => {
      await rabbitManager.init();

      await rabbitManager.closeManager();

      expect(mockChannel.close).toHaveBeenCalled();
      expect(mockConnection.close).toHaveBeenCalled();
    });
  });
});
