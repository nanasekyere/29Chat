export interface MockRoom {
  id: string;
  name: string;
  type: 'group' | 'direct';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockRoomMember {
  id: string;
  roomId: string;
  userId: string;
  role: 'admin' | 'member';
  joinedAt: Date;
}

export interface MockMessage {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  contentType: 'text' | 'image' | 'audio' | 'video' | 'file';
  createdAt: Date;
  editedAt: Date | null;
  deletedAt: Date | null;
}

export function createMockRoom(overrides: Partial<MockRoom> = {}): MockRoom {
  return {
    id: 'room-uuid-1',
    name: 'Test Room',
    type: 'group',
    createdBy: 'user-uuid-1',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

export function createMockRoomMember(overrides: Partial<MockRoomMember> = {}): MockRoomMember {
  return {
    id: 'member-uuid-1',
    roomId: 'room-uuid-1',
    userId: 'user-uuid-1',
    role: 'member',
    joinedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

export function createMockMessage(overrides: Partial<MockMessage> = {}): MockMessage {
  return {
    id: 'message-uuid-1',
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

export function createMockSocket(overrides: Record<string, any> = {}) {
  return {
    id: 'socket-id-1',
    data: { user: { id: 'user-uuid-1', email: 'test@example.com', name: 'Test User' } },
    join: vi.fn(),
    leave: vi.fn(),
    to: vi.fn().mockReturnThis(),
    emit: vi.fn(),
    broadcast: {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    },
    handshake: {
      auth: { token: 'valid-jwt-token' },
    },
    rooms: new Set(['socket-id-1']),
    disconnect: vi.fn(),
    ...overrides,
  };
}

export function createMockIo(overrides: Record<string, any> = {}) {
  return {
    to: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    emit: vi.fn(),
    ...overrides,
  };
}
