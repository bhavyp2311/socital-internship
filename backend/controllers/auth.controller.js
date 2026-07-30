/**
 * controllers/auth.controller.js - Parses requests, calls the service, shapes responses.
 * No DB access or business logic here - that lives in services/auth.service.js.
 */

import * as authService from "../services/auth.service.js";

function handleError(res, err) {
  const status = err.status || 500;
  res.status(status).json({ success: false, message: err.message || "Something went wrong" });
}

export async function register(req, res) {
  try {
    const { full_name, email, phone, password } = req.body;
    if (!full_name || !email || !password) {
      return res.status(400).json({ success: false, message: "full_name, email and password are required" });
    }
    const data = await authService.register({ full_name, email, phone, password });
    res.status(201).json({ success: true, message: `OTP sent to ${data.email}`, data });
  } catch (err) {
    handleError(res, err);
  }
}

export async function verifyOtp(req, res) {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "email and otp are required" });
    }
    const data = await authService.verifyOtp({ email, otp });
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err);
  }
}

export async function googleAuth(req, res) {
  try {
    const { access_token, phone } = req.body;
    if (!access_token) {
      return res.status(400).json({ success: false, message: "access_token is required" });
    }
    const data = await authService.googleAuth({ access_token, phone });
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err);
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "email and password are required" });
    }
    const data = await authService.login({ email, password });
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err);
  }
}

export async function refresh(req, res) {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) {
      return res.status(400).json({ success: false, message: "refresh_token is required" });
    }
    const data = await authService.refreshAccessToken(refresh_token);
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err);
  }
}

export async function logout(req, res) {
  try {
    const { refresh_token } = req.body;
    await authService.logout(refresh_token);
    res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    handleError(res, err);
  }
}

export async function getMe(req, res) {
  try {
    const data = await authService.getProfile(req.user.sub);
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err);
  }
}

export async function updateMe(req, res) {
  try {
    const { full_name, phone, avatar_url } = req.body;
    const data = await authService.updateProfile(req.user.sub, { full_name, phone, avatar_url });
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err);
  }
}

export async function setPassword(req, res) {
  try {
    const { token, password, confirm_password } = req.body;
    if (!token || !password || !confirm_password) {
      return res
        .status(400)
        .json({ success: false, message: "token, password and confirm_password are required" });
    }
    if (password !== confirm_password) {
      return res.status(400).json({ success: false, message: "Passwords do not match" });
    }
    await authService.setPassword({ token, password });
    res.status(200).json({ success: true, message: "Password set. You can now log in." });
  } catch (err) {
    handleError(res, err);
  }
}