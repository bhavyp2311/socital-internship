import pool from "../db.js";
import { classifyComplaint } from "./ai.service.js";

function notFound(msg) { const e = new Error(msg); e.status = 404; return e; }
function badRequest(msg) { const e = new Error(msg); e.status = 400; return e; }

const VALID_STATUSES = ["pending", "assigned", "in_progress", "completed", "verified", "closed", "rejected", "duplicate"];
const VALID_PRIORITIES = ["low", "medium", "high", "critical"];

export async function submitComplaint(citizenId, municipality_id, { title, description, latitude, longitude, priority }) {
  if (!title || !description) throw badRequest("title and description are required");
  if (description.length < 20) throw badRequest("Description must be at least 20 characters");

  const safePriority = VALID_PRIORITIES.includes(priority) ? priority : "medium";

  // 1. Auto-detect ward via PostGIS
  let ward_id = null;
  if (latitude && longitude && municipality_id) {
    try {
      const wardResult = await pool.query(
        `SELECT id FROM wards
         WHERE municipality_id = $1
         AND ST_Contains(boundary, ST_SetSRID(ST_MakePoint($2, $3), 4326))
         LIMIT 1`,
        [municipality_id, longitude, latitude]
      );
      ward_id = wardResult.rows[0]?.id || null;
    } catch {
      ward_id = null;
    }
  }

  // 2. If no ward from PostGIS, try to find any ward in the municipality
  if (!ward_id && municipality_id) {
    try {
      const fallback = await pool.query(
        `SELECT id FROM wards WHERE municipality_id = $1 LIMIT 1`, [municipality_id]
      );
      ward_id = fallback.rows[0]?.id || null;
    } catch { ward_id = null; }
  }

  // 3. Insert complaint as "pending"
  const result = await pool.query(
    `INSERT INTO complaints (citizen_id, municipality_id, ward_id, title, description, latitude, longitude, priority, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending') RETURNING *`,
    [citizenId, municipality_id, ward_id, title, description, latitude || null, longitude || null, safePriority]
  );
  const complaint = result.rows[0];

  // 4. Auto-assign to available worker in the ward (or municipality)
  let autoAssigned = false;
  try {
    let worker = null;

    // Try ward-level first
    if (ward_id) {
      const wardWorker = await pool.query(
        `SELECT w.id FROM workers w
         WHERE w.ward_id = $1 AND w.municipality_id = $2 AND w.availability = 'available'
         ORDER BY w.current_workload ASC, RANDOM() LIMIT 1`,
        [ward_id, municipality_id]
      );
      worker = wardWorker.rows[0] || null;
    }

    // Fallback: any available worker in the municipality
    if (!worker && municipality_id) {
      const muniWorker = await pool.query(
        `SELECT w.id FROM workers w
         WHERE w.municipality_id = $1 AND w.availability = 'available'
         ORDER BY w.current_workload ASC, RANDOM() LIMIT 1`,
        [municipality_id]
      );
      worker = muniWorker.rows[0] || null;
    }

    if (worker) {
      // Create assignment
      await pool.query(
        `INSERT INTO complaint_assignments (complaint_id, worker_id, status)
         VALUES ($1, $2, 'assigned')`,
        [complaint.id, worker.id]
      );

      // Update complaint status
      await pool.query(
        `UPDATE complaints SET status = 'assigned', updated_at = NOW() WHERE id = $1`,
        [complaint.id]
      );

      // Increment worker workload
      await pool.query(
        `UPDATE workers SET current_workload = current_workload + 1 WHERE id = $1`,
        [worker.id]
      );

      // Timeline entry
      await pool.query(
        `INSERT INTO complaint_timeline (complaint_id, status, remarks, changed_by)
         VALUES ($1, 'assigned', 'Auto-assigned to available worker', NULL)`,
        [complaint.id]
      );

      autoAssigned = true;
      complaint.status = "assigned";
    }
  } catch (err) {
    console.error("Auto-assign failed:", err.message);
  }

  // 5. AI auto-classify in background (non-blocking)
  classifyComplaint(title, description, []).then(async (ai) => {
    try {
      await pool.query(
        `INSERT INTO ai_classifications (complaint_id, detected_category, confidence, priority_suggestion, department, summary, model_used)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [complaint.id, ai.category, ai.confidence, ai.priority_suggestion, ai.department, ai.summary, "llama-3.3-70b-versatile"]
      );
      // Update complaint with AI results
      const newPriority = ai.priority_suggestion && VALID_PRIORITIES.includes(ai.priority_suggestion)
        ? ai.priority_suggestion : complaint.priority;
      await pool.query(
        `UPDATE complaints SET ai_category = $1, ai_priority = $2, ai_department = $3, priority = $4, updated_at = NOW() WHERE id = $5`,
        [ai.category, ai.priority_suggestion, ai.department, newPriority, complaint.id]
      );
    } catch (err) {
      console.error("Failed to save AI classification:", err.message);
    }
  }).catch(() => {});

  complaint._auto_assigned = autoAssigned;
  return complaint;
}

export async function getComplaints(citizenId, { status, page = 1, limit = 20 }) {
  const offset = (page - 1) * limit;
  let where = "WHERE c.citizen_id = $1";
  const params = [citizenId];
  let idx = 2;

  if (status && VALID_STATUSES.includes(status)) {
    where += ` AND c.status = $${idx}`;
    params.push(status);
    idx++;
  }

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM complaints c ${where}`, params
  );

  const result = await pool.query(
    `SELECT c.id, c.complaint_no, c.title, c.description, c.status, c.priority,
            c.ai_category, c.created_at,
            pw.full_name AS worker_name
     FROM complaints c
     LEFT JOIN complaint_assignments ca ON ca.complaint_id = c.id AND ca.status IN ('assigned','accepted','in_progress')
     LEFT JOIN workers wk ON wk.id = ca.worker_id
     LEFT JOIN profiles pw ON pw.id = wk.profile_id
     ${where}
     ORDER BY c.created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset]
  );

  return {
    complaints: result.rows,
    total: parseInt(countResult.rows[0].count),
    page,
    limit,
  };
}

export async function getComplaintById(citizenId, complaintId) {
  const complaint = await pool.query(
    `SELECT * FROM complaints WHERE id = $1 AND citizen_id = $2`, [complaintId, citizenId]
  );
  if (!complaint.rows[0]) throw notFound("Complaint not found");

  const [images, timeline, assignment, feedback, aiClass] = await Promise.all([
    pool.query(`SELECT * FROM complaint_images WHERE complaint_id = $1 ORDER BY created_at`, [complaintId]),
    pool.query(
      `SELECT ct.status, ct.created_at, ct.remarks
       FROM complaint_timeline ct
       WHERE ct.complaint_id = $1 ORDER BY ct.created_at`, [complaintId]
    ),
    pool.query(
      `SELECT ca.status AS assignment_status, pw.full_name AS worker_name
       FROM complaint_assignments ca
       LEFT JOIN workers wk ON wk.id = ca.worker_id
       LEFT JOIN profiles pw ON pw.id = wk.profile_id
       WHERE ca.complaint_id = $1
       ORDER BY ca.assigned_at DESC LIMIT 1`, [complaintId]
    ),
    pool.query(`SELECT * FROM citizen_feedback WHERE complaint_id = $1`, [complaintId]),
    pool.query(`SELECT * FROM ai_classifications WHERE complaint_id = $1 ORDER BY created_at DESC LIMIT 1`, [complaintId]),
  ]);

  return {
    ...complaint.rows[0],
    images: images.rows,
    timeline: timeline.rows,
    assignment: assignment.rows[0] || null,
    feedback: feedback.rows[0] || null,
    ai_classification: aiClass.rows[0] || null,
  };
}

export async function submitFeedback(citizenId, complaintId, { rating, review }) {
  if (!rating || rating < 1 || rating > 5) throw badRequest("Rating must be between 1 and 5");

  const complaint = await pool.query(
    `SELECT * FROM complaints WHERE id = $1 AND citizen_id = $2`, [complaintId, citizenId]
  );
  if (!complaint.rows[0]) throw notFound("Complaint not found");

  const validFeedbackStatuses = ["completed", "verified", "closed"];
  if (!validFeedbackStatuses.includes(complaint.rows[0].status)) {
    throw badRequest("Feedback can only be submitted for completed/verified/closed complaints");
  }

  const result = await pool.query(
    `INSERT INTO citizen_feedback (complaint_id, citizen_id, rating, review)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (complaint_id, citizen_id) DO UPDATE SET
       rating = EXCLUDED.rating, review = EXCLUDED.review, updated_at = NOW()
     RETURNING *`,
    [complaintId, citizenId, rating, review || null]
  );

  return result.rows[0];
}
