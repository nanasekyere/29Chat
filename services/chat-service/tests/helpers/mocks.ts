import { vi } from 'vitest';
import { NewMessage } from '@29chat/database';

export const MOCK_USER_ID = '00000000-0000-4000-a000-000000000001';
export const MOCK_USER_ID_2 = '00000000-0000-4000-a000-000000000002';
export const MOCK_ROOM_ID = '00000000-0000-4000-a000-000000000010';
export const MOCK_ROOM_ID_2 = '00000000-0000-4000-a000-000000000020';
export const MOCK_SOCKET_ID = 'socket-id-abc123';
export const MOCK_SOCKET_ID_2 = 'socket-id-def456';

export function createMockNewMessage(overrides: Partial<NewMessage> = {}): NewMessage {
  return {
    roomId: MOCK_ROOM_ID,
    senderId: MOCK_USER_ID,
    content: 'Hello, world!',
    contentType: 'text',
    ...overrides,
  };
}

export function createMockSocket(overrides: Record<string, any> = {}) {
  const emitFn = vi.fn();
  const toReturnValue = { emit: emitFn };

  const socket = {
    id: MOCK_SOCKET_ID,
    data: { userId: MOCK_USER_ID },
    handshake: {
      auth: { token: 'valid-jwt-token' },
      headers: {},
    },
    join: vi.fn(),
    leave: vi.fn(),
    to: vi.fn().mockReturnValue(toReturnValue),
    emit: vi.fn(),
    on: vi.fn(),
    rooms: new Set([MOCK_SOCKET_ID]),
    disconnect: vi.fn(),
    ...overrides,
  };

  return socket;
}

export function createMockIo() {
  const emitFn = vi.fn();
  const toReturnValue = { emit: emitFn };

  return {
    to: vi.fn().mockReturnValue(toReturnValue),
    in: vi.fn().mockReturnValue(toReturnValue),
    emit: vi.fn(),
    use: vi.fn(),
  };
}
