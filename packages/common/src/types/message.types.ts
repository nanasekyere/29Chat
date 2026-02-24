export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  contentType: 'text' | 'image' | 'audio' | 'video' | 'file';
}
