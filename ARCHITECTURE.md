# IMARA POS - Enterprise SaaS Architecture

## Overview

IMARA POS is a production-ready, enterprise-grade SaaS platform built on clean architecture principles, SOLID design patterns, and configuration-driven modular design.

The system currently supports three business types:
- **Retail Store** - Product-based retail with inventory management
- **Restaurant & Café** - Food service with table and kitchen queue management
- **Pharmacy** - Pharmaceutical retail with prescription and batch tracking

The architecture is designed to support unlimited future business types (Hardware, Wholesale, Hotel, Salon, Manufacturing, Clinic, etc.) without modifying core code.

## Project Structure

```
project-root/
├── app/                                # Next.js App Router
│   ├── dashboard/                      # Dashboard routing
│   │   ├── page.tsx                    # Smart router (redirects to business-specific)
│   │   ├── retail/page.tsx             # Retail dashboard (SSR)
│   │   ├── restaurant/page.tsx         # Restaurant dashboard (SSR)
│   │   └── pharmacy/page.tsx           # Pharmacy dashboard (SSR)
│   ├── actions/                        # Server Actions for data fetching
│   │   └── dashboard.ts                # Dashboard data actions (with caching)
│   └── layout.tsx                      # Root layout
│
├── lib/                                # Core business logic
│   ├── types/                          # Type definitions
│   │   ├── business.ts                 # Business type enums & metadata
│   │   ├── domain.ts                   # Core entity types
│   │   ├── api.ts                      # API response types
│   │   ├── permissions.ts              # RBAC types
│   │   └── index.ts                    # Centralized exports
│   │
│   ├── interfaces/                     # Service interfaces (contracts)
│   │   └── index.ts                    # All service contracts
│   │
│   ├── config/                         # Configuration
│   │   └── business-types.ts           # Business type configs, navigation, dashboards
│   │
│   ├── services/                       # Business logic & services
│   │   └── business-registry.ts        # Business type registry (DI container)
│   │
│   ├── constants/                      # Global constants
│   │   └── index.ts                    # All constants
│   │
│   └── utils/                          # Utility functions
│       ├── format.ts                   # Formatting utilities
│       ├── validation.ts               # Validation utilities
│       ├── common.ts                   # Common utilities
│       └── index.ts                    # Centralized exports
│
├── hooks/                              # React hooks (client-side)
│   ├── useOrganization.ts              # Access current organization
│   ├── useBusinessType.ts              # Access business type config
│   ├── usePermissions.ts               # Check user permissions
│   ├── useProducts.ts                  # Manage products
│   ├── useDashboard.ts                 # Fetch dashboard data
│   ├── useAsync.ts                     # Generic async hook
│   └── index.ts                        # Centralized exports
│
├── components/                         # React components
│   ├── dashboard/
│   │   └── shared/                     # Reusable dashboard components
│   │       ├── stat-card.tsx           # KPI card component
│   │       ├── alert-card.tsx          # Alert notification component
│   │       ├── dashboard-grid.tsx      # Dashboard layout components
│   │       └── index.ts                # Centralized exports
│   │
│   └── onboarding/
│       └── step-business-type.tsx      # Beautiful business type selector
│
└── ARCHITECTURE.md                     # This file
```

## Architecture Layers

### 1. **Presentation Layer** (React Components)
- Pages using React Server Components for SSR
- Suspense boundaries for streaming
- Client Components for interactivity
- Reusable dashboard widgets

Files:
- `/app/dashboard/[businessType]/page.tsx`
- `/components/dashboard/shared/*`
- `/components/onboarding/*`

### 2. **Application Layer** (Server Actions & Hooks)
- Server Actions for data fetching with caching
- Custom React hooks for client-side state
- Business logic orchestration

Files:
- `/app/actions/dashboard.ts`
- `/hooks/*.ts`

### 3. **Domain Layer** (Business Logic)
- Service interfaces defining contracts
- Business type registry
- Configuration management

Files:
- `/lib/interfaces/index.ts`
- `/lib/services/business-registry.ts`
- `/lib/config/business-types.ts`

### 4. **Infrastructure Layer** (Data & External Systems)
- Database (Drizzle ORM)
- Type definitions
- Constants and utilities

Files:
- `/lib/types/*`
- `/lib/constants/index.ts`
- `/lib/utils/*`

## Key Design Patterns

### 1. **Configuration-Driven System**
Business type configurations are centralized in `/lib/config/business-types.ts`. Each business type defines:
- Navigation items
- Dashboard layout
- Enabled modules
- Features
- Permissions

**Benefit**: Adding new business types requires no core code changes—only configuration.

