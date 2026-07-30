/**
 * services/auth.service.js - Business logic for authentication.
 * Controllers stay thin; all DB access and rules live here.
 */

import axios from "axios";
import crypto from "crypto";

import pool from "../db.js";
import { accessTokenExpirySeconds, signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt.js";
import { generateOtp, minutesFromNow } from "../utils/otp.js";
import { comparePassword, hashPassword } from "../utils/password.js";
import { sendOtpEmail } from "./email.service.js";

const OTP_EXPIRY_MINUTES = 10;

function notFound(message) {
  const err = new Error(message);
  err.status = 404;
  return err;
}
function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}
function unauthorized(message) {
  const err = new Error(message);
  err.status = 401;
  return err;
}
function conflict(message) {
  const err = new Error(message);
  err.status = 409;
  return err;
}

function toPublicProfile(row) {
  return {
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    is_verified: row.is_verified,
    avatar_url: row.avatar_url,
    municipality_id: row.municipality_id,
    created_at: row.created_at,
  };
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function issueSession(profile) {
  const accessToken = signAccessToken({ sub: profile.id, role: profile.role });
  const refreshToken = signRefreshToken({ sub: profile.id });
  const decoded = verifyRefreshToken(refreshToken);

  await pool.query(
    `INSERT INTO refresh_tokens (profile_id, token_hash, expires_at)
     VALUES ($1, $2, to_timestamp($3))`,
    [profile.id, hashToken(refreshToken), decoded.exp]
  );

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: "Bearer",
    expires_in: accessTokenExpirySeconds(),
    profile: toPublicProfile(profile),
  };
}

export async function register({ full_name, email, phone, password }) {
  const existing = await pool.query("SELECT id FROM profiles WHERE email = $1", [email]);
  if (existing.rows.length > 0) throw conflict("Email already registered");

  const password_hash = await hashPassword(password);

  const result = await pool.query(
    `INSERT INTO profiles (full_name, email, phone, password_hash, role, is_verified)
     VALUES ($1, $2, $3, $4, 'citizen', false)
     RETURNING id, email`,
    [full_name, email, phone, password_hash]
  );
  const profile = result.rows[0];

  const otp = generateOtp();
  const expiresAt = minutesFromNow(OTP_EXPIRY_MINUTES);

  await pool.query(
    `INSERT INTO auth_tokens (profile_id, otp_code, purpose, expires_at)
     VALUES ($1, $2, 'email_verification', $3)`,
    [profile.id, otp, expiresAt]
  );

  try {
    await sendOtpEmail(profile.email, full_name, otp);
  } catch (emailErr) {
    // Don't let a broken/unconfigured Brevo account take down registration -
    // the account + OTP are already saved, just log so it's not silent.
    console.error("Failed to send OTP email via Brevo:", emailErr.response?.data || emailErr.message);
    console.warn(`[DEV] Brevo email failed - OTP for ${profile.email} is: ${otp}`);
  }

  return { user_id: profile.id, email: profile.email, otp_expires_at: expiresAt };
}

