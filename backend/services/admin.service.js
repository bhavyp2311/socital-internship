/**
 * services/admin.service.js
 * All admin-level business logic and DB queries.
 * Accessible by: super_admin, admin (with scope restrictions)
 */

import pool from "../db.js";

//  HELPERS

function notFound(msg) { const e = new Error(msg); e.status = 404; return e; }
function badRequest(msg) { const e = new Error(msg); e.status = 400; return e; }
function forbidden(msg) { const e = new Error(msg); e.status = 403; return e; }

// MUNICIPALITIES 

export async function getMunicipalities() {
  const result = await pool.query(
    `SELECT m.*, 
       (SELECT COUNT(*) FROM profiles p WHERE p.municipality_id = m.id) AS total_users,
       (SELECT COUNT(*) FROM complaints c WHERE c.municipality_id = m.id) AS total_complaints
     FROM municipalities m
     ORDER BY m.created_at DESC`
  );
  return result.rows;
}

export async function getMunicipalityById(id) {
  const result = await pool.query(`SELECT * FROM municipalities WHERE id = $1`, [id]);
  if (!result.rows[0]) throw notFound("Municipality not found");
  return result.rows[0];
}

export async function createMunicipality({ name, city, state, logo_url }) {
  if (!name) throw badRequest("name is is required");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const result = await client.query(
      `INSERT INTO municipalities (name, city, state, logo_url)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, city || null, state || null, logo_url || null]
    );
    const municipality = result.rows[0];

    // Auto-create 2 zones
    const zoneA = await client.query(
      `INSERT INTO zones (municipality_id, zone_name) VALUES ($1, 'Zone A') RETURNING id`,
      [municipality.id]
    );
    const zoneB = await client.query(
      `INSERT INTO zones (municipality_id, zone_name) VALUES ($1, 'Zone B') RETURNING id`,
      [municipality.id]
    );

    // Auto-create 2 wards per zone (4 total)
    await client.query(
      `INSERT INTO wards (municipality_id, zone_id, ward_no, ward_name) VALUES
       ($1, $2, 1, 'Ward 1'),
       ($1, $2, 2, 'Ward 2')`,
      [municipality.id, zoneA.rows[0].id]
    );
    await client.query(
      `INSERT INTO wards (municipality_id, zone_id, ward_no, ward_name) VALUES
       ($1, $2, 3, 'Ward 3'),
       ($1, $2, 4, 'Ward 4')`,
      [municipality.id, zoneB.rows[0].id]
    );

    await client.query("COMMIT");
    return municipality;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function updateMunicipality(id, { name, city, state, logo_url, status }) {
  const result = await pool.query(
    `UPDATE municipalities SET
       name      = COALESCE($1, name),
       city      = COALESCE($2, city),
       state     = COALESCE($3, state),
       logo_url  = COALESCE($4, logo_url),
       status    = COALESCE($5, status)
     WHERE id = $6 RETURNING *`,
    [name, city, state, logo_url, status, id]
  );
  if (!result.rows[0]) throw notFound("Municipality not found");
  return result.rows[0];
}

export async function deleteMunicipality(id) {
  const result = await pool.query(`DELETE FROM municipalities WHERE id = $1 RETURNING id`, [id]);
  if (!result.rows[0]) throw notFound("Municipality not found");
}

// SUBSCRIPTIONS 

export async function getSubscription(municipality_id) {
  const result = await pool.query(
    `SELECT * FROM subscriptions WHERE municipality_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [municipality_id]
  );
  if (!result.rows[0]) throw notFound("No subscription found for this municipality");
  return result.rows[0];
}

export async function upsertSubscription(municipality_id, { plan_name, status, max_workers, max_wards, expires_at }) {
  const result = await pool.query(
    `INSERT INTO subscriptions (municipality_id, plan_name, status, max_workers, max_wards, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (municipality_id) DO UPDATE SET
       plan_name   = EXCLUDED.plan_name,
       status      = EXCLUDED.status,
       max_workers = EXCLUDED.max_workers,
       max_wards   = EXCLUDED.max_wards,
       expires_at  = EXCLUDED.expires_at
     RETURNING *`,
    [municipality_id, plan_name, status || "active", max_workers || 50, max_wards || 20, expires_at || null]
  );
  return result.rows[0];
}

