import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';

const SAFE_TABLE_NAME = /^[a-z][a-z0-9_]*$/;

/** Supports rolling deployments while additive Café migrations are pending. */
export async function databaseTableExists(tableName: string) {
  if (!SAFE_TABLE_NAME.test(tableName))
    throw new Error('Invalid database table name');
  const result = await db.execute(
    sql`select to_regclass(${`public.${tableName}`}) is not null as "exists"`
  );
  return result.rows[0]?.exists === true;
}

export async function cafeSchemaIsReady() {
  const [menuItems, wastage] = await Promise.all([
    databaseTableExists('cafe_menu_item'),
    databaseTableExists('cafe_wastage'),
  ]);
  return menuItems && wastage;
}

export async function requireCafeSchema() {
  if (!(await cafeSchemaIsReady())) {
    throw new Error(
      'Café database setup is incomplete. Apply migrations 0058 and 0059, then try again.'
    );
  }
}
