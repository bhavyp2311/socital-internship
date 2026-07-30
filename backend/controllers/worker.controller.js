import * as workerService from "../services/worker.service.js";
import { uploadImage } from "../services/storage.service.js";
import pool from "../db.js";

function handleError(res, err) {
  const status = err.status || 500;
  res.status(status).json({ success: false, message: err.message || "Something went wrong" });
}

export async function getDashboard(req, res) {
  try {
    const data = await workerService.getDashboard(req.worker);
    res.json({ success: true, data });
  } catch (err) { handleError(res, err); }
}

export async function getComplaints(req, res) {
  try {
    const { status, page, limit } = req.query;
    const data = await workerService.getComplaints(req.worker.id, {
      status, page: parseInt(page) || 1, limit: parseInt(limit) || 20,
    });
    res.json({ success: true, data });
  } catch (err) { handleError(res, err); }
}

export async function getComplaint(req, res) {
  try {
    const data = await workerService.getComplaintById(req.worker.id, req.params.id);
    res.json({ success: true, data });
  } catch (err) { handleError(res, err); }
}

export async function acceptComplaint(req, res) {
  try {
    const data = await workerService.acceptComplaint(req.worker.id, req.params.id);
    res.json({ success: true, message: "Complaint accepted", data });
  } catch (err) { handleError(res, err); }
}

export async function startComplaint(req, res) {
  try {
    const data = await workerService.startComplaint(req.worker.id, req.params.id);
    res.json({ success: true, message: "Work started", data });
  } catch (err) { handleError(res, err); }
}

export async function completeComplaint(req, res) {
  try {
    const { remarks } = req.body;
    // Require at least one image
    const imgCheck = await pool.query(
      `SELECT 1 FROM complaint_images WHERE complaint_id = $1 LIMIT 1`, [req.params.id]
    );
    if (imgCheck.rows.length === 0) {
      return res.status(400).json({ success: false, message: "Upload at least one image before completing" });
    }
    const data = await workerService.completeComplaint(req.worker.id, req.params.id, { remarks });
    res.json({ success: true, message: "Complaint completed", data });
  } catch (err) { handleError(res, err); }
}

export async function uploadImageHandler(req, res) {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No image provided" });

    const folder = `municipal/complaints/${req.params.id}`;
    const url = await uploadImage(req.file.buffer, req.file.mimetype, folder);

    const result = await pool.query(
      `INSERT INTO complaint_images (complaint_id, image_url, image_type, uploaded_by)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.params.id, url, req.body.image_type || "progress", req.user.sub]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) { handleError(res, err); }
}

export async function setAvailability(req, res) {
  try {
    const { availability } = req.body;
    if (!availability) return res.status(400).json({ success: false, message: "availability is required" });
    const data = await workerService.setAvailability(req.worker.id, availability);
    res.json({ success: true, data });
  } catch (err) { handleError(res, err); }
}
