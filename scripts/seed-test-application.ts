#!/usr/bin/env node
import { config } from 'dotenv';
config({ path: '.env.local' });

import pg from 'pg';

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
});

async function seedTestApplication() {
  try {
    await client.connect();
    console.log('Seeding test application...\n');

    // Delete any existing test application
    await client.query(`DELETE FROM applications WHERE applicant_email = 'test@example.com'`);
    console.log('✓ Cleared existing test applications\n');

    // Get the property and rule version
    const propertyResult = await client.query('SELECT id FROM properties LIMIT 1');
    if (propertyResult.rows.length === 0) {
      console.error('No property found. Run npm run db:seed first.');
      process.exit(1);
    }
    const propertyId = propertyResult.rows[0]?.id;

    const ruleVersionResult = await client.query('SELECT id FROM rule_versions WHERE active = true LIMIT 1');
    if (ruleVersionResult.rows.length === 0) {
      console.error('No active rule version found. Run npm run db:seed first.');
      process.exit(1);
    }
    const ruleVersionId = ruleVersionResult.rows[0]?.id;

    // Create test application
    const appResult = await client.query(`
      INSERT INTO applications (
        property_id,
        version,
        applicant_email,
        applicant_name,
        status,
        submitted_at
      )
      VALUES ($1, 1, $2, $3, $4, NOW())
      RETURNING id
    `, [propertyId, 'test@example.com', 'Jane Smith', 'submitted']);

    const applicationId = appResult.rows[0]?.id;
    console.log(`✓ Created application ID ${applicationId}`);

    // Create 3 household members
    const member1 = await client.query(`
      INSERT INTO household_members (
        application_id,
        name,
        date_of_birth,
        relationship,
        is_full_time_student
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [applicationId, 'Jane Smith', '1985-03-15', 'applicant', false]);

    const member2 = await client.query(`
      INSERT INTO household_members (
        application_id,
        name,
        date_of_birth,
        relationship,
        is_full_time_student
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [applicationId, 'John Smith', '1983-07-22', 'spouse', false]);

    const member3 = await client.query(`
      INSERT INTO household_members (
        application_id,
        name,
        date_of_birth,
        relationship,
        is_full_time_student
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [applicationId, 'Emma Smith', '2010-11-05', 'child', false]);

    const member1Id = member1.rows[0]?.id;
    const member2Id = member2.rows[0]?.id;
    const member3Id = member3.rows[0]?.id;

    console.log(`✓ Created 3 household members`);

    // Create multiple income sources
    // Member 1: Employment + Social Security
    await client.query(`
      INSERT INTO income_sources (
        household_member_id,
        source_type,
        employer_payer_name,
        amount,
        frequency,
        annual_amount
      )
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [member1Id, 'employment', 'ABC Corp', 3500, 'monthly', 42000]);

    await client.query(`
      INSERT INTO income_sources (
        household_member_id,
        source_type,
        employer_payer_name,
        amount,
        frequency,
        annual_amount
      )
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [member1Id, 'social_security', 'SSA', 500, 'monthly', 6000]);

    // Member 2: Employment
    await client.query(`
      INSERT INTO income_sources (
        household_member_id,
        source_type,
        employer_payer_name,
        amount,
        frequency,
        annual_amount
      )
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [member2Id, 'employment', 'XYZ Inc', 2500, 'monthly', 30000]);

    console.log(`✓ Created 3 income sources (total annual: $78,000)`);

    // Create assets > $5,000
    // Member 1: Savings account $4,000
    await client.query(`
      INSERT INTO assets (
        household_member_id,
        asset_type,
        cash_value,
        annual_income
      )
      VALUES ($1, $2, $3, $4)
    `, [member1Id, 'savings', 4000, 20]);

    // Member 2: Checking account $2,500
    await client.query(`
      INSERT INTO assets (
        household_member_id,
        asset_type,
        cash_value,
        annual_income
      )
      VALUES ($1, $2, $3, $4)
    `, [member2Id, 'checking', 2500, 5]);

    console.log(`✓ Created 2 assets (total cash value: $6,500 > $5,000 threshold)`);

    // Run screening
    const totalIncome = 42000 + 6000 + 30000; // $78,000
    const totalAssetCashValue = 4000 + 2500; // $6,500
    const totalAssetAnnualIncome = 20 + 5; // $25

    // Asset imputation calculation (since $6,500 > $5,000)
    const passbookRate = 0.0006; // 0.06%
    const imputedAssetIncome = totalAssetCashValue * passbookRate; // $3.90
    const totalIncomeFromAssets = Math.max(totalAssetAnnualIncome, imputedAssetIncome); // $25

    const grossIncome = totalIncome + totalIncomeFromAssets; // $78,025

    const passed = grossIncome <= 50000 ? false : true; // Will fail since $78,025 > $50,000 cap
    const failureReasons = grossIncome > 50000
      ? [`Gross income $${grossIncome.toFixed(2)} exceeds cap of $50,000`]
      : [];

    await client.query(`
      INSERT INTO screening_results (
        application_id,
        rule_version_id,
        passed,
        failure_reasons,
        gross_income,
        imputed_asset_income,
        household_size,
        screened_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    `, [
      applicationId,
      ruleVersionId,
      passed,
      JSON.stringify(failureReasons),
      grossIncome,
      imputedAssetIncome,
      3
    ]);

    console.log(`✓ Created screening result (passed: ${passed})`);
    console.log(`  - Gross income: $${grossIncome.toFixed(2)}`);
    console.log(`  - Imputed asset income: $${imputedAssetIncome.toFixed(2)}`);
    console.log(`  - Household size: 3\n`);

    console.log(`✓ Test application created successfully!`);
    console.log(`  Application ID: ${applicationId}`);
    console.log(`  Access at: /review/${applicationId}`);

  } catch (error) {
    console.error('Error seeding test application:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seedTestApplication();
