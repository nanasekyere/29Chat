import { Server, Socket } from "socket.io";
import { TypingEvents } from "@29chat/common";

export function registerTypingHandlers(io: Server, socket: Socket) {
  const userId = socket.data.userId as string;

  socket.on(TypingEvents.start, (data) => {
    const { roomId } = data;
    if (!roomId) return;

    socket.to(roomId).emit(TypingEvents.start, { userId, roomId });
  });

  socket.on(TypingEvents.stop, (data) => {
    const { roomId } = data;
    if (!roomId) return;

    socket.to(roomId).emit(TypingEvents.stop , { userId, roomId });
  });
}