// ZONES

export async function getZones(municipality_id) {
  const result = await pool.query(
    `SELECT z.*, COUNT(w.id) AS ward_count
     FROM zones z
     LEFT JOIN wards w ON w.zone_id = z.id
     WHERE z.municipality_id = $1
     GROUP BY z.id
     ORDER BY z.created_at DESC`,
    [municipality_id]
  );
  return result.rows;
}

export async function createZone(municipality_id, { zone_name }) {
  if (!zone_name) throw badRequest("zone_name is required");
  const result = await pool.query(
    `INSERT INTO zones (municipality_id, zone_name) VALUES ($1, $2) RETURNING *`,
    [municipality_id, zone_name]
  );
  return result.rows[0];
}

export async function updateZone(id, municipality_id, { zone_name }) {
  const result = await pool.query(
    `UPDATE zones SET zone_name = COALESCE($1, zone_name)
     WHERE id = $2 AND municipality_id = $3 RETURNING *`,
    [zone_name, id, municipality_id]
  );
  if (!result.rows[0]) throw notFound("Zone not found");
  return result.rows[0];
}

export async function deleteZone(id, municipality_id) {
  const result = await pool.query(
    `DELETE FROM zones WHERE id = $1 AND municipality_id = $2 RETURNING id`,
    [id, municipality_id]
  );
  if (!result.rows[0]) throw notFound("Zone not found");
}

// WARDS

export async function getWards(municipality_id) {
  const result = await pool.query(
    `SELECT w.*, z.zone_name,
       COUNT(DISTINCT wa.id) AS admin_count,
       COUNT(DISTINCT wk.id) AS worker_count
     FROM wards w
     LEFT JOIN zones z ON z.id = w.zone_id
     LEFT JOIN ward_admins wa ON wa.ward_id = w.id
     LEFT JOIN workers wk ON wk.ward_id = w.id
     WHERE w.municipality_id = $1
     GROUP BY w.id, z.zone_name
     ORDER BY w.ward_no ASC`,
    [municipality_id]
  );
  return result.rows;
}

