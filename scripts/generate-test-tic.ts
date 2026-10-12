#!/usr/bin/env node
import { config } from 'dotenv';
config({ path: '.env.local' });

import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { adaptApplicationToTIC, type DBApplicationData } from '../src/tic/adapter.js';
import { fillTIC } from '../src/tic/fill.js';

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
});

async function generateTestTIC() {
  try {
    await client.connect();
    console.log('Generating TIC PDF for test application...\n');

    const applicationId = 99;

    // Fetch application
    const appResult = await client.query(`
      SELECT id, version, submitted_at, status
      FROM applications
      WHERE id = $1
    `, [applicationId]);

    if (appResult.rows.length === 0) {
      console.error('Application not found');
      process.exit(1);
    }

    const application = appResult.rows[0];
    console.log(`Found application ID ${application.id}, version ${application.version}`);

    // Fetch household members
    const householdMembers = await client.query(`
      SELECT id, name, date_of_birth, relationship, is_full_time_student, ssn_last_4, student_exemption_type
      FROM household_members
      WHERE application_id = $1
      ORDER BY
        CASE relationship
          WHEN 'applicant' THEN 1
          WHEN 'spouse' THEN 2
          ELSE 3
        END,
        name
    `, [applicationId]);

    console.log(`Found ${householdMembers.rows.length} household members`);

    // Fetch income sources
    const incomeSources = await client.query(`
      SELECT
        is_table.id,
        is_table.household_member_id,
        is_table.source_type,
        is_table.amount,
        is_table.frequency,
        is_table.annual_amount
      FROM income_sources is_table
      JOIN household_members hm ON hm.id = is_table.household_member_id
      WHERE hm.application_id = $1
      ORDER BY is_table.id
    `, [applicationId]);

    console.log(`Found ${incomeSources.rows.length} income sources`);

    // Fetch assets
    const assets = await client.query(`
      SELECT
        a.id,
        a.household_member_id,
        a.asset_type,
        a.cash_value,
        a.annual_income
      FROM assets a
      JOIN household_members hm ON hm.id = a.household_member_id
      WHERE hm.application_id = $1
      ORDER BY a.id
    `, [applicationId]);

    console.log(`Found ${assets.rows.length} assets`);

    // Fetch screening result
    const screeningResult = await client.query(`
      SELECT passed, failure_reasons, gross_income, imputed_asset_income, household_size, screened_at
      FROM screening_results
      WHERE application_id = $1
    `, [applicationId]);

    if (screeningResult.rows.length === 0) {
      console.error('Screening result not found');
      process.exit(1);
    }

    const screening = screeningResult.rows[0];
    console.log(`Found screening result: gross income $${screening.gross_income}`);

    // Fetch rule version
    const ruleVersionResult = await client.query(`
      SELECT rv.income_cap_annual, rv.max_occupancy, rv.passbook_rate, rv.asset_threshold
      FROM rule_versions rv
      JOIN screening_results sr ON sr.rule_version_id = rv.id
      WHERE sr.application_id = $1
    `, [applicationId]);

    if (ruleVersionResult.rows.length === 0) {
      console.error('Rule version not found');
      process.exit(1);
    }

    const ruleVersion = ruleVersionResult.rows[0];

    // Build DBApplicationData
    const dbData: DBApplicationData = {
      applicationId: application.id,
      applicationVersion: application.version,
      submittedAt: application.submitted_at ? new Date(application.submitted_at) : null,
      householdMembers: householdMembers.rows.map((m: any) => ({
        id: m.id,
        name: m.name,
        date_of_birth: m.date_of_birth,
        relationship: m.relationship,
        is_full_time_student: m.is_full_time_student,
        ssn_last_4: m.ssn_last_4,
        student_exemption_type: m.student_exemption_type,
      })),
      incomeSources: incomeSources.rows.map((s: any) => ({
        id: s.id,
        household_member_id: s.household_member_id,
        source_type: s.source_type,
        amount: parseFloat(s.amount),
        frequency: s.frequency,
        annual_amount: parseFloat(s.annual_amount),
      })),
      assets: assets.rows.map((a: any) => ({
        id: a.id,
        household_member_id: a.household_member_id,
        asset_type: a.asset_type,
        cash_value: parseFloat(a.cash_value),
        annual_income: parseFloat(a.annual_income),
      })),
      screeningResult: {
        passed: screening.passed,
        failure_reasons: (() => {
          if (!screening.failure_reasons) return null;
          try {
            return JSON.parse(screening.failure_reasons);
          } catch {
            // If it's already a string, wrap it in an array
            return [screening.failure_reasons];
          }
        })(),
        gross_income: parseFloat(screening.gross_income),
        imputed_asset_income: screening.imputed_asset_income
          ? parseFloat(screening.imputed_asset_income)
          : null,
        household_size: screening.household_size,
        created_at: new Date(screening.screened_at),
      },
      ruleVersion: {
        income_cap_annual: parseFloat(ruleVersion.income_cap_annual),
        max_occupancy: ruleVersion.max_occupancy,
        asset_imputation_threshold: parseFloat(ruleVersion.asset_threshold),
        passbook_rate: parseFloat(ruleVersion.passbook_rate),
      },
    };

    console.log('\nAdapting application data to TIC format...');
    const ticInput = adaptApplicationToTIC(dbData);

    console.log('Generating filled PDF...\n');
    const ticResult = await fillTIC(ticInput);

    // Save to disk
    const outputPath = path.join(process.cwd(), 'assets', `TIC-Application-${applicationId}-v${application.version}.pdf`);
    fs.writeFileSync(outputPath, ticResult.pdfBytes);

    console.log(`✓ PDF generated successfully!`);
    console.log(`  Path: ${outputPath}`);
    console.log(`  Size: ${(ticResult.pdfBytes.length / 1024).toFixed(2)} KB`);

    if (ticResult.overflow.hasOverflow) {
      console.log(`\n⚠ Overflow warning:`);
      console.log(`  ${ticResult.overflow.message}`);
    }

    // Extract and display field values for fill_122 through fill_132 for verification
    console.log('\n📊 Field values for fill_122 through fill_132:');
    const { PDFDocument } = await import('pdf-lib');
    const pdfDoc = await PDFDocument.load(ticResult.pdfBytes);
    const form = pdfDoc.getForm();

    for (let i = 122; i <= 132; i++) {
      const fieldName = `fill_${i}`;
      try {
        const field = form.getTextField(fieldName);
        const value = field.getText() || '(empty)';
        console.log(`  ${fieldName}: ${value}`);
      } catch (e) {
        console.log(`  ${fieldName}: (field not found)`);
      }
    }

    // Also check the passbook rate row field (X=160.9, Y=241.3)
    console.log('\n📊 Passbook rate row field (X=160.9, Y=241.3):');
    try {
      const undefinedField = form.getTextField('undefined');
      const value = undefinedField.getText() || '(empty)';
      console.log(`  undefined: ${value} (should be column H total: 6,500.00)`);
    } catch (e) {
      console.log(`  undefined: (field not found)`);
    }

  } catch (error) {
    console.error('Error generating TIC:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

generateTestTIC();
