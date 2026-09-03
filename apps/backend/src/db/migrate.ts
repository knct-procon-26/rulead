import { migrate } from "drizzle-orm/node-postgres/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

async function runMigrations() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  const db = drizzle(pool);

  console.log("[migrate] migrations...");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("[migrate] done");

  await pool.end();
}

runMigrations().catch((err) => {
  console.error("[migrate] failed", err);
  process.exit(1);
});
