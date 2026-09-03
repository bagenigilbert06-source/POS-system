import crypto from 'node:crypto';
import dotenv from 'dotenv';
import pg from 'pg';
import { createClient as createRedisClient } from 'redis';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const requestedOrganizationId = process.env.CAFE_ORG_ID?.trim();
const requestedOrganizationSlug = process.env.CAFE_ORG_SLUG?.trim();

if (!connectionString) {
  throw new Error('DIRECT_URL or DATABASE_URL is required');
}

if (!requestedOrganizationId && !requestedOrganizationSlug) {
  throw new Error(
    'Set CAFE_ORG_ID or CAFE_ORG_SLUG so demo data cannot be written to the wrong workspace'
  );
}

const pexelsImage = (photoId) =>
  `https://images.pexels.com/photos/${photoId}/pexels-photo-${photoId}.jpeg?auto=compress&cs=tinysrgb&w=1200`;

const categories = [
  {
    key: 'coffee',
    name: 'Coffee',
    description: 'Espresso, cappuccinos and milk-based coffee drinks.',
    imageUrl: pexelsImage('16180909'),
  },
  {
    key: 'tea',
    name: 'Tea',
    description: 'Freshly brewed tea and spiced café favourites.',
    imageUrl: pexelsImage('5946623'),
  },
  {
    key: 'cold-beverages',
    name: 'Cold Beverages',
    description: 'Fresh juices and chilled refreshments.',
    imageUrl: pexelsImage('6529792'),
  },
  {
    key: 'pastries-snacks',
    name: 'Pastries & Snacks',
    description: 'Fresh pastries and quick café snacks.',
    imageUrl: pexelsImage('17366230'),
  },
  {
    key: 'meals',
    name: 'Meals',
    description: 'Made-to-order light meals and sandwiches.',
    imageUrl: pexelsImage('12469931'),
  },
];

const menuItems = [
  {
    key: 'cappuccino',
    name: 'Cappuccino',
    sku: 'CAFE-COF-001',
    category: 'coffee',
    buyingPrice: 80,
    sellingPrice: 250,
    stock: 100,
    minStock: 15,
    unit: 'cup',
    description: 'Double espresso finished with steamed milk and a deep layer of foam.',
    imageUrl: pexelsImage('16180909'),
  },
  {
    key: 'cafe-latte',
    name: 'Café Latte',
    sku: 'CAFE-COF-002',
    category: 'coffee',
    buyingPrice: 90,
    sellingPrice: 280,
    stock: 100,
    minStock: 15,
    unit: 'cup',
    description: 'Espresso with silky steamed milk and a light foam finish.',
    imageUrl: pexelsImage('11137171'),
  },
  {
    key: 'masala-chai',
    name: 'Masala Chai',
    sku: 'CAFE-TEA-001',
    category: 'tea',
    buyingPrice: 60,
    sellingPrice: 200,
    stock: 80,
    minStock: 12,
    unit: 'cup',
    description: 'Kenyan milk tea brewed with warming aromatic spices.',
    imageUrl: pexelsImage('5946623'),
  },
  {
    key: 'fresh-orange-juice',
    name: 'Fresh Orange Juice',
    sku: 'CAFE-BEV-001',
    category: 'cold-beverages',
    buyingPrice: 100,
    sellingPrice: 280,
    stock: 60,
    minStock: 10,
    unit: 'glass',
    description: 'Freshly squeezed orange juice served chilled.',
    imageUrl: pexelsImage('6529792'),
  },
  {
    key: 'butter-croissant',
    name: 'Butter Croissant',
    sku: 'CAFE-PAS-001',
    category: 'pastries-snacks',
    buyingPrice: 80,
    sellingPrice: 200,
    stock: 40,
    minStock: 8,
    unit: 'piece',
    description: 'A flaky, buttery croissant baked for the morning counter.',
    imageUrl: pexelsImage('17366230'),
  },
  {
    key: 'club-sandwich',
    name: 'Club Sandwich',
    sku: 'CAFE-MEA-001',
    category: 'meals',
    buyingPrice: 220,
    sellingPrice: 550,
    stock: 30,
    minStock: 6,
    unit: 'plate',
    description: 'A toasted layered club sandwich prepared to order.',
    imageUrl: pexelsImage('12469931'),
  },
];

