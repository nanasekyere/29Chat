export interface ChatUser {
  id: string;
  email: string;
  password?: string;
  name: string;
  avatar?: string;
  status: 'online' | 'offline' | 'away' | 'busy';
  lastActive: Date;
  createdAt: Date;
  updatedAt: Date;
}
