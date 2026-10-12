#!/usr/bin/env node
import { query, closePool } from "./connection.js";

async function fix() {
  try {
    // Drop the partial table and migration record
    await query("DROP TABLE IF EXISTS rule_versions CASCADE");
    await query("DELETE FROM migrations WHERE name = '003_create_rule_versions.sql'");
    console.log("✓ Cleaned up partial migration");
  } catch (error) {
    console.error("Fix failed:", error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

fix();
