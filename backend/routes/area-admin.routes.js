import { Router } from "express";
import * as areaAdminController from "../controllers/area-admin.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";
import { attachMunicipality } from "../middleware/municipality.middleware.js";
import { attachWard } from "../middleware/ward.middleware.js";

const router = Router();
const areaAdminMiddleware = [requireAuth, requireRole("area_admin", "admin", "super_admin"), attachMunicipality, attachWard];

router.get("/dashboard", ...areaAdminMiddleware, areaAdminController.getDashboard);
router.get("/complaints", ...areaAdminMiddleware, areaAdminController.getComplaints);
router.get("/complaints/:id", ...areaAdminMiddleware, areaAdminController.getComplaint);
router.patch("/complaints/:id/assign", ...areaAdminMiddleware, areaAdminController.assignComplaint);
router.patch("/complaints/:id/status", ...areaAdminMiddleware, areaAdminController.updateStatus);
router.get("/workers", ...areaAdminMiddleware, areaAdminController.getWorkers);
router.post("/workers", ...areaAdminMiddleware, areaAdminController.createWorker);

export default router;
