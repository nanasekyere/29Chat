import { Request, Response, NextFunction } from "express";
import * as roomService from "../services/room.service";

export async function createRoom(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const { name, type } = req.body;
  const userId = req.user!.id;

  try {
    const room = await roomService.createRoom(name, type, userId);
    res.status(201).json({ room });
  } catch (error) {
    next(error);
  }
}

export async function getRooms(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const userId = req.user!.id;

  try {
    const rooms = await roomService.getRoomsByUserId(userId);
    res.status(200).json({ rooms });
  } catch (error) {
    next(error);
  }
}

export async function joinRoom(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const roomId = req.params.roomId as string;
  const userId = req.user!.id;

  try {
    await roomService.joinRoom(roomId, userId);
    res.status(200).json({ message: "Joined room" });
  } catch (error) {
    next(error);
  }
}

export async function leaveRoom(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const roomId = req.params.roomId as string;
  const userId = req.user!.id;

  try {
    await roomService.leaveRoom(roomId, userId);
    res.status(200).json({ message: "Left room" });
  } catch (error) {
    next(error);
  }
}

export async function getRoomMembers(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const roomId = req.params.roomId as string;

  try {
    const members = await roomService.getRoomMembers(roomId);
    res.status(200).json({ members });
  } catch (error) {
    next(error);
  }
}
