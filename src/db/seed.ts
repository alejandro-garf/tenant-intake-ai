#!/usr/bin/env node
import { query, closePool } from "./connection.js";

async function seed() {
  try {
    console.log("Seeding database...\n");

    // Get or create a property
    // First check if any property exists
    const [existingProperty] = await query<{ id: string }>(
      "SELECT id FROM properties LIMIT 1"
    );

    let propertyId: string;
    if (existingProperty) {
      propertyId = existingProperty.id;
      console.log(`✓ Using existing property (ID: ${propertyId})`);
    } else {
      // Create one if none exist
      const [newProperty] = await query<{ id: string }>(
        `INSERT INTO properties (name) VALUES ($1) RETURNING id`,
        ["Sunrise Apartments"]
      );
      if (!newProperty) {
        throw new Error("Failed to create property");
      }
      propertyId = newProperty.id;
      console.log(`✓ Created property: Sunrise Apartments (ID: ${propertyId})`);
    }

    // Create one active rule version with LIHTC thresholds
    const [ruleVersion] = await query<{ id: number }>(
      `
      INSERT INTO rule_versions (
        property_id,
        version,
        income_cap_annual,
        max_occupancy,
        passbook_rate,
        asset_threshold,
        active,
        effective_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (property_id, version) DO NOTHING
      RETURNING id
    `,
      [
        propertyId,
        1, // version
        50000.0, // income cap: $50k annual
        8, // max occupancy
        0.0006, // passbook rate: 0.06% (CTCAC TIC April 2021, Part IV)
        5000.0, // asset threshold: $5k
        true, // active
        "2026-01-01", // effective date
      ]
    );

    if (ruleVersion) {
      console.log(`✓ Created rule version 1 (ID: ${ruleVersion.id})`);
      console.log(`  - Income cap: $50,000/year`);
      console.log(`  - Max occupancy: 8`);
      console.log(`  - Passbook rate: 0.06%`);
      console.log(`  - Asset threshold: $5,000`);
    } else {
      console.log(`  Rule version already exists`);
    }

    console.log(`\n✓ Seed completed successfully.`);
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

// Run seed if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seed();
}

export { seed };
