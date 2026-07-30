/**
 * middleware/municipality.middleware.js
 * Attaches req.municipality_id from the logged-in user's profile.
 * Use AFTER requireAuth on any route that needs municipality scoping.
 */

import pool from "../db.js";

export async function attachMunicipality(req, res, next) {
  try {
    const result = await pool.query(
      "SELECT municipality_id FROM profiles WHERE id = $1",
      [req.user.sub]
    );
    const municipality_id = result.rows[0]?.municipality_id;
    if (!municipality_id) {
      return res.status(403).json({
        success: false,
        message: "Your account is not linked to any municipality",
      });
    }
    req.municipality_id = municipality_id;
    next();
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to resolve municipality" });
  }
}