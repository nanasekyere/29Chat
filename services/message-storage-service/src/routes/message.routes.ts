import { Router } from "express";
import * as controller from "../controllers/message.controller";
import { validateRequest } from "../middleware/validation.middleware";
import {
  roomIdParamSchema,
  messageIdParamSchema,
  roomAndMessageIdParamSchema,
  getMessagesQuerySchema,
  updateMessageBodySchema,
} from "../validators/message.validator";

const router = Router();

router.get(
  "/:roomId",
  validateRequest(roomIdParamSchema, "params"),
  validateRequest(getMessagesQuerySchema, "query"),
  controller.getMessages,
);
router.get(
  "/:roomId/:messageId",
  validateRequest(roomAndMessageIdParamSchema, "params"),
  controller.getMessage,
);
router.put(
  "/:messageId",
  validateRequest(messageIdParamSchema, "params"),
  validateRequest(updateMessageBodySchema, "body"),
  controller.updateMessage,
);
router.delete(
  "/:messageId",
  validateRequest(messageIdParamSchema, "params"),
  controller.deleteMessage,
);

export default router;
