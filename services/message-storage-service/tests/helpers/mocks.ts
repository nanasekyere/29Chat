import { Message, NewMessage } from '@29chat/database';

export const MOCK_USER_ID = '00000000-0000-4000-a000-000000000001';
export const MOCK_ROOM_ID = '00000000-0000-4000-a000-000000000010';
export const MOCK_MSG_ID = '00000000-0000-4000-a000-000000000100';

export function createMockMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: MOCK_MSG_ID,
    roomId: MOCK_ROOM_ID,
    senderId: MOCK_USER_ID,
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
    roomId: MOCK_ROOM_ID,
    senderId: MOCK_USER_ID,
    content: 'Hello, world!',
    contentType: 'text',
    ...overrides,
  };
}

export function createMockMessages(count: number, roomId: string = MOCK_ROOM_ID): Message[] {
  return Array.from({ length: count }, (_, i) =>
    createMockMessage({
      id: `00000000-0000-4000-a000-0000000001${String(i + 1).padStart(2, '0')}`,
      roomId,
      content: `Message ${i + 1}`,
      createdAt: new Date(2025, 0, 1, 0, 0, i),
    })
  );
}
