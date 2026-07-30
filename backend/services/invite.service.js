/**
 * services/invite.service.js - Invite flow for creating admin/area_admin/worker accounts.
 *
 * Permission matrix:
 *   super_admin  → can invite: admin, area_admin, worker
 *   admin        → can invite: area_admin, worker
 *   area_admin   → can invite: worker
 */

import pool from "../db.js";
import { generateToken, minutesFromNow } from "../utils/otp.js";
import { sendWorkerInviteEmail } from "./email.service.js";

const INVITE_EXPIRY_MINUTES = 60 * 48; // 48 hours

// Who can invite whom
const INVITE_PERMISSIONS = {
  super_admin: ["admin", "area_admin", "worker"],
  admin: ["area_admin", "worker"],
  area_admin: ["worker"],
};

function forbidden(message) {
  const err = new Error(message);
  err.status = 403;
  return err;
}
function conflict(message) {
  const err = new Error(message);
  err.status = 409;
  return err;
}
function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

export async function inviteUser(callerProfileId, callerRole, { full_name, email, phone, role, ward_id, department_id }) {
  // 1. Check caller is allowed to invite this role
  const allowed = INVITE_PERMISSIONS[callerRole];
  if (!allowed || !allowed.includes(role)) {
    throw forbidden(`A ${callerRole} cannot invite a ${role}`);
  }

  // 2. Validate role is a known invitable role
  const invitableRoles = ["admin", "area_admin", "worker"];
  if (!invitableRoles.includes(role)) {
    throw badRequest(`Role must be one of: ${invitableRoles.join(", ")}`);
  }

  // 3. Check email not already registered
  const existing = await pool.query("SELECT id FROM profiles WHERE email = $1", [email]);
  if (existing.rows.length > 0) throw conflict("Email already registered");

  // 4. Get caller's municipality_id so the new profile inherits it
  const callerResult = await pool.query(
    "SELECT municipality_id FROM profiles WHERE id = $1",
    [callerProfileId]
  );
  const municipality_id = callerResult.rows[0]?.municipality_id || null;

  // 5. Create the profile (unverified, no password yet)
  const profileResult = await pool.query(
    `INSERT INTO profiles (full_name, email, phone, role, municipality_id, is_verified)
     VALUES ($1, $2, $3, $4, $5, false)
     RETURNING id, email, full_name, role`,
    [full_name, email, phone || null, role, municipality_id]
  );
  const profile = profileResult.rows[0];

  // 6. If role = worker, also create a workers row
  if (role === "worker") {
    await pool.query(
      `INSERT INTO workers (profile_id, municipality_id, ward_id, department_id)
       VALUES ($1, $2, $3, $4)`,
      [profile.id, municipality_id, ward_id || null, department_id || null]
    );
  }

  // 7. If role = area_admin and ward_id is provided, create ward_admin mapping
  if (role === "area_admin" && ward_id) {
    await pool.query(
      `INSERT INTO ward_admins (profile_id, ward_id, municipality_id)
       VALUES ($1, $2, $3)`,
      [profile.id, ward_id, municipality_id]
    );
  }

  // 8. Generate invite token (48h expiry)
  const token = generateToken();
  const expiresAt = minutesFromNow(INVITE_EXPIRY_MINUTES);
  await pool.query(
    `INSERT INTO auth_tokens (profile_id, token, purpose, expires_at)
     VALUES ($1, $2, 'worker_invite', $3)`,
    [profile.id, token, expiresAt]
  );

  // 9. Send invite email (non-fatal - log if it fails)
  const setPasswordUrl = `${process.env.FRONTEND_URL}/auth/set-password.html?token=${token}`;
  try {
    await sendWorkerInviteEmail(profile.email, profile.full_name, setPasswordUrl);
  } catch (emailErr) {
    console.error("Failed to send invite email:", emailErr.response?.data || emailErr.message);
    console.warn(`[DEV] Invite token for ${profile.email}: ${token}`);
  }

  return {
    profile_id: profile.id,
    email: profile.email,
    full_name: profile.full_name,
    role: profile.role,
    invite_expires_at: expiresAt,
  };
}

export async function getInvitedUsers(callerProfileId, callerRole) {
  // Returns users invited under the caller's municipality
  const callerResult = await pool.query(
    "SELECT municipality_id FROM profiles WHERE id = $1",
    [callerProfileId]
  );
  const municipality_id = callerResult.rows[0]?.municipality_id;

  const viewableRoles = INVITE_PERMISSIONS[callerRole] || [];
  if (viewableRoles.length === 0) {
    return [];
  }

  const result = await pool.query(
    `SELECT id, full_name, email, phone, role, is_verified, is_active, created_at
     FROM profiles
     WHERE municipality_id = $1 AND role = ANY($2::user_role[])
     ORDER BY created_at DESC`,
    [municipality_id, viewableRoles]
  );
  return result.rows;
}