/**
 * routes/admin.routes.js
 * All routes require: auth + role(super_admin | admin) + municipality scoping.
 *
 * Exceptions:
 *   - Municipalities CRUD → super_admin only (no municipality scope needed)
 *   - Subscriptions       → super_admin only
 */

import { Router } from "express";

import * as adminController from "../controllers/admin.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { attachMunicipality } from "../middleware/municipality.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";

const router = Router();

const superAdmin   = [requireAuth, requireRole("super_admin")];
const adminOrAbove = [requireAuth, requireRole("super_admin", "admin"), attachMunicipality];

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
router.get("/dashboard", ...adminOrAbove, adminController.getDashboard);

// ─── MUNICIPALITIES (super_admin only, no municipality scope) ─────────────────
router.get("/municipalities",          ...superAdmin, adminController.getMunicipalities);
router.post("/municipalities",         ...superAdmin, adminController.createMunicipality);
router.get("/municipalities/:id",      ...superAdmin, adminController.getMunicipality);
router.put("/municipalities/:id",      ...superAdmin, adminController.updateMunicipality);
router.delete("/municipalities/:id",   ...superAdmin, adminController.deleteMunicipality);

// ─── SUBSCRIPTIONS (super_admin only) ────────────────────────────────────────
router.get("/municipalities/:municipalityId/subscription",  ...superAdmin, adminController.getSubscription);
router.put("/municipalities/:municipalityId/subscription",  ...superAdmin, adminController.upsertSubscription);

// ─── ZONES ────────────────────────────────────────────────────────────────────
router.get("/zones",          ...adminOrAbove, adminController.getZones);
router.post("/zones",         ...adminOrAbove, adminController.createZone);
router.put("/zones/:id",      ...adminOrAbove, adminController.updateZone);
router.delete("/zones/:id",   ...adminOrAbove, adminController.deleteZone);

// ─── WARDS ────────────────────────────────────────────────────────────────────
router.get("/wards",          ...adminOrAbove, adminController.getWards);
router.post("/wards",         ...adminOrAbove, adminController.createWard);
router.put("/wards/:id",      ...adminOrAbove, adminController.updateWard);
router.delete("/wards/:id",   ...adminOrAbove, adminController.deleteWard);

// ─── DEPARTMENTS ──────────────────────────────────────────────────────────────
router.get("/departments",          ...adminOrAbove, adminController.getDepartments);
router.post("/departments",         ...adminOrAbove, adminController.createDepartment);
router.put("/departments/:id",      ...adminOrAbove, adminController.updateDepartment);
router.delete("/departments/:id",   ...adminOrAbove, adminController.deleteDepartment);

// ─── USERS ────────────────────────────────────────────────────────────────────
// GET /admin/users?role=worker  →  filter by role
router.get("/users",                    ...adminOrAbove, adminController.getUsers);
router.get("/users/:id",               ...adminOrAbove, adminController.getUser);
router.patch("/users/:id/activate",    ...adminOrAbove, adminController.activateUser);
router.patch("/users/:id/deactivate",  ...adminOrAbove, adminController.deactivateUser);

export default router;