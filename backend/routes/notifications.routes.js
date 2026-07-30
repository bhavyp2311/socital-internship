import { Router } from "express";
import * as notificationsController from "../controllers/notifications.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", requireAuth, notificationsController.getNotifications);
router.patch("/read-all", requireAuth, notificationsController.markAllRead);
router.patch("/:id/read", requireAuth, notificationsController.markRead);

export default router;