function deterministicId(organizationId, type, key) {
  const hex = crypto
    .createHash('sha256')
    .update(`pesaby:cafe-demo:${organizationId}:${type}:${key}`)
    .digest('hex')
    .slice(0, 32)
    .split('');
  hex[12] = '4';
  hex[16] = ((Number.parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const value = hex.join('');
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

async function invalidateWorkspaceCaches(organizationId) {
  const redisUrl = process.env.REDIS_URL?.trim();
  if (!redisUrl) return false;

  const cachePrefix = process.env.REDIS_CACHE_PREFIX?.trim() || 'pesaby';
  const safeOrganizationId = crypto
    .createHash('sha256')
    .update(organizationId)
    .digest('base64url')
    .slice(0, 22);
  const redis = createRedisClient({
    url: redisUrl,
    socket: { connectTimeout: 500, reconnectStrategy: false },
  });
  redis.on('error', () => undefined);

  try {
    await redis.connect();
    await Promise.all(
      ['products', 'categories', 'dashboard'].map((namespace) =>
        redis.incr(
          `${cachePrefix}:cache-version:${namespace}:${safeOrganizationId}`
        )
      )
    );
    return true;
  } catch {
    return false;
  } finally {
    if (redis.isOpen) redis.destroy();
  }
}

const pool = new pg.Pool({
  connectionString,
  ssl: connectionString.includes('supabase')
    ? { rejectUnauthorized: false }
    : undefined,
  max: 1,
});

const client = await pool.connect();

try {
  const organizationResult = await client.query(
    `select id, name, slug, "businessType", "businessCategory", "userId"
       from organization
      where ($1::text is not null and id = $1)
         or ($2::text is not null and slug = $2)
      limit 1`,
    [requestedOrganizationId || null, requestedOrganizationSlug || null]
  );
  const organization = organizationResult.rows[0];

  if (!organization) throw new Error('The requested organization was not found');
  if (!['cafe', 'café', 'coffee_shop'].includes(organization.businessCategory?.toLowerCase())) {
    throw new Error(
      `Refusing to seed ${organization.name}: business category is ${organization.businessCategory ?? 'unset'}, not Café`
    );
  }

  const capabilityResult = await client.query(
    `select to_regclass('public.cafe_menu_item') is not null as ready`
  );
  if (!capabilityResult.rows[0]?.ready) {
    throw new Error('Café migrations 0058 and 0059 must be applied before seeding');
  }

  await client.query('begin');
  const categoryIds = new Map();

  for (const item of categories) {
    const id = deterministicId(organization.id, 'category', item.key);
    const result = await client.query(
      `insert into category
        (id, name, slug, description, "imageUrl", "isActive", "requiresAgeVerification", "userId", "orgId", "createdAt", "updatedAt")
       values ($1, $2, $3, $4, $5, true, false, $6, $7, now(), now())
       on conflict ("orgId", slug) do update set
         name = excluded.name,
         description = excluded.description,
         "imageUrl" = excluded."imageUrl",
         "isActive" = true,
         "updatedAt" = now()
       returning id`,
      [
        id,
        item.name,
        item.key,
        item.description,
        item.imageUrl,
        organization.userId,
        organization.id,
      ]
    );
    categoryIds.set(item.key, result.rows[0].id);
  }

  for (const item of menuItems) {
    const id = deterministicId(organization.id, 'product', item.key);
    await client.query(
      `insert into product
        (id, name, sku, description, "categoryId", "buyingPrice", "sellingPrice", stock, "minStock", unit, "imageUrl", "isActive", "userId", "orgId", "createdAt", "updatedAt")
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, $12, $13, now(), now())
       on conflict (id) do update set
         name = excluded.name,
         sku = excluded.sku,
         description = excluded.description,
         "categoryId" = excluded."categoryId",
         "buyingPrice" = excluded."buyingPrice",
         "sellingPrice" = excluded."sellingPrice",
         stock = excluded.stock,
         "minStock" = excluded."minStock",
         unit = excluded.unit,
         "imageUrl" = excluded."imageUrl",
         "isActive" = true,
         "updatedAt" = now()`,
      [
        id,
        item.name,
        item.sku,
        item.description,
        categoryIds.get(item.category),
        item.buyingPrice,
        item.sellingPrice,
        item.stock,
        item.minStock,
        item.unit,
        item.imageUrl,
        organization.userId,
        organization.id,
      ]
    );
    await client.query(
      `insert into cafe_menu_item
        ("productId", "organizationId", "inventoryMode", "preparationRequired", "manualAvailability", "createdAt", "updatedAt")
       values ($1, $2, 'none', true, 'available', now(), now())
       on conflict ("productId") do update set
         "organizationId" = excluded."organizationId",
         "inventoryMode" = excluded."inventoryMode",
         "preparationRequired" = excluded."preparationRequired",
         "manualAvailability" = 'available',
         "availabilityReason" = null,
         "updatedAt" = now()`,
      [id, organization.id]
    );
  }

  await client.query('commit');
  const cacheInvalidated = await invalidateWorkspaceCaches(organization.id);
  console.log(
    JSON.stringify(
      {
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
        },
        categories: categories.length,
        menuItems: menuItems.length,
        imageProvider: 'Pexels',
        cacheInvalidated,
      },
      null,
      2
    )
  );
} catch (error) {
  await client.query('rollback').catch(() => undefined);
  throw error;
} finally {
  client.release();
  await pool.end();
}
