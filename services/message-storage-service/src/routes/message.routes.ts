import { Router } from "express";
import * as controller from "../controllers/message.controller";

const router = Router();

router.get("/:roomId", controller.getMessages);
router.get("/:roomId/:messageId", controller.getMessage);
router.put("/:messageId", controller.updateMessage);
router.delete("/:messageId", controller.deleteMessage);

export default router;
