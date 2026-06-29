import { readFileSync } from 'node:fs'
import pg from 'pg'

function loadEnv() {
  const env = readFileSync('.env', 'utf8')
  for (const line of env.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (!match) continue
    const [, key, rawValue] = match
    process.env[key] ??= rawValue.replace(/^"|"$/g, '')
  }
}

const sql = `
create table if not exists "user" (
  "id" text primary key,
  "name" text not null,
  "email" text not null unique,
  "emailVerified" boolean not null default false,
  "image" text,
  "createdAt" timestamp not null default now(),
  "updatedAt" timestamp not null default now()
);

create table if not exists "session" (
  "id" text primary key,
  "expiresAt" timestamp not null,
  "token" text not null unique,
  "createdAt" timestamp not null default now(),
  "updatedAt" timestamp not null default now(),
  "ipAddress" text,
  "userAgent" text,
  "userId" text not null references "user"("id") on delete cascade
);

create table if not exists "account" (
  "id" text primary key,
  "accountId" text not null,
  "providerId" text not null,
  "userId" text not null references "user"("id") on delete cascade,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamp,
  "refreshTokenExpiresAt" timestamp,
  "scope" text,
  "password" text,
  "createdAt" timestamp not null default now(),
  "updatedAt" timestamp not null default now()
);

create table if not exists "verification" (
  "id" text primary key,
  "identifier" text not null,
  "value" text not null,
  "expiresAt" timestamp not null,
  "createdAt" timestamp default now(),
  "updatedAt" timestamp default now()
);

create table if not exists "jwks" (
  "id" text primary key,
  "publicKey" text not null,
  "privateKey" text not null,
  "createdAt" timestamp not null default now(),
  "expiresAt" timestamp
);

create table if not exists "organization" (
  "id" text primary key,
  "name" text not null,
  "slug" text not null unique,
  "businessType" text not null default 'retail',
  "currency" text not null default 'KES',
  "taxRate" numeric(5, 2) not null default 16,
  "userId" text not null,
  "onboardingCompleted" boolean not null default false,
  "onboardingStep" integer not null default 0,
  "businessEmail" text,
  "country" text,
  "timezone" text default 'Africa/Nairobi',
  "businessSize" text,
  "businessDescription" text,
  "phone" text,
  "createdAt" timestamp not null default now(),
  "updatedAt" timestamp not null default now()
);

create table if not exists "category" (
  "id" text primary key,
  "name" text not null,
  "description" text,
  "userId" text not null,
  "orgId" text not null,
  "createdAt" timestamp not null default now()
);

create table if not exists "product" (
  "id" text primary key,
  "name" text not null,
  "sku" text,
  "barcode" text,
  "description" text,
  "categoryId" text,
  "buyingPrice" numeric(12, 2) not null default 0,
  "sellingPrice" numeric(12, 2) not null,
  "stock" integer not null default 0,
  "minStock" integer not null default 5,
  "unit" text not null default 'pcs',
  "imageUrl" text,
  "isActive" boolean not null default true,
  "userId" text not null,
  "orgId" text not null,
  "createdAt" timestamp not null default now(),
  "updatedAt" timestamp not null default now()
);

create table if not exists "customer" (
  "id" text primary key,
  "name" text not null,
  "phone" text,
  "email" text,
  "address" text,
  "loyaltyPoints" integer not null default 0,
  "userId" text not null,
  "orgId" text not null,
  "createdAt" timestamp not null default now(),
  "updatedAt" timestamp not null default now()
);

create table if not exists "sale" (
  "id" text primary key,
  "receiptNo" text not null,
  "customerId" text,
  "subtotal" numeric(12, 2) not null,
  "taxAmount" numeric(12, 2) not null default 0,
  "discountAmount" numeric(12, 2) not null default 0,
  "total" numeric(12, 2) not null,
  "paymentMethod" text not null default 'cash',
  "mpesaRef" text,
  "status" text not null default 'completed',
  "userId" text not null,
  "orgId" text not null,
  "createdAt" timestamp not null default now()
);

create table if not exists "sale_item" (
  "id" text primary key,
  "saleId" text not null,
  "productId" text not null,
  "productName" text not null,
  "quantity" integer not null,
  "unitPrice" numeric(12, 2) not null,
  "totalPrice" numeric(12, 2) not null,
  "userId" text not null,
  "orgId" text not null
);

create table if not exists "expense" (
  "id" text primary key,
  "title" text not null,
  "amount" numeric(12, 2) not null,
  "category" text not null default 'general',
  "notes" text,
  "userId" text not null,
  "orgId" text not null,
  "createdAt" timestamp not null default now()
);

do $$
begin
  if not exists (select 1 from pg_type where typname = 'UserRole') then
    create type "UserRole" as enum ('OWNER', 'WORKER', 'UNKNOW');
  end if;

  if not exists (select 1 from pg_type where typname = 'CatProduct') then
    create type "CatProduct" as enum ('ELECTRO', 'DRINK', 'FOOD', 'FASHION');
  end if;
end $$;

create table if not exists "ProductStock" (
  "id" text primary key,
  "name" text not null,
  "imageProduct" text,
  "price" double precision not null,
  "stock" double precision not null,
  "cat" "CatProduct" not null
);

create table if not exists "Product" (
  "id" text primary key,
  "productId" text not null unique references "ProductStock"("id") on delete cascade on update cascade,
  "sellprice" double precision not null
);

create table if not exists "Transaction" (
  "id" text primary key,
  "totalAmount" numeric(65, 30),
  "createdAt" timestamp not null default now(),
  "isComplete" boolean not null default false
);

create table if not exists "OnSaleProduct" (
  "id" text primary key,
  "productId" text not null references "Product"("productId") on delete cascade on update cascade,
  "quantity" integer not null,
  "saledate" timestamp not null default now(),
  "transactionId" text not null references "Transaction"("id") on delete cascade on update cascade
);

create table if not exists "ShopData" (
  "id" text primary key,
  "tax" integer,
  "name" text
);

create index if not exists "session_userId_idx" on "session"("userId");
create index if not exists "account_userId_idx" on "account"("userId");
create index if not exists "organization_userId_idx" on "organization"("userId");
create index if not exists "product_orgId_idx" on "product"("orgId");
create index if not exists "customer_orgId_idx" on "customer"("orgId");
create index if not exists "sale_orgId_idx" on "sale"("orgId");
create index if not exists "sale_item_saleId_idx" on "sale_item"("saleId");
create unique index if not exists "ProductStock_id_key" on "ProductStock"("id");
create index if not exists "OnSaleProduct_productId_transactionId_idx" on "OnSaleProduct"("productId", "transactionId");
`

loadEnv()

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required')
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('supabase.com')
    ? { rejectUnauthorized: false }
    : undefined,
})
try {
  await pool.query(sql)
  console.log('Database tables are ready')
} finally {
  await pool.end()
}
