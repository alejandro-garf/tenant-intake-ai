#!/usr/bin/env node
import { query, closePool } from "./connection.js";

async function reset() {
  try {
    console.log("Resetting database (dropping all tenant-portal tables)...\n");

    // Drop all tables in reverse order of dependencies
    const tables = [
      "reviewer_decisions",
      "screening_results",
      "extraction_results",
      "documents",
      "assets",
      "income_sources",
      "household_members",
      "applications",
      "rule_versions",
      "demographics",
    ];

    for (const table of tables) {
      await query(`DROP TABLE IF EXISTS ${table} CASCADE`);
      console.log(`✓ Dropped ${table}`);
    }

    // Clear migration records for these tables
    await query(`DELETE FROM migrations WHERE name NOT LIKE '001%' AND name NOT LIKE '002%'`);
    console.log(`\n✓ Cleared migration records (kept properties and migrations table)`);
    console.log(`\nRun 'npm run db:migrate' to recreate tables.`);
  } catch (error) {
    console.error("Reset failed:", error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

reset();
