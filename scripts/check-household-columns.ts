import { config } from 'dotenv';
config({ path: '.env.local' });
import pg from 'pg';

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const res = await client.query(`
  SELECT column_name
  FROM information_schema.columns
  WHERE table_name = 'household_members'
  ORDER BY ordinal_position
`);
console.log(res.rows.map(r => r.column_name).join('\n'));
await client.end();
