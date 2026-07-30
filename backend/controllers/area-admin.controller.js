import * as areaAdminService from "../services/area-admin.service.js";

function handleError(res, err) {
  const status = err.status || 500;
  res.status(status).json({ success: false, message: err.message || "Something went wrong" });
}

export async function getDashboard(req, res) {
  try {
    const data = await areaAdminService.getDashboard(req.ward_id, req.municipality_id);
    res.json({ success: true, data });
  } catch (err) { handleError(res, err); }
}

export async function getComplaints(req, res) {
  try {
    const { status, priority, search, page, limit } = req.query;
    const data = await areaAdminService.getComplaints(req.ward_id, req.municipality_id, {
      status, priority, search,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
    });
    res.json({ success: true, data });
  } catch (err) { handleError(res, err); }
}

export async function getComplaint(req, res) {
  try {
    const data = await areaAdminService.getComplaintById(req.ward_id, req.municipality_id, req.params.id);
    res.json({ success: true, data });
  } catch (err) { handleError(res, err); }
}

export async function assignComplaint(req, res) {
  try {
    const { worker_id, remarks } = req.body;
    if (!worker_id) return res.status(400).json({ success: false, message: "worker_id is required" });
    const data = await areaAdminService.assignComplaint(req.ward_id, req.municipality_id, req.params.id, { worker_id, remarks });
    res.json({ success: true, message: "Complaint assigned", data });
  } catch (err) { handleError(res, err); }
}

export async function updateStatus(req, res) {
  try {
    const { status, remarks } = req.body;
    if (!status) return res.status(400).json({ success: false, message: "status is required" });
    const data = await areaAdminService.updateStatus(req.ward_id, req.municipality_id, req.params.id, { status, remarks });
    res.json({ success: true, message: "Status updated", data });
  } catch (err) { handleError(res, err); }
}

export async function getWorkers(req, res) {
  try {
    const data = await areaAdminService.getWorkers(req.ward_id);
    res.json({ success: true, data });
  } catch (err) { handleError(res, err); }
}

export async function createWorker(req, res) {
  try {
    const { email, full_name, phone, department_id } = req.body;
    if (!email || !full_name) return res.status(400).json({ success: false, message: "email and full_name are required" });
    const data = await areaAdminService.createWorker(req.ward_id, req.municipality_id, { email, full_name, phone, department_id });
    res.status(201).json({ success: true, message: "Worker added", data });
  } catch (err) { handleError(res, err); }
}
