import * as citizenService from "../services/citizen.service.js";
import { uploadImage } from "../services/storage.service.js";
import pool from "../db.js";

function handleError(res, err) {
  const status = err.status || 500;
  res.status(status).json({ success: false, message: err.message || "Something went wrong" });
}

export async function submitComplaint(req, res) {
  try {
    const { title, description, latitude, longitude, priority, municipality_id } = req.body;
    if (!title || !description) {
      return res.status(400).json({ success: false, message: "title and description are required" });
    }

    let muni_id = municipality_id;
    if (!muni_id) {
      const result = await pool.query(
        `SELECT municipality_id FROM profiles WHERE id = $1`, [req.user.sub]
      );
      muni_id = result.rows[0]?.municipality_id;
    }

    const data = await citizenService.submitComplaint(req.user.sub, muni_id, {
      title, description, latitude, longitude, priority,
    });
    res.status(201).json({ success: true, data });
  } catch (err) { handleError(res, err); }
}

export async function uploadImageHandler(req, res) {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No image provided" });

    const complaint = await pool.query(
      `SELECT * FROM complaints WHERE id = $1 AND citizen_id = $2`,
      [req.params.id, req.user.sub]
    );
    if (!complaint.rows[0]) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    const folder = `municipal/complaints/${req.params.id}`;
    const url = await uploadImage(req.file.buffer, req.file.mimetype, folder);

    const result = await pool.query(
      `INSERT INTO complaint_images (complaint_id, image_url, image_type, uploaded_by)
       VALUES ($1, $2, 'complaint', $3) RETURNING *`,
      [req.params.id, url, req.user.sub]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) { handleError(res, err); }
}

export async function getComplaints(req, res) {
  try {
    const { status, page, limit } = req.query;
    const data = await citizenService.getComplaints(req.user.sub, {
      status, page: parseInt(page) || 1, limit: parseInt(limit) || 20,
    });
    res.json({ success: true, data });
  } catch (err) { handleError(res, err); }
}

export async function getComplaint(req, res) {
  try {
    const data = await citizenService.getComplaintById(req.user.sub, req.params.id);
    res.json({ success: true, data });
  } catch (err) { handleError(res, err); }
}

export async function submitFeedback(req, res) {
  try {
    const { rating, review } = req.body;
    if (!rating) return res.status(400).json({ success: false, message: "rating is required" });
    const data = await citizenService.submitFeedback(req.user.sub, req.params.id, { rating, review });
    res.json({ success: true, message: "Feedback submitted", data });
  } catch (err) { handleError(res, err); }
}
