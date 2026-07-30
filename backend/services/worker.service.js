import pool from "../db.js";
import { createNotification } from "./notifications.service.js";

function notFound(msg) { const e = new Error(msg); e.status = 404; return e; }
function badRequest(msg) { const e = new Error(msg); e.status = 400; return e; }

const VALID_ASSIGNMENT_STATUSES = ["assigned", "accepted", "in_progress", "completed", "reassigned", "cancelled"];
const VALID_AVAILABILITY = ["available", "busy", "off_duty", "on_leave"];

export async function getDashboard(worker) {
  const [infoRes, statsRes, recentRes] = await Promise.all([
    pool.query(
      `SELECT p.full_name, p.email, w.availability, w.current_workload, w.rating
       FROM workers w JOIN profiles p ON p.id = w.profile_id
       WHERE w.id = $1`, [worker.id]
    ),
    pool.query(
      `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE ca.status = 'assigned') AS assigned,
         COUNT(*) FILTER (WHERE ca.status = 'accepted') AS accepted,
         COUNT(*) FILTER (WHERE ca.status = 'in_progress') AS in_progress,
         COUNT(*) FILTER (WHERE ca.status = 'completed' AND ca.completed_at::date = CURRENT_DATE) AS completed_today
       FROM complaint_assignments ca
       WHERE ca.worker_id = $1`, [worker.id]
    ),
    pool.query(
      `SELECT c.id, c.complaint_no, c.title, c.status, c.priority, ca.assigned_at
       FROM complaint_assignments ca
       JOIN complaints c ON c.id = ca.complaint_id
       WHERE ca.worker_id = $1
       ORDER BY ca.assigned_at DESC LIMIT 5`, [worker.id]
    ),
  ]);

  return {
    info: infoRes.rows[0] || {},
    stats: statsRes.rows[0],
    recent: recentRes.rows,
  };
}

