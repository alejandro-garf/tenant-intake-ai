#!/usr/bin/env node
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { getClient, closePool } from "./connection.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MIGRATIONS_DIR = join(__dirname, "migrations");

interface Migration {
  name: string;
  path: string;
}

async function getMigrations(): Promise<Migration[]> {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort(); // Numbered migrations sort naturally

  return files.map((name) => ({
    name,
    path: join(MIGRATIONS_DIR, name),
  }));
}

async function getExecutedMigrations(
  client: any
): Promise<Set<string>> {
  // Ensure migrations table exists first
  await client.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const result = await client.query("SELECT name FROM migrations");
  return new Set(result.rows.map((r: { name: string }) => r.name));
}

async function runMigration(client: any, migration: Migration): Promise<void> {
  console.log(`Running migration: ${migration.name}`);
  const sql = readFileSync(migration.path, "utf-8");

  await client.query("BEGIN");
  try {
    await client.query(sql);
    await client.query("INSERT INTO migrations (name) VALUES ($1)", [
      migration.name,
    ]);
    await client.query("COMMIT");
    console.log(`✓ ${migration.name} completed`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

async function migrate() {
  const client = await getClient();

  try {
    const allMigrations = await getMigrations();
    const executed = await getExecutedMigrations(client);

    const pending = allMigrations.filter((m) => !executed.has(m.name));

    if (pending.length === 0) {
      console.log("No pending migrations.");
      return;
    }

    console.log(`Found ${pending.length} pending migration(s):\n`);

    for (const migration of pending) {
      await runMigration(client, migration);
    }

    console.log(`\n✓ All migrations completed successfully.`);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    client.release();
    await closePool();
  }
}

// Run migrations if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrate();
}

export { migrate };
