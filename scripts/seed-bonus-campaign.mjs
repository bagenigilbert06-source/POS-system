import 'dotenv/config';
import pg from 'pg';
import crypto from 'node:crypto';

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL or DIRECT_URL is required');
const pool = new pg.Pool({ connectionString: url, ssl: url.includes('supabase') ? { rejectUnauthorized: false } : undefined });
const client = await pool.connect();
try {
  const org = await client.query('select id from organization where id = $1 or $1 is null order by "createdAt" asc limit 1', [process.env.ORG_ID || null]);
  if (!org.rows[0]) throw new Error('No organization found. Create a workspace first.');
  const organizationId = org.rows[0].id;
  await client.query('update promotion_rule set "lifecycleStatus" = case when "isActive" then \'ACTIVE\' else \'PAUSED\' end where "organizationId" = $1 and kind = \'bonus\'', [organizationId]);
  await client.query('delete from promotion_rule where "organizationId" = $1 and name = $2 and "usedCount" = 0', [organizationId, 'August 20% Bonus']);
  const id = crypto.randomUUID();
  await client.query(`insert into promotion_rule (id, "organizationId", name, description, kind, "valueType", value, "minimumSpend", "maximumDiscount", "bonusValidityDays", "usageLimit", "startsAt", "endsAt", "isActive", "lifecycleStatus") values ($1,$2,$3,$4,'bonus','percentage',15,15000,2500,30,1,now(),now()+interval '30 days',true,'ACTIVE')`, [id, organizationId, 'September Weekend Bonus', 'Earn 15% Bonus when you spend KES 15,000. Maximum KES 2,500.']);
  console.log(`Seeded August Wine Bonus campaign (${id}) for organization ${organizationId}`);
} finally { client.release(); await pool.end(); }
