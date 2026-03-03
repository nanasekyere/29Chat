  export interface MessageEvent {
    roomId: string;
    senderId: string;
    content: string;
    contentType: 'text' | 'image' | 'audio' | 'video' | 'file';
  }
