export class SocketService {
  private static instance: SocketService;

  private constructor() {}
  private connections = new Map<string, Set<string>>();

  static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  addConnection(userId: string, socketId: string) {
    if (!this.connections.has(userId)) {
      this.connections.set(userId, new Set());
    }
    this.connections.get(userId)!.add(socketId);
  }

  removeConnection(userId: string, socketId: string) {
    this.connections.get(userId)?.delete(socketId);
  }

  getSocketIds(userId: string): string[] {
    const ids = this.connections.get(userId);
    if (ids) return [...ids];
    return [];
  }

  isOnline(userId: string): boolean {
    const tracked = this.connections.has(userId);
    if (!tracked) return false;
    if (this.getSocketIds(userId).length === 0) return false;

    return true;
  }

  getOnlineUsers(): string[] {
    const onlineUsers = Array.from(this.connections.keys()).filter((userId) =>
      this.isOnline(userId),
    );
    return onlineUsers;
  }

  closeSocket() {
    this.connections.clear();
  }
}

export const socketService = SocketService.getInstance();