export async function getComplaints(workerId, { status, page = 1, limit = 20 }) {
  const offset = (page - 1) * limit;
  let where = "WHERE ca.worker_id = $1";
  const params = [workerId];
  let idx = 2;

  if (status && VALID_ASSIGNMENT_STATUSES.includes(status)) {
    where += ` AND ca.status = $${idx}`;
    params.push(status);
    idx++;
  }

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM complaint_assignments ca ${where}`, params
  );

  const result = await pool.query(
    `SELECT c.id, c.complaint_no, c.title, c.description, c.status, c.priority,
            c.created_at, ca.status AS assignment_status, ca.assigned_at,
            p.full_name AS citizen_name
     FROM complaint_assignments ca
     JOIN complaints c ON c.id = ca.complaint_id
     LEFT JOIN profiles p ON p.id = c.citizen_id
     ${where}
     ORDER BY ca.assigned_at DESC
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

export async function getComplaintById(workerId, complaintId) {
  const assignment = await pool.query(
    `SELECT ca.* FROM complaint_assignments ca
     WHERE ca.complaint_id = $1 AND ca.worker_id = $2`, [complaintId, workerId]
  );
  if (!assignment.rows[0]) throw notFound("Complaint not assigned to you");

  const complaint = await pool.query(
    `SELECT c.*, p.full_name AS citizen_name, p.phone AS citizen_phone
     FROM complaints c
     LEFT JOIN profiles p ON p.id = c.citizen_id
     WHERE c.id = $1`, [complaintId]
  );

  const [images, timeline, aiClass] = await Promise.all([
    pool.query(`SELECT * FROM complaint_images WHERE complaint_id = $1 ORDER BY created_at`, [complaintId]),
    pool.query(
      `SELECT ct.*, pw.full_name AS changed_by_name
       FROM complaint_timeline ct
       LEFT JOIN profiles pw ON pw.id = ct.changed_by
       WHERE ct.complaint_id = $1 ORDER BY ct.created_at`, [complaintId]
    ),
    pool.query(`SELECT * FROM ai_classifications WHERE complaint_id = $1 ORDER BY created_at DESC LIMIT 1`, [complaintId]),
  ]);

  return {
    ...complaint.rows[0],
    assignment: assignment.rows[0],
    images: images.rows,
    timeline: timeline.rows,
    ai_classification: aiClass.rows[0] || null,
  };
}

export async function acceptComplaint(workerId, complaintId) {
  const assignment = await pool.query(
    `SELECT * FROM complaint_assignments
     WHERE complaint_id = $1 AND worker_id = $2 AND status = 'assigned'`,
    [complaintId, workerId]
  );
  if (!assignment.rows[0]) throw notFound("No pending assignment found");

  await pool.query(
    `UPDATE complaint_assignments SET status = 'accepted', accepted_at = NOW()
     WHERE id = $1`, [assignment.rows[0].id]
  );

  await pool.query(
    `UPDATE complaints SET status = 'assigned', updated_at = NOW() WHERE id = $1`, [complaintId]
  );

  await pool.query(
    `INSERT INTO complaint_timeline (complaint_id, status, remarks, changed_by)
     VALUES ($1, 'assigned', 'Complaint accepted by worker', NULL)`,
    [complaintId]
  );

  // Notify citizen
  try {
    const complaint = await pool.query(
      `SELECT citizen_id, municipality_id, title FROM complaints WHERE id = $1`, [complaintId]
    );
    if (complaint.rows[0]?.citizen_id) {
      const c = complaint.rows[0];
      await createNotification({
        user_id: c.citizen_id,
        municipality_id: c.municipality_id,
        title: "Complaint Accepted",
        message: `Your complaint "${c.title}" has been accepted by a worker.`,
        type: "complaint_updated",
        priority: "medium",
        related_complaint: complaintId,
      });
    }
  } catch (err) {
    console.error("Failed to create notification:", err.message);
  }

  return { success: true };
}

export async function startComplaint(workerId, complaintId) {
  const assignment = await pool.query(
    `SELECT * FROM complaint_assignments
     WHERE complaint_id = $1 AND worker_id = $2 AND status = 'accepted'`,
    [complaintId, workerId]
  );
  if (!assignment.rows[0]) throw notFound("No accepted assignment found");

  await pool.query(
    `UPDATE complaint_assignments SET status = 'in_progress'
     WHERE id = $1`, [assignment.rows[0].id]
  );

  await pool.query(
    `UPDATE complaints SET status = 'in_progress', updated_at = NOW() WHERE id = $1`, [complaintId]
  );

  await pool.query(
    `INSERT INTO complaint_timeline (complaint_id, status, remarks, changed_by)
     VALUES ($1, 'in_progress', 'Worker started working on complaint', NULL)`,
    [complaintId]
  );

  // Notify citizen
  try {
    const complaint = await pool.query(
      `SELECT citizen_id, municipality_id, title FROM complaints WHERE id = $1`, [complaintId]
    );
    if (complaint.rows[0]?.citizen_id) {
      const c = complaint.rows[0];
      await createNotification({
        user_id: c.citizen_id,
        municipality_id: c.municipality_id,
        title: "Complaint In Progress",
        message: `Your complaint "${c.title}" is now being worked on.`,
        type: "complaint_updated",
        priority: "medium",
        related_complaint: complaintId,
      });
    }
  } catch (err) {
    console.error("Failed to create notification:", err.message);
  }

  return { success: true };
}

export async function completeComplaint(workerId, complaintId, { remarks }) {
  const assignment = await pool.query(
    `SELECT * FROM complaint_assignments
     WHERE complaint_id = $1 AND worker_id = $2 AND status = 'in_progress'`,
    [complaintId, workerId]
  );
  if (!assignment.rows[0]) throw notFound("No in-progress assignment found");

  await pool.query(
    `UPDATE complaint_assignments SET status = 'completed', completed_at = NOW()
     WHERE id = $1`, [assignment.rows[0].id]
  );

  await pool.query(
    `UPDATE complaints SET status = 'completed', updated_at = NOW() WHERE id = $1`, [complaintId]
  );

  await pool.query(
    `UPDATE workers SET current_workload = GREATEST(current_workload - 1, 0)
     WHERE id = $1`, [workerId]
  );

  await pool.query(
    `INSERT INTO complaint_timeline (complaint_id, status, remarks, changed_by)
     VALUES ($1, 'completed', $2, NULL)`,
    [complaintId, remarks || "Complaint resolved by worker"]
  );

  // Notify citizen
  try {
    const complaint = await pool.query(
      `SELECT citizen_id, municipality_id, title FROM complaints WHERE id = $1`, [complaintId]
    );
    if (complaint.rows[0]?.citizen_id) {
      const c = complaint.rows[0];
      await createNotification({
        user_id: c.citizen_id,
        municipality_id: c.municipality_id,
        title: "Complaint Resolved",
        message: `Your complaint "${c.title}" has been resolved. Please verify and leave feedback.`,
        type: "complaint_resolved",
        priority: "low",
        related_complaint: complaintId,
      });
    }

    // Notify area admins
    const wardRes = await pool.query(
      `SELECT ward_id FROM complaints WHERE id = $1`, [complaintId]
    );
    if (wardRes.rows[0]?.ward_id) {
      const areaAdmins = await pool.query(
        `SELECT profile_id FROM ward_admins WHERE ward_id = $1`, [wardRes.rows[0].ward_id]
      );
      for (const admin of areaAdmins.rows) {
        await createNotification({
          user_id: admin.profile_id,
          municipality_id: complaint.rows[0].municipality_id,
          title: "Complaint Completed",
          message: `Complaint "${complaint.rows[0].title}" has been completed by a worker.`,
          type: "complaint_resolved",
          priority: "low",
          related_complaint: complaintId,
        });
      }
    }
  } catch (err) {
    console.error("Failed to create notification:", err.message);
  }

  return { success: true };
}

export async function setAvailability(workerId, availability) {
  if (!availability || !VALID_AVAILABILITY.includes(availability)) {
    throw badRequest("Invalid availability status");
  }

  await pool.query(
    `UPDATE workers SET availability = $1 WHERE id = $2`,
    [availability, workerId]
  );

  return { availability };
}
