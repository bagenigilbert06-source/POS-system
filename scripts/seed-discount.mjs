import 'dotenv/config';
import pg from 'pg';
import crypto from 'node:crypto';
const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString: url, ssl: url?.includes('supabase') ? { rejectUnauthorized: false } : undefined });
const c = await pool.connect();
try {
  const org = await c.query('select id from organization where id = $1 or $1 is null order by "createdAt" asc limit 1', [process.env.ORG_ID || null]);
  if (!org.rows[0]) throw new Error('No organization found');
  const id = crypto.randomUUID();
  await c.query(`insert into promotion_rule (id,"organizationId",name,description,kind,"valueType",value,"minimumSpend","maximumDiscount","usageLimit","startsAt","endsAt","isActive") values ($1,$2,$3,$4,'discount','percentage',10,5000,3000,100,now(),now()+interval '30 days',true)`, [id, org.rows[0].id, 'Weekend Store Discount', 'Save 10% when you spend KES 5,000, up to KES 3,000.']);
  console.log(`Seeded discount ${id}`);
} finally { c.release(); await pool.end(); }
