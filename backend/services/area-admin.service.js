import pool from "../db.js";
import { createNotification } from "./notifications.service.js";

function notFound(msg) { const e = new Error(msg); e.status = 404; return e; }
function badRequest(msg) { const e = new Error(msg); e.status = 400; return e; }
function conflict(msg) { const e = new Error(msg); e.status = 409; return e; }

const VALID_STATUSES = ["pending", "assigned", "in_progress", "completed", "verified", "closed", "rejected", "duplicate"];
const VALID_PRIORITIES = ["low", "medium", "high", "critical"];

export async function getDashboard(ward_id, municipality_id) {
  const [wardRes, statsRes, workersRes, recentRes] = await Promise.all([
    pool.query(
      `SELECT w.ward_no, w.ward_name, z.zone_name
       FROM wards w LEFT JOIN zones z ON z.id = w.zone_id
       WHERE w.id = $1`, [ward_id]
    ),
    pool.query(
      `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE status = 'pending') AS pending,
         COUNT(*) FILTER (WHERE status = 'assigned') AS assigned,
         COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
         COUNT(*) FILTER (WHERE status = 'completed') AS completed,
         COUNT(*) FILTER (WHERE status = 'rejected') AS rejected
       FROM complaints WHERE ward_id = $1 OR (ward_id IS NULL AND municipality_id = $2)`, [ward_id, municipality_id]
    ),
    pool.query(
      `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE availability = 'available') AS available,
         COUNT(*) FILTER (WHERE availability = 'busy') AS busy
       FROM workers WHERE ward_id = $1`, [ward_id]
    ),
    pool.query(
      `SELECT id, complaint_no, title, status, priority, created_at
       FROM complaints WHERE ward_id = $1 OR (ward_id IS NULL AND municipality_id = $2)
       ORDER BY created_at DESC LIMIT 5`, [ward_id, municipality_id]
    ),
  ]);

  return {
    ward: wardRes.rows[0] || {},
    complaints: statsRes.rows[0],
    workers: workersRes.rows[0],
    recent: recentRes.rows,
  };
}

