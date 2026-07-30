import { Router } from "express";
import multer from "multer";
import * as workerController from "../controllers/worker.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";
import { attachWorker } from "../middleware/worker.middleware.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only images allowed"), false);
  },
});

const workerMiddleware = [requireAuth, requireRole("worker"), attachWorker];

router.get("/dashboard", ...workerMiddleware, workerController.getDashboard);
router.get("/complaints", ...workerMiddleware, workerController.getComplaints);
router.get("/complaints/:id", ...workerMiddleware, workerController.getComplaint);
router.patch("/complaints/:id/accept", ...workerMiddleware, workerController.acceptComplaint);
router.patch("/complaints/:id/start", ...workerMiddleware, workerController.startComplaint);
router.patch("/complaints/:id/complete", ...workerMiddleware, workerController.completeComplaint);
router.post("/complaints/:id/images", ...workerMiddleware, upload.single("image"), workerController.uploadImageHandler);
router.patch("/availability", ...workerMiddleware, workerController.setAvailability);

export default router;
