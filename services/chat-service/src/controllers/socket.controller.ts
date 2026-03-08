import { Socket, Server } from "socket.io"
import { socketService } from "../services/socket.service"
import { registerMessageHandlers } from "../handlers/message.handler";
import { registerPresenceHandlers } from "../handlers/presence.handler";
import { registerTypingHandlers } from "../handlers/typing.handler";
import { createLogger } from "@29chat/common";

const logger = createLogger("chat-service-socket-controller")

export async function handleConnection(io: Server, socket: Socket) {
  const { userId } = socket.data;
  if (!userId) {
    socket.disconnect();
    return
  }
  socketService.addConnection(userId, socket.id)
  try {
    registerTypingHandlers(io, socket);
    await registerMessageHandlers(io, socket);
    await registerPresenceHandlers(io, socket);
  } catch (error: any) {
    logger.error(error.message)
    socket.disconnect();
  }


  socket.on('disconnect', () => {
    socketService.removeConnection(userId, socket.id)
  })
};
