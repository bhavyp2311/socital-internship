/**
 * routes/invite.routes.js
 *
 * POST /invites       → send an invite (super_admin, admin, area_admin only)
 * GET  /invites       → list invited users under your municipality
 */

import { Router } from "express";

import * as inviteController from "../controllers/invite.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/role.middleware.js";

const router = Router();

router.post(
  "/",
  requireAuth,
  requireRole("super_admin", "admin", "area_admin"),
  inviteController.inviteUser
);

router.get(
  "/",
  requireAuth,
  requireRole("super_admin", "admin", "area_admin"),
  inviteController.getInvitedUsers
);

export default router;