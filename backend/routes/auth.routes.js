/**
 * routes/auth.routes.js - All /auth/* endpoints from the API spec.
 */

import { Router } from "express";

import * as authController from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/register", authController.register);
router.post("/verify-otp", authController.verifyOtp);
router.post("/google", authController.googleAuth);
router.post("/login", authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", requireAuth, authController.logout);
router.get("/me", requireAuth, authController.getMe);
router.put("/me", requireAuth, authController.updateMe);
router.post("/set-password", authController.setPassword);

export default router;