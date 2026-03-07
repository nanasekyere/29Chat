import { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { AppError, JWTPayload } from "@29chat/common";

export function socketAuth(socket: Socket, next: (err?: Error) => void) {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.split(" ")[1];
    if (!token) throw new AppError("No token provided", 401);

    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    const userData = decoded as JWTPayload;
    socket.data.userId = userData.id;
    next();

  } catch (error) {
    if (error instanceof AppError) return next(error);
    next(AppError.create("Error authenticating socket connection"));
  }
}
