import { Server, Socket } from "socket.io";
import { MessageEvents } from "@29chat/common";
import { NewMessage } from "@29chat/database";
import * as messageService from "../services/message.service";

export async function registerMessageHandlers(io: Server, socket: Socket) {
  const userId = socket.data.userId as string;

  socket.on(MessageEvents.send, async (data, callback) => {
    try {
      const msg = data as NewMessage;
      msg.senderId = userId;
      await messageService.sendMessage(msg);
      socket.to(msg.roomId).emit(MessageEvents.new, msg);
      callback({ success: true });
    } catch (error: any) {
      callback({ error: error.message });
    }
  });
}
