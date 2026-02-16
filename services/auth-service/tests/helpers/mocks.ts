import { ChatUser } from '@29chat/common';

export function createMockUser(overrides: Partial<ChatUser> = {}): ChatUser {
  return {
    id: 'test-uuid',
    email: 'test@example.com',
    password: '$2b$10$hashedpassword',
    name: 'Test User',
    status: 'online',
    lastActive: new Date('2025-01-01'),
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}
