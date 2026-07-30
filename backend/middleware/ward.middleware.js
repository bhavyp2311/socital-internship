import pool from "../db.js";

export async function attachWard(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT ward_id FROM ward_admins WHERE profile_id = $1 LIMIT 1`,
      [req.user.sub]
    );
    const ward_id = result.rows[0]?.ward_id;
    if (!ward_id) {
      return res.status(403).json({ success: false, message: "No ward assigned to your account" });
    }
    req.ward_id = ward_id;
    next();
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to resolve ward" });
  }
}
