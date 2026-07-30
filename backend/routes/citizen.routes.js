import { Router } from "express";
import multer from "multer";
import * as citizenController from "../controllers/citizen.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only images allowed"), false);
  },
});

const citizenOnly = [requireAuth, requireRole("citizen")];

router.post("/complaints", ...citizenOnly, citizenController.submitComplaint);
router.get("/complaints", ...citizenOnly, citizenController.getComplaints);
router.get("/complaints/:id", ...citizenOnly, citizenController.getComplaint);
router.post("/complaints/:id/images", ...citizenOnly, upload.single("image"), citizenController.uploadImageHandler);
router.post("/complaints/:id/feedback", ...citizenOnly, citizenController.submitFeedback);

export default router;
