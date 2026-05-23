import { readFileSync } from "fs";
import { join } from "path";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
});

async function runMigration() {
  const sqlPath = join(process.cwd(), "src/lib/migrations/001_create_missions_table.sql");
  const sql = readFileSync(sqlPath, "utf-8");

  console.log("Running migration: 001_create_missions_table.sql");
  await pool.query(sql);
  console.log("Migration completed successfully.");

  await pool.end();
}

runMigration().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
