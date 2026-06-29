# Implementation Guide - Next Steps

This guide walks you through the enterprise architecture that has been built and what to do next.

## What Has Been Built

### Foundation (100% Complete)

✅ **Type System & Constants**
- Business type enums with metadata
- Domain entity types (Product, Sale, Customer, Order, Prescription, etc.)
- API response types
- RBAC permission enums and role mappings
- Global constants and configuration values

✅ **Core Architecture**
- Service interfaces following SOLID principles
- Business registry service for managing business types
- Configuration-driven business type system

✅ **Reusable Components**
- StatCard - KPI statistics with trends
- AlertCard - Alert notifications
- Dashboard layouts and grids
- Mobile-responsive design system

✅ **Shared Hooks**
- `useOrganization()` - Access current organization
- `useBusinessType()` - Get business-specific config
- `usePermissions()` - Check user permissions
- `useProducts()` - Manage products
- `useDashboard()` - Fetch dashboard data
- `useAsync()` - Generic async data fetching

✅ **Dashboard Infrastructure**
- Smart dashboard router (`/dashboard/page.tsx`)
- Retail dashboard (`/dashboard/retail/page.tsx`)
- Restaurant dashboard (`/dashboard/restaurant/page.tsx`)
- Pharmacy dashboard (`/dashboard/pharmacy/page.tsx`)
- Server Actions for data fetching with caching

✅ **Enhanced Onboarding**
- Beautiful business type selector
- Integrates with configuration system

## What Needs Implementation

### Phase 1: Connect to Database

**File**: Create `/lib/db/queries.ts`

Implement queries for:
```typescript
// Organization
export async function getOrganizationByUserId(userId: string)
export async function updateOrganizationBusinessType(orgId: string, businessType: string)

// Products
export async function getProductsByOrg(orgId: string)
export async function getLowStockProducts(orgId: string)
export async function getTopProducts(orgId: string, limit: number)

// Sales
export async function getDailySales(orgId: string)
export async function getRecentSales(orgId: string, limit: number)

// Similar queries for other entities
```

**Time**: 2-3 hours

### Phase 2: Implement API Endpoints

Create REST or GraphQL endpoints:

```
GET  /api/organization/current
GET  /api/products
POST /api/products
GET  /api/sales
POST /api/sales
GET  /api/dashboard/stats
GET  /api/permissions
```

**Time**: 3-4 hours

### Phase 3: Connect Navigation

**File**: Update `/components/layout/app-sidebar.tsx`

```typescript
import { useBusinessType } from '@/hooks';

export function AppSidebar() {
  const { navigation } = useBusinessType();
  
  return (
    <nav>
      {navigation.map(item => (
        <NavLink key={item.id} href={item.href}>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
```

**Time**: 1 hour

### Phase 4: Implement Features Per Module

#### Retail Module
- **Products** (`/app/products/*`)
  - List, create, edit, delete products
  - Bulk import from CSV
  - Barcode scanning

- **Sales** (`/app/sales/*`)
  - POS interface
  - Receipt printing
  - Refunds

- **Inventory** (`/app/inventory/*`)
  - Stock levels
  - Inventory transfers
  - Low stock alerts

- **Customers** (`/app/customers/*`)
  - Customer profiles
  - Loyalty points

#### Restaurant Module
- **Tables** (`/app/tables/*`)
  - Table management
  - Status updates

- **Kitchen Queue** (`/app/kitchen/*`)
  - Order preparation tracking
  - Staff management

- **Orders** (`/app/orders/*`)
  - Create orders
  - Order modifications
  - Payment processing

#### Pharmacy Module
- **Prescriptions** (`/app/prescriptions/*`)
  - Prescription management
  - Dispensing

- **Batch Tracking** (`/app/batch-tracking/*`)
  - Batch/lot numbers
  - Expiry tracking

- **Drug Interactions** 
  - Interaction checker

**Time**: 20-30 hours (distributed across sprints)

### Phase 5: Backend Services

Create implementations for service interfaces:

```typescript
// /lib/services/product.service.ts
export class ProductService implements IProductService {
  async getProductById(id: string, orgId: string): Promise<Product> {
    // Implementation
  }
  
  async getLowStockProducts(orgId: string): Promise<Product[]> {
    // Implementation
  }
  // ... other methods
}

// Similar for other services
```

**Time**: 5-10 hours

### Phase 6: Enhanced Dashboard Widgets

Implement interactive charts and tables:

```typescript
// /components/dashboard/charts/revenue-chart.tsx
'use client';

import { LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';

export function RevenueChart({ data }) {
  return (
    <LineChart data={data} width={500} height={300}>
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip />
      <Line type="monotone" dataKey="revenue" stroke="#3b82f6" />
    </LineChart>
  );
}
```

**Time**: 3-5 hours

### Phase 7: Testing

- Unit tests for utilities and services
- Integration tests for API endpoints
- E2E tests for critical user flows
- Performance tests (Core Web Vitals)

**Time**: 5-10 hours

## Architecture Decisions to Implement

