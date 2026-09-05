import crypto from 'node:crypto';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const organizationId = process.env.LIQUOR_ORG_ID?.trim();

if (!connectionString) throw new Error('DIRECT_URL or DATABASE_URL is required');
if (!organizationId) throw new Error('Set LIQUOR_ORG_ID to the intended liquor workspace ID');

const pexelsImage = (photoId) =>
  `https://images.pexels.com/photos/${photoId}/pexels-photo-${photoId}.jpeg?auto=compress&cs=tinysrgb&w=1200`;

const categories = [
  { key: 'premium-whisky', name: 'Premium Whisky', description: 'Single malt, blended and bourbon whisky selections.', imageUrl: pexelsImage('29559004') },
  { key: 'gin-cocktail-spirits', name: 'Gin & Cocktail Spirits', description: 'Contemporary gin and cocktail-ready spirits.', imageUrl: pexelsImage('17509969') },
  { key: 'vodka-tequila', name: 'Vodka & Tequila', description: 'Clear spirits for chilled serves and celebrations.', imageUrl: pexelsImage('19613748') },
  { key: 'sparkling-champagne', name: 'Sparkling & Champagne', description: 'Champagne and sparkling wine for every occasion.', imageUrl: pexelsImage('7476178') },
];

const products = [
  { key: 'glenfiddich-12', name: 'Glenfiddich 12 Year Old', brand: 'Glenfiddich', sku: 'LIQ-WHS-GLEN-12', barcode: '5000000001201', category: 'premium-whisky', buyingPrice: 5200, sellingPrice: 6900, stock: 18, minStock: 4, volume: 750, abv: 40, imageUrl: pexelsImage('6766696'), description: 'Single malt Scotch whisky with pear, oak and a smooth finish.' },
  { key: 'tanqueray-london-dry', name: 'Tanqueray London Dry Gin', brand: 'Tanqueray', sku: 'LIQ-GIN-TANQ-70', barcode: '5000000001202', category: 'gin-cocktail-spirits', buyingPrice: 2400, sellingPrice: 3400, stock: 24, minStock: 6, volume: 700, abv: 43.1, imageUrl: pexelsImage('18347928'), description: 'Classic London dry gin with juniper-forward botanical character.' },
  { key: 'absolut-original', name: 'Absolut Original Vodka', brand: 'Absolut', sku: 'LIQ-VOD-ABS-70', barcode: '5000000001203', category: 'vodka-tequila', buyingPrice: 1900, sellingPrice: 2800, stock: 30, minStock: 8, volume: 700, abv: 40, imageUrl: pexelsImage('19613748'), description: 'Swedish wheat vodka with a clean, full-bodied taste.' },
  { key: 'jose-cuervo-especial', name: 'Jose Cuervo Especial Gold', brand: 'Jose Cuervo', sku: 'LIQ-TEQ-JCUE-70', barcode: '5000000001204', category: 'vodka-tequila', buyingPrice: 2700, sellingPrice: 3900, stock: 16, minStock: 4, volume: 700, abv: 38, imageUrl: pexelsImage('17413326'), description: 'Gold tequila for classic cocktails and celebratory serves.' },
  { key: 'moet-imperial', name: 'Moet & Chandon Imperial', brand: 'Moet & Chandon', sku: 'LIQ-CHM-MOET-75', barcode: '5000000001205', category: 'sparkling-champagne', buyingPrice: 7600, sellingPrice: 10500, stock: 12, minStock: 3, volume: 750, abv: 12, imageUrl: pexelsImage('7476178'), description: 'Brut champagne with bright fruit, brioche and elegant freshness.' },
];