```typescript
// Example: Retail configuration
const RETAIL_CONFIG: BusinessTypeConfig = {
  id: BusinessTypeEnum.RETAIL,
  navigation: [...],
  dashboardLayout: [...],
  modules: ['inventory', 'sales', 'products', ...],
  features: ['low-stock-alerts', 'barcode-scanning', ...],
};
```

### 2. **Registry Pattern**
`BusinessRegistryService` is a singleton that manages all business types and their modules.

**Benefit**: Dynamic registration of business types without hardcoding.

```typescript
const registry = businessRegistryService;
registry.hasModule(BusinessTypeEnum.RETAIL, 'inventory'); // true
registry.enableModule(BusinessTypeEnum.RETAIL, 'custom-module');
```

### 3. **Service Interface Segregation**
Each service has a well-defined interface in `/lib/interfaces/`.

**Benefit**: Clear contracts, easy to test, easy to swap implementations.

```typescript
export interface IProductService {
  getProductById(id: string): Promise<Product>;
  getLowStockProducts(orgId: string): Promise<Product[]>;
  // ... other methods
}
```

### 4. **Server-First Rendering**
All dashboards use Server Components with Suspense boundaries for streaming.

**Benefit**: Optimal performance, security (credentials never exposed), automatic caching.

```typescript
export default async function RetailDashboard() {
  return (
    <Suspense fallback={<Skeleton />}>
      <RetailStats /> {/* Server Component */}
    </Suspense>
  );
}
```

### 5. **Type-Safe Constants**
All enums and constants are centralized in `/lib/types/` and `/lib/constants/`.

**Benefit**: Single source of truth, no magic strings, IDE autocomplete.

```typescript
export enum BusinessTypeEnum {
  RETAIL = 'retail',
  RESTAURANT = 'restaurant',
  PHARMACY = 'pharmacy',
}

// Instead of: if (org.businessType === 'retail')
// Use: if (org.businessType === BusinessTypeEnum.RETAIL)
```

### 6. **Reusable Component Library**
Dashboard widgets are generic and business-agnostic.

**Benefit**: Consistency across all dashboards, easy to add new dashboards.

```typescript
<StatCard
  title="Revenue"
  value={1000}
  format="currency"
  trend={{ value: 12, direction: 'up' }}
/>
```

## Data Flow

### 1. User Accesses Dashboard
```
User → app/dashboard/page.tsx (router)
  ↓
Check businessType from organization
  ↓
Redirect to /dashboard/[businessType]
  ↓
app/dashboard/retail/page.tsx (Server Component)
```

### 2. Dashboard Loads Data
```
Page Component (async)
  ↓
Calls getDashboardStats() (Server Action)
  ↓
Database Query (with cache tags)
  ↓
Returns data to Page
  ↓
Suspense boundary streams initial UI
  ↓
Components render with data
```

### 3. Client-Side Interactivity
```
Client Hook (useProducts, usePermissions, etc.)
  ↓
Calls API endpoint or Server Action
  ↓
Caches result
  ↓
Returns data + refetch function
  ↓
Component re-renders with data
```

## Adding a New Business Type

### Step 1: Define Business Type
Add to `/lib/types/business.ts`:
```typescript
export enum BusinessTypeEnum {
  RETAIL = 'retail',
  RESTAURANT = 'restaurant',
  PHARMACY = 'pharmacy',
  HARDWARE = 'hardware', // NEW
}

export const BUSINESS_TYPE_METADATA: Record<BusinessTypeEnum, BusinessTypeMetadata> = {
  // ... existing types
  [BusinessTypeEnum.HARDWARE]: {
    id: BusinessTypeEnum.HARDWARE,
    name: 'Hardware Store',
    // ...
  },
};
```

### Step 2: Create Configuration
Add to `/lib/config/business-types.ts`:
```typescript
export const HARDWARE_CONFIG: BusinessTypeConfig = {
  id: BusinessTypeEnum.HARDWARE,
  navigation: [...],
  dashboardLayout: [...],
  modules: ['inventory', 'sales', ...],
  features: [...],
};

export const BUSINESS_TYPE_CONFIGS = {
  // ... existing configs
  [BusinessTypeEnum.HARDWARE]: HARDWARE_CONFIG,
};
```

### Step 3: Create Dashboard
Create `/app/dashboard/hardware/page.tsx`:
```typescript
export default function HardwareDashboard() {
  return (
    <DashboardPage title="Hardware Dashboard">
      {/* Dashboard content */}
    </DashboardPage>
  );
}
```

### Step 4: Register in Router
The dashboard router automatically handles it!

**That's it!** No core code changes needed.

## Module System