export async function getComplaints(ward_id, municipality_id, { status, priority, search, page = 1, limit = 20 }) {
  const offset = (page - 1) * limit;
  let where = "WHERE (c.ward_id = $1 OR (c.ward_id IS NULL AND c.municipality_id = $2))";
  const params = [ward_id, municipality_id];
  let idx = 3;

  if (status && VALID_STATUSES.includes(status)) {
    where += ` AND c.status = $${idx}`;
    params.push(status);
    idx++;
  }
  if (priority && VALID_PRIORITIES.includes(priority)) {
    where += ` AND c.priority = $${idx}`;
    params.push(priority);
    idx++;
  }
  if (search) {
    where += ` AND (c.title ILIKE $${idx} OR c.complaint_no ILIKE $${idx})`;
    params.push(`%${search}%`);
    idx++;
  }

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM complaints c ${where}`, params
  );

  const result = await pool.query(
    `SELECT c.id, c.complaint_no, c.title, c.description, c.status, c.priority,
            c.ai_category, c.latitude, c.longitude, c.created_at, c.updated_at,
            p.full_name AS citizen_name, p.email AS citizen_email,
            pw.full_name AS worker_name,
            d.name AS department_name
     FROM complaints c
     LEFT JOIN profiles p ON p.id = c.citizen_id
     LEFT JOIN complaint_assignments ca ON ca.complaint_id = c.id AND ca.status IN ('assigned','accepted','in_progress')
     LEFT JOIN workers wk ON wk.id = ca.worker_id
     LEFT JOIN profiles pw ON pw.id = wk.profile_id
     LEFT JOIN departments d ON d.id = wk.department_id
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

export async function getComplaintById(ward_id, municipality_id, complaintId) {
  const complaint = await pool.query(
    `SELECT c.*, p.full_name AS citizen_name, p.email AS citizen_email, p.phone AS citizen_phone
     FROM complaints c
     LEFT JOIN profiles p ON p.id = c.citizen_id
     WHERE c.id = $1 AND (c.ward_id = $2 OR (c.ward_id IS NULL AND c.municipality_id = $3))`, [complaintId, ward_id, municipality_id]
  );
  if (!complaint.rows[0]) throw notFound("Complaint not found");

  const [images, assignments, timeline, classifications, feedback] = await Promise.all([
    pool.query(`SELECT * FROM complaint_images WHERE complaint_id = $1 ORDER BY created_at`, [complaintId]),
    pool.query(
      `SELECT ca.*, pw.full_name AS worker_name
       FROM complaint_assignments ca
       LEFT JOIN workers wk ON wk.id = ca.worker_id
       LEFT JOIN profiles pw ON pw.id = wk.profile_id
       WHERE ca.complaint_id = $1 ORDER BY ca.assigned_at`, [complaintId]
    ),
    pool.query(
      `SELECT ct.*, pw.full_name AS changed_by_name
       FROM complaint_timeline ct
       LEFT JOIN profiles pw ON pw.id = ct.changed_by
       WHERE ct.complaint_id = $1 ORDER BY ct.created_at`, [complaintId]
    ),
    pool.query(`SELECT * FROM ai_classifications WHERE complaint_id = $1`, [complaintId]),
    pool.query(`SELECT * FROM citizen_feedback WHERE complaint_id = $1`, [complaintId]),
  ]);

  return {
    ...complaint.rows[0],
    images: images.rows,
    assignments: assignments.rows,
    timeline: timeline.rows,
    classifications: classifications.rows,
    feedback: feedback.rows[0] || null,
  };
}

export async function assignComplaint(ward_id, municipality_id, complaintId, { worker_id, remarks }) {
  const complaint = await pool.query(
    `SELECT * FROM complaints WHERE id = $1 AND (ward_id = $2 OR (ward_id IS NULL AND municipality_id = $3))`, [complaintId, ward_id, municipality_id]
  );
  if (!complaint.rows[0]) throw notFound("Complaint not found");

  const worker = await pool.query(
    `SELECT * FROM workers WHERE id = $1 AND municipality_id = $2`,
    [worker_id, complaint.rows[0].municipality_id]
  );
  if (!worker.rows[0]) throw notFound("Worker not found");

  // Auto-set ward_id if it was NULL
  const workerWardId = worker.rows[0]?.ward_id;
  if (!complaint.rows[0].ward_id && workerWardId) {
    await pool.query(`UPDATE complaints SET ward_id = $1 WHERE id = $2`, [workerWardId, complaintId]);
  }

  await pool.query(
    `INSERT INTO complaint_assignments (complaint_id, worker_id, status)
     VALUES ($1, $2, 'assigned')`, [complaintId, worker_id]
  );

  await pool.query(
    `UPDATE complaints SET status = 'assigned', updated_at = NOW() WHERE id = $1`, [complaintId]
  );

  await pool.query(
    `UPDATE workers SET current_workload = current_workload + 1 WHERE id = $1`, [worker_id]
  );

  await pool.query(
    `INSERT INTO complaint_timeline (complaint_id, status, remarks, changed_by)
     VALUES ($1, 'assigned', $2, $3)`,
    [complaintId, remarks || `Assigned to worker`, null]
  );

  // Notify the assigned worker
  try {
    const workerProfile = await pool.query(
      `SELECT w.profile_id FROM workers w WHERE w.id = $1`, [worker_id]
    );
    const complaint = complaint.rows[0];
    if (workerProfile.rows[0]?.profile_id) {
      await createNotification({
        user_id: workerProfile.rows[0].profile_id,
        municipality_id,
        title: "Complaint Assigned",
        message: `You have been assigned complaint "${complaint.title}".`,
        type: "complaint_assigned",
        priority: complaint.priority || "medium",
        related_complaint: complaintId,
      });
    }
    // Notify the citizen
    if (complaint.citizen_id) {
      await createNotification({
        user_id: complaint.citizen_id,
        municipality_id,
        title: "Complaint Assigned",
        message: `Your complaint "${complaint.title}" has been assigned to a worker.`,
        type: "complaint_assigned",
        priority: complaint.priority || "medium",
        related_complaint: complaintId,
      });
    }
  } catch (err) {
    console.error("Failed to create assignment notification:", err.message);
  }

  return { success: true };
}

export async function updateStatus(ward_id, municipality_id, complaintId, { status, remarks }) {
  if (!status || !VALID_STATUSES.includes(status)) throw badRequest("Invalid status value");

  const complaint = await pool.query(
    `SELECT * FROM complaints WHERE id = $1 AND (ward_id = $2 OR (ward_id IS NULL AND municipality_id = $3))`, [complaintId, ward_id, municipality_id]
  );
  if (!complaint.rows[0]) throw notFound("Complaint not found");

  await pool.query(
    `UPDATE complaints SET status = $1, updated_at = NOW() WHERE id = $2`,
    [status, complaintId]
  );

  await pool.query(
    `INSERT INTO complaint_timeline (complaint_id, status, remarks, changed_by)
     VALUES ($1, $2, $3, $4)`,
    [complaintId, status, remarks || null, null]
  );

  if (status === "rejected" || status === "closed") {
    const assignment = await pool.query(
      `SELECT worker_id FROM complaint_assignments
       WHERE complaint_id = $1 AND status IN ('assigned','accepted','in_progress')
       ORDER BY assigned_at DESC LIMIT 1`, [complaintId]
    );
    if (assignment.rows[0]) {
      await pool.query(
        `UPDATE workers SET current_workload = GREATEST(current_workload - 1, 0)
         WHERE id = $1`, [assignment.rows[0].worker_id]
      );
    }
  }

  // Notify citizen about status change
  try {
    const c = complaint.rows[0];
    if (c.citizen_id) {
      const statusMessages = {
        resolved: "has been resolved",
        completed: "has been completed",
        rejected: "has been rejected",
        closed: "has been closed",
        in_progress: "is now in progress",
      };
      const notifType = status === "rejected" ? "complaint_rejected" :
                        status === "completed" || status === "resolved" || status === "closed" ? "complaint_resolved" :
                        "complaint_updated";
      const notifPriority = status === "rejected" ? "high" :
                            status === "completed" || status === "resolved" ? "low" :
                            "medium";
      await createNotification({
        user_id: c.citizen_id,
        municipality_id,
        title: `Complaint ${status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ")}`,
        message: `Your complaint "${c.title}" ${statusMessages[status] || "has been updated"}.`,
        type: notifType,
        priority: notifPriority,
        related_complaint: complaintId,
      });
    }
  } catch (err) {
    console.error("Failed to create status notification:", err.message);
  }

  return { success: true };
}

export async function getWorkers(ward_id) {
  const result = await pool.query(
    `SELECT w.id, w.availability, w.current_workload, w.rating,
            p.full_name, p.email, p.phone, p.avatar_url,
            d.name AS department_name,
            (SELECT COUNT(*) FROM complaint_assignments ca
             JOIN complaints c ON c.id = ca.complaint_id
             WHERE ca.worker_id = w.id AND ca.status = 'completed') AS completed_count
     FROM workers w
     JOIN profiles p ON p.id = w.profile_id
     LEFT JOIN departments d ON d.id = w.department_id
     WHERE w.ward_id = $1
     ORDER BY p.full_name`, [ward_id]
  );
  return result.rows;
}

export async function createWorker(ward_id, municipality_id, { email, full_name, phone, department_id }) {
  if (!email || !full_name) throw badRequest("email and full_name are required");

  // Check if profile already exists
  const existing = await pool.query(`SELECT id FROM profiles WHERE email = $1`, [email]);
  let profileId;

  if (existing.rows[0]) {
    // Check if already a worker
    const isWorker = await pool.query(`SELECT id FROM workers WHERE profile_id = $1`, [existing.rows[0].id]);
    if (isWorker.rows[0]) throw conflict("This user is already a worker");
    profileId = existing.rows[0].id;
    // Update role to worker
    await pool.query(`UPDATE profiles SET role = 'worker', municipality_id = $2 WHERE id = $1 AND (role = 'citizen' OR role IS NULL)`, [profileId, municipality_id]);
  } else {
    // Create new profile
    const bcrypt = await import("bcrypt");
    const tempPassword = await bcrypt.default.hash("Worker@123", 10);
    const newProfile = await pool.query(
      `INSERT INTO profiles (full_name, email, phone, role, municipality_id, password_hash, is_verified)
       VALUES ($1, $2, $3, 'worker', $4, $5, true) RETURNING id`,
      [full_name, email, phone || null, municipality_id, tempPassword]
    );
    profileId = newProfile.rows[0].id;
  }

  // Create worker record
  const worker = await pool.query(
    `INSERT INTO workers (profile_id, municipality_id, ward_id, department_id, availability)
     VALUES ($1, $2, $3, $4, 'available') RETURNING id`,
    [profileId, municipality_id, ward_id, department_id || null]
  );

  return { id: worker.rows[0].id, profile_id: profileId, email, full_name };
}