### 1. Database Layer
Choose one:
- **Neon + Drizzle ORM** (Recommended) - Serverless Postgres
- **Supabase** - Firebase alternative with Postgres
- **Prisma + Postgres** - Full-featured ORM

### 2. Authentication
Already setup with Better Auth:
- Email/password or OAuth
- Session management
- Permission checks

### 3. Caching Strategy
```typescript
// Cache dashboard stats for 5 minutes
export async function getDashboardStats(orgId: string) {
  const stats = await db.query(...)
  revalidateTag(`dashboard-${orgId}`) // Purge when needed
  return stats
}
```

### 4. Error Handling
```typescript
// Implement consistent error handling
try {
  const data = await someQuery()
  return { success: true, data }
} catch (error) {
  console.error(error)
  return { success: false, error: error.message }
}
```

## Code Examples

### Example 1: Creating a New Page

```typescript
// /app/products/page.tsx
'use client';

import { useState } from 'react';
import { useProducts } from '@/hooks';
import { DashboardPage, DashboardGrid } from '@/components/dashboard/shared';

export default function ProductsPage() {
  const { products, isLoading } = useProducts();
  
  return (
    <DashboardPage
      title="Products"
      description="Manage your product catalog"
    >
      {/* Products list */}
    </DashboardPage>
  );
}
```

### Example 2: Using Business Type Config

```typescript
// Check if feature is available
const { checkFeature } = useBusinessType();

if (checkFeature('barcode-scanning')) {
  return <BarcodeScanner />;
}
```

### Example 3: Permission Checks

```typescript
const { hasPermission } = usePermissions();

if (!hasPermission(PermissionEnum.PRODUCT_EDIT)) {
  return <p>You don't have permission to edit products</p>;
}
```

## File Structure for New Features

When adding a new feature, follow this structure:

```
feature/
├── components/
│   ├── feature-list.tsx
│   ├── feature-form.tsx
│   └── feature-detail.tsx
├── hooks/
│   └── useFeature.ts (if needed)
├── services/
│   └── feature.service.ts (if complex)
├── page.tsx (if new route)
└── layout.tsx (if nested routes)
```

## Testing Template

```typescript
// /tests/services/product.service.test.ts
import { ProductService } from '@/lib/services/product.service';

describe('ProductService', () => {
  let service: ProductService;
  
  beforeEach(() => {
    service = new ProductService();
  });
  
  describe('getProductById', () => {
    it('should return product', async () => {
      const product = await service.getProductById('123', 'org-1');
      expect(product).toBeDefined();
      expect(product.id).toBe('123');
    });
  });
});
```

## Deployment Checklist

- [ ] All environment variables configured
- [ ] Database migrations run
- [ ] API endpoints tested
- [ ] Dashboard pages responsive on mobile
- [ ] Authentication working
- [ ] Error handling in place
- [ ] Logging configured
- [ ] Analytics setup
- [ ] Performance optimized
- [ ] Security review completed
- [ ] Documentation updated

## Performance Targets

- **First Contentful Paint (FCP)**: < 2 seconds
- **Largest Contentful Paint (LCP)**: < 2.5 seconds
- **Cumulative Layout Shift (CLS)**: < 0.1
- **Time to Interactive (TTI)**: < 3 seconds
- **API Response Time**: < 200ms
- **Dashboard Load**: < 1.5 seconds

## Security Checklist

- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (React escaping)
- [ ] CSRF protection
- [ ] Authentication required for all sensitive endpoints
- [ ] Rate limiting implemented
- [ ] Secrets not committed to repo
- [ ] HTTPS enforced
- [ ] CORS configured properly
- [ ] Input validation on all forms
- [ ] Audit logging for sensitive operations

## Next Immediate Steps

1. **Setup Database**
   ```bash
   # Set up Neon or Supabase
   # Update database connection strings
   # Run migrations
   ```

2. **Implement Organization Query**
   ```typescript
   // Make /api/organization/current work
   // This is critical for everything else
   ```

3. **Test Dashboard Router**
   ```bash
   # Visit http://localhost:3000/dashboard
   # Verify it redirects to /dashboard/retail
   ```

4. **Build Products Page**
   ```bash
   # Create /app/products/page.tsx
   # List products from database
   # Add create/edit/delete functionality
   ```

5. **Connect Data to Dashboard**
   ```typescript
   // Update getDashboardStats() in /app/actions/dashboard.ts
   // to fetch real data from database
   ```

## Resources

- **Database**: https://orm.drizzle.team
- **UI Components**: https://ui.shadcn.com
- **Forms**: https://react-hook-form.com
- **Testing**: https://vitest.dev
- **Charts**: https://recharts.org
- **Tables**: https://tanstack.com/table

## Questions?

Refer to:
1. `/ARCHITECTURE.md` - System design
2. Type definitions in `/lib/types/`
3. Component examples in `/components/dashboard/shared/`
4. Business type config in `/lib/config/business-types.ts`

---

**Build systematically, test thoroughly, deploy with confidence!**
