import { Message, NewMessage } from '@29chat/common';

export function createMockMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'msg-uuid-1',
    roomId: 'room-uuid-1',
    senderId: 'user-uuid-1',
    content: 'Hello, world!',
    contentType: 'text',
    createdAt: new Date('2025-01-01'),
    editedAt: null,
    deletedAt: null,
    ...overrides,
  };
}

export function createMockNewMessage(overrides: Partial<NewMessage> = {}): NewMessage {
  return {
    roomId: 'room-uuid-1',
    senderId: 'user-uuid-1',
    content: 'Hello, world!',
    contentType: 'text',
    ...overrides,
  };
}

export function createMockMessages(count: number, roomId: string = 'room-uuid-1'): Message[] {
  return Array.from({ length: count }, (_, i) =>
    createMockMessage({
      id: `msg-uuid-${i + 1}`,
      roomId,
      content: `Message ${i + 1}`,
      createdAt: new Date(2025, 0, 1, 0, 0, i),
    })
  );
}