Modules represent core business features:
- `inventory` - Product inventory management
- `sales` - Sales/POS operations
- `products` - Product catalog
- `customers` - Customer management
- `reports` - Business reporting
- `analytics` - Data analytics
- `kitchen` - Kitchen queue (restaurant)
- `tables` - Table management (restaurant)
- `orders` - Order management
- `prescriptions` - Prescription tracking (pharmacy)
- `batch-tracking` - Batch/lot tracking (pharmacy)

Each business type enables specific modules:
```typescript
RETAIL_CONFIG.modules = ['inventory', 'sales', 'products', 'customers', ...];
RESTAURANT_CONFIG.modules = ['kitchen', 'tables', 'orders', 'inventory', ...];
PHARMACY_CONFIG.modules = ['prescriptions', 'batch-tracking', 'inventory', ...];
```

Modules can be enabled/disabled per organization:
```typescript
businessRegistry.enableModule(orgId, 'custom-analytics');
businessRegistry.disableModule(orgId, 'loyalty-program');
```

## Performance Optimizations

### 1. Server-Side Rendering (SSR)
All dashboard pages render on the server, reducing client-side JavaScript.

### 2. Streaming with Suspense
Long-running queries are wrapped in Suspense boundaries for faster FCP (First Contentful Paint).

```typescript
<Suspense fallback={<LoadingSkeleton />}>
  <SlowComponent /> {/* Streams when ready */}
</Suspense>
```

### 3. Request Deduplication
Server Actions with Next.js caching automatically deduplicate requests.

### 4. Code Splitting
Business type dashboards are automatically code-split by Next.js.

### 5. Image Optimization
All images use Next.js `Image` component for automatic optimization.

### 6. Font Optimization
Fonts are preloaded and subsetted.

## Security

### 1. Server Actions
Data fetching happens on the server, credentials never exposed to client.

### 2. Row-Level Security (RLS)
If using Supabase/Postgres with RLS:
```sql
-- Only fetch data for current user's organization
SELECT * FROM products WHERE org_id = auth.uid()
```

### 3. Permission Checks
All operations verify user permissions before execution.

```typescript
const hasPermission = await checkPermission(userId, 'product:edit');
if (!hasPermission) throw new Error('Unauthorized');
```

### 4. Type Safety
Strong TypeScript prevents common security vulnerabilities.

## Testing

### Unit Tests
Test utilities and services independently:
```typescript
describe('formatCurrency', () => {
  it('formats USD correctly', () => {
    expect(formatCurrency(1000, 'USD')).toBe('$1,000.00');
  });
});
```

### Integration Tests
Test API endpoints and database operations:
```typescript
describe('GET /api/products', () => {
  it('returns products for organization', async () => {
    const res = await fetch('/api/products', { headers: auth });
    expect(res.status).toBe(200);
  });
});
```

### E2E Tests
Test user workflows with Playwright/Cypress:
```typescript
test('user can create a product', async ({ page }) => {
  await page.goto('/products');
  await page.click('button:has-text("Add Product")');
  // ...
});
```

## Scalability Considerations

### 1. Database
- Add indexes for frequently queried fields
- Use connection pooling (Supabase, Neon)
- Implement database sharding if needed

### 2. Caching
- Increase `revalidateTag()` duration for stable data
- Use Redis for session storage
- Implement CDN for static assets

### 3. API Rate Limiting
- Implement rate limiting per user/org
- Use Upstash Redis for distributed rate limiting

### 4. Background Jobs
- Use Vercel Functions for async tasks
- Implement job queue (Upstash Queues, Bull)

## Future Enhancements

1. **Multi-branch Support** - Organizations with multiple locations
2. **Advanced Analytics** - AI-powered insights and forecasting
3. **Inventory Optimization** - Smart reorder recommendations
4. **Staff Management** - Employee scheduling and performance
5. **Customer Loyalty** - Rewards and retention programs
6. **Integration Marketplace** - Connect with payment gateways, accounting software
7. **Mobile App** - React Native client for field operations
8. **AI Assistant** - Chat-based business insights

## Getting Started

### Local Development
```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local

# Run database migrations
pnpm db:migrate

# Start dev server
pnpm dev

# Open http://localhost:3000
```

### Deployment
```bash
# Deploy to Vercel
git push origin main

# Vercel automatically deploys on push
```

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Server Components](https://react.dev/reference/react/use-server)
- [Drizzle ORM](https://orm.drizzle.team)
- [Better Auth](https://better-auth.vercel.app)
- [Tailwind CSS](https://tailwindcss.com)

---

**Last Updated**: June 2026
**Version**: 1.0.0 (MVP)
**Maintainer**: Development Team