function id(type, key) {
  const hash = crypto.createHash('sha256').update(`pesaby:liquor:${organizationId}:${type}:${key}`).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

const pool = new pg.Pool({ connectionString, ssl: connectionString.includes('supabase') ? { rejectUnauthorized: false } : undefined, max: 1 });
const client = await pool.connect();

try {
  const organization = (await client.query(
    `select id, name, "businessCategory", "userId" from organization where id = $1 limit 1`,
    [organizationId]
  )).rows[0];
  if (!organization) throw new Error('The requested liquor workspace was not found');
  if (organization.businessCategory !== 'liquor_shop') throw new Error('Refusing to seed: the requested workspace is not a liquor shop');

  // The POS reads sellable stock from inventory_balance for its active branch,
  // not from the legacy product.stock aggregate. Seed the primary location too
  // so these catalogue items can actually be sold immediately.
  const primaryBranch = (await client.query(
    `select id, name from branch where "organizationId" = $1 order by "isMain" desc, "createdAt" asc limit 1`,
    [organization.id]
  )).rows[0];
  if (!primaryBranch) throw new Error('Refusing to seed: the liquor workspace has no branch to receive stock');

  await client.query('begin');
  const categoryIds = new Map();
  for (const item of categories) {
    const result = await client.query(
      `insert into category (id, name, slug, description, "imageUrl", "isActive", "requiresAgeVerification", "userId", "orgId", "createdAt", "updatedAt")
       values ($1, $2, $3, $4, $5, true, true, $6, $7, now(), now())
       on conflict ("orgId", slug) do update set name = excluded.name, description = excluded.description, "imageUrl" = excluded."imageUrl", "isActive" = true, "requiresAgeVerification" = true, "updatedAt" = now()
       returning id`,
      [id('category', item.key), item.name, item.key, item.description, item.imageUrl, organization.userId, organization.id]
    );
    categoryIds.set(item.key, result.rows[0].id);
  }

  for (const item of products) {
    const productId = id('product', item.key);
    await client.query(
      `insert into product (id, name, brand, sku, barcode, description, "categoryId", "buyingPrice", "sellingPrice", stock, "minStock", unit, volume, "volumeUnit", abv, "requiresAgeVerification", "imageUrl", "isActive", "userId", "orgId", "createdAt", "updatedAt")
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'bottle', $12, 'ml', $13, true, $14, true, $15, $16, now(), now())
       on conflict (id) do update set name = excluded.name, brand = excluded.brand, sku = excluded.sku, barcode = excluded.barcode, description = excluded.description, "categoryId" = excluded."categoryId", "buyingPrice" = excluded."buyingPrice", "sellingPrice" = excluded."sellingPrice", stock = excluded.stock, "minStock" = excluded."minStock", volume = excluded.volume, abv = excluded.abv, "requiresAgeVerification" = true, "imageUrl" = excluded."imageUrl", "isActive" = true, "updatedAt" = now()`,
      [productId, item.name, item.brand, item.sku, item.barcode, item.description, categoryIds.get(item.category), item.buyingPrice, item.sellingPrice, item.stock, item.minStock, item.volume, item.abv, item.imageUrl, organization.userId, organization.id]
    );
    await client.query(
      `insert into inventory_balance (id, "productId", "branchId", "onHand", reserved, unavailable, incoming, "reorderPoint", "safetyStock", "orgId", "updatedAt")
       values ($1, $2, $3, $4, 0, 0, 0, $5, 0, $6, now())
       on conflict ("productId", "branchId") do update
       set "reorderPoint" = excluded."reorderPoint", "updatedAt" = now()`,
      [id('inventory-balance', `${item.key}:${primaryBranch.id}`), productId, primaryBranch.id, item.stock, item.minStock, organization.id]
    );
  }
  await client.query('commit');
  console.log(JSON.stringify({ organization: organization.name, branch: primaryBranch.name, categoriesAdded: categories.length, productsAdded: products.length, stockedAtBranch: products.length, imageProvider: 'Pexels' }, null, 2));
} catch (error) {
  await client.query('rollback').catch(() => undefined);
  throw error;
} finally {
  client.release();
  await pool.end();
}
