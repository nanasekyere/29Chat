import { Request, Response, NextFunction } from "express";
import * as msgService from "../services/message.service";

export async function getMessages(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const roomId = req.params.roomId as string;
    const limit = Number(req.query.limit ?? 50);
    const offset = Number(req.query.offset ?? 0);

    const result = await msgService.getMessagesByRoomId(roomId, limit, offset);

    res.status(200).json({ messages: result });
  } catch (error) {
    next(error);
  }
}

export async function getMessage(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const messageId = req.params.messageId as string;
    const message = await msgService.getMessageById(messageId);

    res.status(200).json({ message });
  } catch (error) {
    next(error);
  }
}

export async function updateMessage(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const messageId = req.params.messageId as string;
    const content = req.body.content as string;
    const userId = req.headers['x-user-id'] as string // UserID is forwarded by gateway

    const updatedMsg = await msgService.updateMessage(
      messageId,
      userId,
      content,
    );

    res.status(200).json({ message: updatedMsg });
  } catch (error) {
    next(error);
  }
}

export async function deleteMessage(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const messageId = req.params.messageId as string;
    const userId = req.headers['x-user-id'] as string  // UserID is forwarded by gateway

    await msgService.softDeleteMessage(messageId, userId);

    res.status(204).send();
  } catch (error) {
    next(error)
  }
}