export async function createWard(municipality_id, { ward_no, ward_name, zone_id }) {
  if (!ward_name) throw badRequest("ward_name is required");
  const result = await pool.query(
    `INSERT INTO wards (municipality_id, zone_id, ward_no, ward_name)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [municipality_id, zone_id || null, ward_no || null, ward_name]
  );
  return result.rows[0];
}

export async function updateWard(id, municipality_id, { ward_no, ward_name, zone_id }) {
  const result = await pool.query(
    `UPDATE wards SET
       ward_no   = COALESCE($1, ward_no),
       ward_name = COALESCE($2, ward_name),
       zone_id   = COALESCE($3, zone_id)
     WHERE id = $4 AND municipality_id = $5 RETURNING *`,
    [ward_no, ward_name, zone_id, id, municipality_id]
  );
  if (!result.rows[0]) throw notFound("Ward not found");
  return result.rows[0];
}

export async function deleteWard(id, municipality_id) {
  const result = await pool.query(
    `DELETE FROM wards WHERE id = $1 AND municipality_id = $2 RETURNING id`,
    [id, municipality_id]
  );
  if (!result.rows[0]) throw notFound("Ward not found");
}

//DEPARTMENTS

export async function getDepartments(municipality_id) {
  const result = await pool.query(
    `SELECT d.*, COUNT(w.id) AS worker_count
     FROM departments d
     LEFT JOIN workers w ON w.department_id = d.id
     WHERE d.municipality_id = $1
     GROUP BY d.id
     ORDER BY d.created_at DESC`,
    [municipality_id]
  );
  return result.rows;
}

export async function createDepartment(municipality_id, { name, description }) {
  if (!name) throw badRequest("name is required");
  const result = await pool.query(
    `INSERT INTO departments (municipality_id, name, description)
     VALUES ($1, $2, $3) RETURNING *`,
    [municipality_id, name, description || null]
  );
  return result.rows[0];
}

export async function updateDepartment(id, municipality_id, { name, description }) {
  const result = await pool.query(
    `UPDATE departments SET
       name        = COALESCE($1, name),
       description = COALESCE($2, description)
     WHERE id = $3 AND municipality_id = $4 RETURNING *`,
    [name, description, id, municipality_id]
  );
  if (!result.rows[0]) throw notFound("Department not found");
  return result.rows[0];
}

export async function deleteDepartment(id, municipality_id) {
  const result = await pool.query(
    `DELETE FROM departments WHERE id = $1 AND municipality_id = $2 RETURNING id`,
    [id, municipality_id]
  );
  if (!result.rows[0]) throw notFound("Department not found");
}

//USERS (admins, area_admins, workers)
export async function getUsers(municipality_id, role) {
  const allowedRoles = ["admin", "area_admin", "worker", "citizen"];
  if (role && !allowedRoles.includes(role)) throw badRequest("Invalid role filter");

  const result = await pool.query(
    `SELECT p.id, p.full_name, p.email, p.phone, p.role,
            p.is_verified, p.is_active, p.avatar_url, p.created_at,
            w.availability, w.current_workload, w.rating,
            wd.ward_name, d.name AS department_name
     FROM profiles p
     LEFT JOIN workers w ON w.profile_id = p.id
     LEFT JOIN wards wd ON wd.id = w.ward_id
     LEFT JOIN departments d ON d.id = w.department_id
     WHERE p.municipality_id = $1
       AND ($2::text IS NULL OR p.role = $2::user_role)
     ORDER BY p.created_at DESC`,
    [municipality_id, role || null]
  );
  return result.rows;
}

export async function getUserById(id, municipality_id) {
  const result = await pool.query(
    `SELECT p.*, w.availability, w.current_workload, w.rating,
            wd.ward_name, d.name AS department_name
     FROM profiles p
     LEFT JOIN workers w ON w.profile_id = p.id
     LEFT JOIN wards wd ON wd.id = w.ward_id
     LEFT JOIN departments d ON d.id = w.department_id
     WHERE p.id = $1 AND p.municipality_id = $2`,
    [id, municipality_id]
  );
  if (!result.rows[0]) throw notFound("User not found");
  return result.rows[0];
}

export async function toggleUserActive(id, municipality_id, is_active) {
  const result = await pool.query(
    `UPDATE profiles SET is_active = $1
     WHERE id = $2 AND municipality_id = $3 RETURNING id, full_name, email, role, is_active`,
    [is_active, id, municipality_id]
  );
  if (!result.rows[0]) throw notFound("User not found");
  return result.rows[0];
}

//DASHBOARD STATS

export async function getDashboardStats(municipality_id) {
  const [complaints, workers, wards, users] = await Promise.all([
    pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'pending')     AS pending,
         COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
         COUNT(*) FILTER (WHERE status = 'completed')   AS completed,
         COUNT(*) FILTER (WHERE status = 'rejected')    AS rejected,
         COUNT(*)                                        AS total
       FROM complaints WHERE municipality_id = $1`,
      [municipality_id]
    ),
    pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE availability = 'available') AS available,
         COUNT(*) FILTER (WHERE availability = 'busy')      AS busy,
         COUNT(*)                                            AS total
       FROM workers WHERE municipality_id = $1`,
      [municipality_id]
    ),
    pool.query(`SELECT COUNT(*) AS total FROM wards WHERE municipality_id = $1`, [municipality_id]),
    pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE role = 'admin')      AS admins,
         COUNT(*) FILTER (WHERE role = 'area_admin') AS area_admins,
         COUNT(*) FILTER (WHERE role = 'worker')     AS workers,
         COUNT(*) FILTER (WHERE role = 'citizen')    AS citizens
       FROM profiles WHERE municipality_id = $1`,
      [municipality_id]
    ),
  ]);

  return {
    complaints: complaints.rows[0],
    workers: workers.rows[0],
    wards: { total: wards.rows[0].total },
    users: users.rows[0],
  };
}