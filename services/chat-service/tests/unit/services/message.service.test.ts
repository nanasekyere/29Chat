import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError } from '@29chat/common';
import { createMockNewMessage } from '../../helpers/mocks';

vi.mock('../../../src/rabbitmq.manager', () => ({
  rabbitManager: {
    sendMessage: vi.fn().mockResolvedValue(true),
  },
}));

import { rabbitManager } from '../../../src/rabbitmq.manager';
import { sendMessage } from '../../../src/services/message.service';

const mockRabbitSend = vi.mocked(rabbitManager.sendMessage);

describe('message service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendMessage', () => {
    it('validates and delegates to rabbitManager.sendMessage', async () => {
      const newMsg = createMockNewMessage();

      await sendMessage(newMsg);

      expect(mockRabbitSend).toHaveBeenCalledWith(newMsg);
    });

    it('throws AppError 400 if content is empty', async () => {
      const newMsg = createMockNewMessage({ content: '' });

      await expect(sendMessage(newMsg)).rejects.toThrow(AppError);
      await expect(sendMessage(newMsg)).rejects.toThrow('Message content cannot be empty');
      expect(mockRabbitSend).not.toHaveBeenCalled();
    });

    it('throws AppError 400 if roomId is missing', async () => {
      const newMsg = createMockNewMessage({ roomId: '' });

      await expect(sendMessage(newMsg)).rejects.toThrow(AppError);
      expect(mockRabbitSend).not.toHaveBeenCalled();
    });

    it('throws AppError 400 if senderId is missing', async () => {
      const newMsg = createMockNewMessage({ senderId: '' });

      await expect(sendMessage(newMsg)).rejects.toThrow(AppError);
      expect(mockRabbitSend).not.toHaveBeenCalled();
    });
  });
});
