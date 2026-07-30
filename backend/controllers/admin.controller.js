/**
 * controllers/admin.controller.js
 */

import * as adminService from "../services/admin.service.js";

function handleError(res, err) {
  const status = err.status || 500;
  res.status(status).json({ success: false, message: err.message || "Something went wrong" });
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

export async function getDashboard(req, res) {
  try {
    const data = await adminService.getDashboardStats(req.municipality_id);
    res.json({ success: true, data });
  } catch (err) { handleError(res, err); }
}

// ─── MUNICIPALITIES ───────────────────────────────────────────────────────────

export async function getMunicipalities(req, res) {
  try {
    const data = await adminService.getMunicipalities();
    res.json({ success: true, data });
  } catch (err) { handleError(res, err); }
}

export async function getMunicipality(req, res) {
  try {
    const data = await adminService.getMunicipalityById(req.params.id);
    res.json({ success: true, data });
  } catch (err) { handleError(res, err); }
}

export async function createMunicipality(req, res) {
  try {
    const data = await adminService.createMunicipality(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) { handleError(res, err); }
}

export async function updateMunicipality(req, res) {
  try {
    const data = await adminService.updateMunicipality(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (err) { handleError(res, err); }
}

export async function deleteMunicipality(req, res) {
  try {
    await adminService.deleteMunicipality(req.params.id);
    res.json({ success: true, message: "Municipality deleted" });
  } catch (err) { handleError(res, err); }
}

// ─── SUBSCRIPTIONS ────────────────────────────────────────────────────────────

export async function getSubscription(req, res) {
  try {
    const data = await adminService.getSubscription(req.params.municipalityId);
    res.json({ success: true, data });
  } catch (err) { handleError(res, err); }
}

export async function upsertSubscription(req, res) {
  try {
    const data = await adminService.upsertSubscription(req.params.municipalityId, req.body);
    res.json({ success: true, data });
  } catch (err) { handleError(res, err); }
}

// ─── ZONES ────────────────────────────────────────────────────────────────────

export async function getZones(req, res) {
  try {
    const data = await adminService.getZones(req.municipality_id);
    res.json({ success: true, data });
  } catch (err) { handleError(res, err); }
}

export async function createZone(req, res) {
  try {
    const data = await adminService.createZone(req.municipality_id, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) { handleError(res, err); }
}

export async function updateZone(req, res) {
  try {
    const data = await adminService.updateZone(req.params.id, req.municipality_id, req.body);
    res.json({ success: true, data });
  } catch (err) { handleError(res, err); }
}

export async function deleteZone(req, res) {
  try {
    await adminService.deleteZone(req.params.id, req.municipality_id);
    res.json({ success: true, message: "Zone deleted" });
  } catch (err) { handleError(res, err); }
}

// ─── WARDS ────────────────────────────────────────────────────────────────────

export async function getWards(req, res) {
  try {
    const data = await adminService.getWards(req.municipality_id);
    res.json({ success: true, data });
  } catch (err) { handleError(res, err); }
}

export async function createWard(req, res) {
  try {
    const data = await adminService.createWard(req.municipality_id, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) { handleError(res, err); }
}

export async function updateWard(req, res) {
  try {
    const data = await adminService.updateWard(req.params.id, req.municipality_id, req.body);
    res.json({ success: true, data });
  } catch (err) { handleError(res, err); }
}

export async function deleteWard(req, res) {
  try {
    await adminService.deleteWard(req.params.id, req.municipality_id);
    res.json({ success: true, message: "Ward deleted" });
  } catch (err) { handleError(res, err); }
}

// ─── DEPARTMENTS ──────────────────────────────────────────────────────────────

export async function getDepartments(req, res) {
  try {
    const data = await adminService.getDepartments(req.municipality_id);
    res.json({ success: true, data });
  } catch (err) { handleError(res, err); }
}

export async function createDepartment(req, res) {
  try {
    const data = await adminService.createDepartment(req.municipality_id, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) { handleError(res, err); }
}

export async function updateDepartment(req, res) {
  try {
    const data = await adminService.updateDepartment(req.params.id, req.municipality_id, req.body);
    res.json({ success: true, data });
  } catch (err) { handleError(res, err); }
}

export async function deleteDepartment(req, res) {
  try {
    await adminService.deleteDepartment(req.params.id, req.municipality_id);
    res.json({ success: true, message: "Department deleted" });
  } catch (err) { handleError(res, err); }
}

// ─── USERS ────────────────────────────────────────────────────────────────────

export async function getUsers(req, res) {
  try {
    const data = await adminService.getUsers(req.municipality_id, req.query.role);
    res.json({ success: true, data });
  } catch (err) { handleError(res, err); }
}

export async function getUser(req, res) {
  try {
    const data = await adminService.getUserById(req.params.id, req.municipality_id);
    res.json({ success: true, data });
  } catch (err) { handleError(res, err); }
}

export async function activateUser(req, res) {
  try {
    const data = await adminService.toggleUserActive(req.params.id, req.municipality_id, true);
    res.json({ success: true, message: "User activated", data });
  } catch (err) { handleError(res, err); }
}

export async function deactivateUser(req, res) {
  try {
    const data = await adminService.toggleUserActive(req.params.id, req.municipality_id, false);
    res.json({ success: true, message: "User deactivated", data });
  } catch (err) { handleError(res, err); }
}