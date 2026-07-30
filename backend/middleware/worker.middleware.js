import pool from "../db.js";

export async function attachWorker(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT id, ward_id, department_id, municipality_id, availability, current_workload, rating
       FROM workers WHERE profile_id = $1`,
      [req.user.sub]
    );
    const worker = result.rows[0];
    if (!worker) {
      return res.status(403).json({ success: false, message: "Worker profile not found" });
    }
    req.worker = worker;
    next();
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to resolve worker profile" });
  }
}
