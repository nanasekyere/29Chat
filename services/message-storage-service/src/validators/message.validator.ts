import { z } from "zod";

export const roomIdParamSchema = z.object({
  roomId: z.uuid(),
});

export const messageIdParamSchema = z.object({
  messageId: z.uuid(),
});

export const roomAndMessageIdParamSchema = z.object({
  roomId: z.uuid(),
  messageId: z.uuid(),
});

const optionalInt = (defaultVal: number) =>
  z.preprocess(
    (val) => (val === undefined || val === "" ? defaultVal : Number(val)),
    z.number().int(),
  );

export const getMessagesQuerySchema = z.object({
  limit: optionalInt(50).pipe(z.number().min(1).max(100)),
  offset: optionalInt(0).pipe(z.number().min(0)),
});

export const updateMessageBodySchema = z.object({
  content: z.string().min(1).max(255),
});