export async function verifyOtp({ email, otp }) {
  const profileResult = await pool.query("SELECT * FROM profiles WHERE email = $1", [email]);
  const profile = profileResult.rows[0];
  if (!profile) throw notFound("No account found for this email");

  const tokenResult = await pool.query(
    `SELECT * FROM auth_tokens
     WHERE profile_id = $1 AND otp_code = $2 AND purpose = 'email_verification'
       AND is_used = false AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [profile.id, otp]
  );
  const tokenRow = tokenResult.rows[0];
  if (!tokenRow) throw badRequest("Invalid or expired OTP");

  await pool.query("UPDATE auth_tokens SET is_used = true WHERE id = $1", [tokenRow.id]);
  const updated = await pool.query(
    "UPDATE profiles SET is_verified = true WHERE id = $1 RETURNING *",
    [profile.id]
  );

  return issueSession(updated.rows[0]);
}

export async function googleAuth({ access_token, phone }) {
  let googleUser;
  try {
    const { data } = await axios.get("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    googleUser = data;
  } catch {
    throw unauthorized("Invalid Google access token");
  }
  if (!googleUser?.email) throw unauthorized("Invalid Google access token");

  const existing = await pool.query("SELECT * FROM profiles WHERE email = $1", [googleUser.email]);
  let profile = existing.rows[0];
  let is_new_user = false;

  if (!profile) {
    is_new_user = true;
    const result = await pool.query(
      `INSERT INTO profiles (full_name, email, phone, role, is_verified, avatar_url)
       VALUES ($1, $2, $3, 'citizen', true, $4)
       RETURNING *`,
      [googleUser.name || googleUser.email, googleUser.email, phone || null, googleUser.picture || null]
    );
    profile = result.rows[0];
  }

  const session = await issueSession(profile);
  return { ...session, is_new_user };
}

export async function login({ email, password }) {
  const result = await pool.query("SELECT * FROM profiles WHERE email = $1", [email]);
  const profile = result.rows[0];
  if (!profile || !profile.password_hash) throw unauthorized("Invalid email or password");

  const valid = await comparePassword(password, profile.password_hash);
  if (!valid) throw unauthorized("Invalid email or password");

  if (!profile.is_verified) throw new Error("Account not verified. Please verify your email first.");

  return issueSession(profile);
}

export async function refreshAccessToken(refreshToken) {
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw unauthorized("Invalid or expired refresh token");
  }

  const tokenHash = hashToken(refreshToken);
  const sessionResult = await pool.query(
    `SELECT * FROM refresh_tokens WHERE token_hash = $1 AND revoked = false AND expires_at > NOW()`,
    [tokenHash]
  );
  if (sessionResult.rows.length === 0) throw unauthorized("Refresh token not recognized or revoked");

  const profileResult = await pool.query("SELECT id, role FROM profiles WHERE id = $1", [decoded.sub]);
  const profile = profileResult.rows[0];
  if (!profile) throw unauthorized("Account no longer exists");

  const accessToken = signAccessToken({ sub: profile.id, role: profile.role });
  return { access_token: accessToken, expires_in: accessTokenExpirySeconds() };
}

export async function logout(refreshToken) {
  if (!refreshToken) return;
  await pool.query("UPDATE refresh_tokens SET revoked = true WHERE token_hash = $1", [hashToken(refreshToken)]);
}

export async function getProfile(profileId) {
  const result = await pool.query("SELECT * FROM profiles WHERE id = $1", [profileId]);
  if (result.rows.length === 0) throw notFound("Profile not found");
  return toPublicProfile(result.rows[0]);
}

export async function updateProfile(profileId, { full_name, phone, avatar_url }) {
  const result = await pool.query(
    `UPDATE profiles SET
       full_name = COALESCE($1, full_name),
       phone = COALESCE($2, phone),
       avatar_url = COALESCE($3, avatar_url)
     WHERE id = $4
     RETURNING *`,
    [full_name, phone, avatar_url, profileId]
  );
  if (result.rows.length === 0) throw notFound("Profile not found");
  return toPublicProfile(result.rows[0]);
}

export async function setPassword({ token, password }) {
  const tokenResult = await pool.query(
    `SELECT * FROM auth_tokens
     WHERE token = $1 AND purpose = 'worker_invite' AND is_used = false AND expires_at > NOW()`,
    [token]
  );
  const tokenRow = tokenResult.rows[0];
  if (!tokenRow) throw badRequest("Invalid or expired invite link");

  const password_hash = await hashPassword(password);
  await pool.query("UPDATE profiles SET password_hash = $1, is_verified = true WHERE id = $2", [
    password_hash,
    tokenRow.profile_id,
  ]);
  await pool.query("UPDATE auth_tokens SET is_used = true WHERE id = $1", [tokenRow.id]);
}