export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  contentType: 'text' | 'image' | 'audio' | 'video' | 'file';
  createdAt: Date;
  editedAt: Date | null;
  deletedAt: Date | null;
}

export type NewMessage = Omit<Message, 'id' | 'createdAt' | 'editedAt' | 'deletedAt'>;
