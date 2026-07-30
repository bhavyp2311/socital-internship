import pool from "../db.js";

export async function createNotification({
  user_id,
  municipality_id,
  title,
  message,
  type,
  related_complaint,
}) {
  const result = await pool.query(
    `INSERT INTO notifications (user_id, municipality_id, title, message, type, related_complaint)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [user_id, municipality_id, title, message, type, related_complaint || null]
  );
  return result.rows[0];
}

export async function getNotifications(user_id, { is_read, page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;
  let where = "WHERE user_id = $1";
  const params = [user_id];
  let idx = 2;

  if (is_read === "true" || is_read === "false") {
    where += ` AND is_read = $${idx}`;
    params.push(is_read === "true");
    idx++;
  }

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM notifications ${where}`,
    params
  );

  const result = await pool.query(
    `SELECT * FROM notifications ${where}
     ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, limit, offset]
  );

  const unreadResult = await pool.query(
    `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false`,
    [user_id]
  );

  return {
    notifications: result.rows,
    total: parseInt(countResult.rows[0].count),
    unread_count: parseInt(unreadResult.rows[0].count),
    page,
    limit,
  };
}

export async function markRead(id, user_id) {
  const result = await pool.query(
    `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING id`,
    [id, user_id]
  );
  return result.rows[0];
}

export async function markAllRead(user_id) {
  await pool.query(
    `UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false`,
    [user_id]
  );
}
