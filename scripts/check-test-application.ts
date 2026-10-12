import { config } from 'dotenv';
config({ path: '.env.local' });

import pg from 'pg';

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
});

async function checkTestApplication() {
  try {
    await client.connect();
    console.log('Connected to database\n');

    // Find all submitted applications
    const submittedApps = await client.query(`
      SELECT id, version, applicant_name, status, submitted_at
      FROM applications
      WHERE status = 'submitted'
      ORDER BY id
    `);

    console.log(`Found ${submittedApps.rows.length} submitted applications:\n`);

    for (const app of submittedApps.rows) {
      console.log(`Application ID: ${app.id}, Version: ${app.version}, Name: ${app.applicant_name}`);

      // Count household members
      const householdCount = await client.query(
        'SELECT COUNT(*) FROM household_members WHERE application_id = $1',
        [app.id]
      );
      console.log(`  Household members: ${householdCount.rows[0]?.count || 0}`);

      // Count income sources
      const incomeCount = await client.query(`
        SELECT COUNT(*)
        FROM income_sources is_table
        JOIN household_members hm ON hm.id = is_table.household_member_id
        WHERE hm.application_id = $1
      `, [app.id]);
      console.log(`  Income sources: ${incomeCount.rows[0]?.count || 0}`);

      // Calculate total asset cash value
      const assetTotal = await client.query(`
        SELECT COALESCE(SUM(a.cash_value), 0) as total_cash_value
        FROM assets a
        JOIN household_members hm ON hm.id = a.household_member_id
        WHERE hm.application_id = $1
      `, [app.id]);
      console.log(`  Total asset cash value: $${assetTotal.rows[0]?.total_cash_value || 0}`);

      // Check screening result
      const screening = await client.query(
        'SELECT passed, gross_income, household_size FROM screening_results WHERE application_id = $1',
        [app.id]
      );
      if (screening.rows[0]) {
        console.log(`  Screening: ${screening.rows[0].passed ? 'Passed' : 'Failed'}, Gross income: $${screening.rows[0].gross_income}, Household size: ${screening.rows[0].household_size}`);
      } else {
        console.log('  Screening: Not found');
      }

      console.log('');
    }

    // Check if we have one with the desired characteristics
    const idealApp = submittedApps.rows.find(async (app) => {
      const householdCount = await client.query(
        'SELECT COUNT(*) FROM household_members WHERE application_id = $1',
        [app.id]
      );
      const assetTotal = await client.query(`
        SELECT COALESCE(SUM(a.cash_value), 0) as total_cash_value
        FROM assets a
        JOIN household_members hm ON hm.id = a.household_member_id
        WHERE hm.application_id = $1
      `, [app.id]);

      return parseInt(householdCount.rows[0]?.count || '0') === 3 &&
             parseFloat(assetTotal.rows[0]?.total_cash_value || '0') > 5000;
    });

    if (idealApp) {
      console.log(`\nIdeal test application found: ID ${idealApp.id}`);
    } else {
      console.log('\nNo application found with 3 household members AND assets > $5,000');
      console.log('You may need to seed test data or use an existing application for testing.');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

checkTestApplication();
