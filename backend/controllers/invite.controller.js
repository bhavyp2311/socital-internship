/**
 * controllers/invite.controller.js
 */

import * as inviteService from "../services/invite.service.js";

function handleError(res, err) {
  const status = err.status || 500;
  res.status(status).json({ success: false, message: err.message || "Something went wrong" });
}

export async function inviteUser(req, res) {
  try {
    const { full_name, email, phone, role, ward_id, department_id } = req.body;

    if (!full_name || !email || !role) {
      return res.status(400).json({ success: false, message: "full_name, email and role are required" });
    }

    const data = await inviteService.inviteUser(
      req.user.sub,
      req.user.role,
      { full_name, email, phone, role, ward_id, department_id }
    );

    res.status(201).json({
      success: true,
      message: `Invite sent to ${data.email}`,
      data,
    });
  } catch (err) {
    handleError(res, err);
  }
}

export async function getInvitedUsers(req, res) {
  try {
    const data = await inviteService.getInvitedUsers(req.user.sub, req.user.role);
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err);
  }
}