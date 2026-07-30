/**
 * db.js - PostgreSQL connection pool, using Supabase's connection pooler.
 *
 * Get this URL from: Supabase Dashboard -> Project Settings -> Database -> Connection Pooling
 * Use the "Transaction" mode URL (port 6543) for most backend use cases.
 */

import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "Missing DATABASE_URL. Copy .env.example to .env and set it to your Supabase connection pooler URL."
  );
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // required for Supabase's pooler
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle DB client", err);
});

export default pool;