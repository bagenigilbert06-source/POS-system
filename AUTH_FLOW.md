# POS System - Authentication & Onboarding Flow

## Quick Summary

When a user signs up, the system automatically:
1. Creates their user account (Better Auth)
2. Creates their organization/workspace 
3. Routes them through guided onboarding (6 steps)
4. Grants them dashboard access once onboarding is complete
5. Prevents access to dashboard until onboarding is done

This document explains **exactly** how each step works.

---

## Complete Flow with Code Examples

### Step 1: User Signs Up

**Location:** `components/auth/auth-form.tsx`

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setLoading(true)
  setError('')

  try {
    if (mode === 'sign-up') {
      // Call Better Auth to create user account
      const result = await authClient.signUp.email({
        name: form.name,
        email: form.email,
        password: form.password,
      })
      
      if (result.error) throw new Error(result.error.message)
      
      // Store session token in localStorage
      await loadAccessToken()

      // STEP 1A: Create organization for new user
      try {
        await fetch('/api/auth/post-signup', {
          method: 'POST',
          credentials: 'include', // Sends session cookie to server
        })
      } catch (orgError) {
        console.warn('[v0] Failed to create organization:', orgError)
        // Continue anyway - organization will be created on onboarding page as fallback
      }

      // STEP 1B: Redirect to onboarding
      router.push('/onboarding')
    }
  } catch (err: unknown) {
    setError(err instanceof Error ? err.message : 'Something went wrong')
  }
}
```

**What happens:**
1. Form validates email/password
2. `authClient.signUp.email()` calls Better Auth API
3. User account is created in database
4. Session is established (token stored)
5. **Post-signup endpoint** is called to create organization
6. User redirected to `/onboarding`

**Result:** User now has account + organization, but hasn't set up business details yet

---

### Step 1A: Post-Signup Organization Creation

**Location:** `app/api/auth/post-signup/route.ts`

```typescript
export async function POST(req: Request) {
  try {
    // Get the user's session
    const session = await auth.api.getSession({ headers: await headers() })

    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user already has an organization (prevents duplicates)
    const existingOrgs = await OrganizationService.getOrganizationsForUser(
      session.user.id
    )

    if (existingOrgs.length > 0) {
      return Response.json({
        success: true,
        message: 'Organization already exists',
        organization: existingOrgs[0],
      })
    }

    // Create a new organization
    const org = await OrganizationService.createOrganizationForUser(
      session.user.id,
      session.user.name || `${session.user.email.split('@')[0]}'s Business`,
      'retail',           // Default business type
      'other_retail'      // Default category
    )

    return Response.json({
      success: true,
      organization: org,
    })
  } catch (error) {
    console.error('[v0] Post-signup error:', error)
    return Response.json(
      { error: 'Failed to create organization' },
      { status: 500 }
    )
  }
}
```

**What happens:**
1. Endpoint receives authenticated request (session included)
2. Checks if user already has organization (idempotent - won't create duplicates)
3. If no organization: calls `OrganizationService.createOrganizationForUser()`
4. Returns organization data

**Important:** This endpoint might fail (e.g., network error), so there's a **fallback** in the onboarding page

---

### Step 2: Onboarding Page Loads

**Location:** `app/onboarding/page.tsx`

```typescript
export default async function OnboardingPage() {
  // Verify user is logged in
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  // Fetch user's organization
  let organization = await OrganizationService.getPrimaryOrganization(
    session.user.id
  )

  // FALLBACK: If organization doesn't exist, create it now
  // This catches cases where post-signup endpoint failed
  if (!organization) {
    console.log('[v0] No organization found - creating now as fallback')
    organization = await OrganizationService.createOrganizationForUser(
      session.user.id,
      session.user.name || `${session.user.email.split('@')[0]}'s Business`,
      'retail',
      'other_retail'
    )
  }

  // If onboarding already completed, redirect to dashboard
  if (organization.onboardingCompleted) {
    redirect('/dashboard')
  }

  // Render onboarding form with organization ID
  return (
    <OnboardingLayout>
      <div className="mb-12">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-xs font-bold text-primary-foreground">I</span>
          </div>
          <span className="text-lg font-semibold text-foreground">IMARA</span>
        </div>
      </div>

      <OnboardingContainer 
        organizationId={organization.id} 
        userId={session.user.id} 
      />
    </OnboardingLayout>
  )
}
```

**What happens:**
1. **Server-side rendering** - page loads on server, not client
2. **Verify authentication** - checks user is logged in
3. **Fetch organization** - loads user's organization
4. **Safety fallback** - if missing, creates one now (catches post-signup failures)
5. **Check completion** - if onboarding already done, redirect to dashboard
6. **Pass data to form** - organization ID and user ID sent to client component

**Result:** User sees onboarding form (Step 1 of 6: "Select your business type")

---

### Step 3: User Completes Onboarding Form

**Location:** `components/onboarding/onboarding-container.tsx` (client component)

The form has 6 steps:
1. Business Type (Retail, Restaurant, Pharmacy)
2. Business Category
3. Contact Information
4. Business Location
5. Timezone & Currency
6. Summary & Confirmation

When user clicks "Complete Setup" on final step:

```typescript
// In the onboarding component (client-side)
const handleComplete = async () => {
  const response = await fetch('/api/onboarding/complete', {
    method: 'POST',
    body: JSON.stringify({
      organizationId,  // The org we're setting up
      onboardingData: {
        businessName: formData.name,
        businessType: formData.businessType,
        customCategory: formData.category,
        businessEmail: formData.email,
        phone: formData.phone,
        country: formData.country,
        timezone: formData.timezone,
        businessSize: formData.businessSize,
        businessDescription: formData.description,
      }
    })
  })
  
  if (response.ok) {
    router.push('/dashboard')  // Go to dashboard
  }
}
```

**What happens:**
1. Form validates all required fields
2. User clicks "Complete Setup"
3. Form data is sent to `/api/onboarding/complete` endpoint
4. Waits for response
5. If success: redirects to `/dashboard`

---

### Step 3A: Server Processes Onboarding Completion

**Location:** `app/api/onboarding/complete/route.ts`

```typescript
export async function POST(req: NextRequest) {
  try {
    // Verify user session
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { organizationId, onboardingData } = body

    // SECURITY: Verify user can actually access this organization
    // (prevents users from updating other people's orgs)
    const canAccess = await OrganizationService.canUserAccess(
      organizationId, 
      session.user.id
    )
    if (!canAccess) {
      console.warn(`Unauthorized onboarding attempt by user ${session.user.id}`)
      return NextResponse.json(
        { message: 'Forbidden: No access to this organization' },
        { status: 403 }
      )
    }

    // Create workspace configuration
    const workspaceConfig = WorkspaceService.createWorkspaceConfig(
      organizationId,
      onboardingData.businessType,
      onboardingData.customCategory
    )

    // Update workspace with the config
    try {
      await db
        .update(workspace)
        .set({
          config: workspaceConfig,
          updatedAt: new Date(),
        })
        .where(eq(workspace.organizationId, organizationId))
    } catch (err) {
      console.warn('[v0] Failed to update workspace config:', err)
      // Continue - workspace config not critical
    }

    // Seed starter data (categories, products, etc.)
    const seedingSuccess = await StarterDataService.seedStarterData(
      organizationId,
      workspaceConfig
    )

    // Update organization with onboarding data
    const result = await db
      .update(organization)
      .set({
        name: onboardingData.businessName,
        businessType: onboardingData.businessType,
        businessCategory: onboardingData.customCategory,
        businessEmail: onboardingData.businessEmail,
        phone: onboardingData.phone,
        country: onboardingData.country,
        timezone: onboardingData.timezone,
        businessSize: onboardingData.businessSize,
        businessDescription: onboardingData.businessDescription,
        onboardingCompleted: true,  // MARK AS COMPLETE
        onboardingStep: 6,
        updatedAt: new Date(),
      })
      .where(eq(organization.id, organizationId))
      .returning()

    return NextResponse.json({
      success: true,
      message: 'Onboarding completed',
      organization: result[0],
    })
  } catch (error) {
    console.error('[v0] Onboarding complete error:', error)
    return NextResponse.json(
      { error: 'Failed to complete onboarding' },
      { status: 500 }
    )
  }
}
```

**What happens:**
1. **Verify session** - confirm user is logged in
2. **Security check** - verify user owns this organization
3. **Create workspace config** - set up enabled modules based on business type
4. **Update workspace** - store config in database
5. **Seed starter data** - create demo categories, products, etc.
6. **Update organization** - save business details and **mark onboarding complete**
7. **Return success** - client gets response and redirects to dashboard

**Result:** Organization now has:
- ✅ User's business details (name, type, contact info, timezone, etc.)
- ✅ Workspace configuration (enabled modules)
- ✅ Starter data (categories, initial products)
- ✅ `onboardingCompleted = true` flag

---

### Step 4: Dashboard Access Granted

**Location:** `app/dashboard/layout.tsx`

```typescript
export default async function DashboardLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  // Verify user is authenticated
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  // Fetch user's organization
  const organization = await OrganizationService.getPrimaryOrganization(
    session.user.id
  )

  // Check organization exists
  if (!organization) {
    // No organization = send back to onboarding to create/setup
    redirect('/onboarding')
  }

  // Check onboarding is completed
  if (!organization.onboardingCompleted) {
    // Incomplete onboarding = send back to finish setup
    redirect('/onboarding')
  }

  // User is fully set up - render dashboard
  return (
    <DashboardLayoutClient
      userId={session.user.id}
      userName={session.user.name}
      userEmail={session.user.email}
      organizationId={organization.id}
      organizationName={organization.name}
    >
      {children}
    </DashboardLayoutClient>
  )
}
```

**What happens:**
1. **Verify authentication** - check user is logged in
2. **Load organization** - fetch user's organization
3. **Validate organization exists** - if not, redirect to onboarding
4. **Validate onboarding complete** - if not done, redirect to onboarding
5. **Pass org data to client** - dashboard components now have organization info
6. **Render dashboard** - user sees their business dashboard

**Result:** User can now access `/dashboard` and see their business data

---

## Organization Service Architecture

**Location:** `lib/services/organization-service.ts`

The `OrganizationService` is a singleton that manages all organization operations. It's designed to work with limited database infrastructure:

### Data Storage Strategy

```typescript
// In-memory cache (fast, per-server-process)
const userOrgCache = new Map<string, any>()

// Example: userId -> organization data
userOrgCache.set('user_123', {
  id: 'org_abc',
  name: 'John\'s Coffee Shop',
  businessType: 'restaurant',
  onboardingCompleted: true,
  userId: 'user_123',
  // ... other fields
})
```

### Key Methods

#### 1. Create Organization
```typescript
await OrganizationService.createOrganizationForUser(
  userId: string,
  name: string,
  businessType: string,
  businessCategory: string
)
// Returns: organization object
// Does: stores in cache immediately
```

#### 2. Get Primary Organization
```typescript
const org = await OrganizationService.getPrimaryOrganization(userId: string)
// Returns: organization object or null
// Does: queries cache/database, returns first org for user
```

#### 3. Get Organization (with auth check)
```typescript
const org = await OrganizationService.getOrganization(orgId: string, userId?: string)
// Returns: organization object or null (if user doesn't own it)
// Does: verifies ownership if userId provided
```

#### 4. Check Access (security)
```typescript
const canAccess = await OrganizationService.canUserAccess(orgId: string, userId: string)
// Returns: boolean
// Does: checks if user has access to organization
```

#### 5. Update Organization
```typescript
await OrganizationService.updateOrganization(
  orgId: string,
  userId: string,
  updates: { name?: string, businessType?: string, ... }
)
// Returns: updated organization object
// Does: verifies ownership before updating
```

#### 6. Mark Onboarding Complete
```typescript
await OrganizationService.completeOnboarding(orgId: string, userId: string)
// Returns: updated organization object
// Does: sets onboardingCompleted = true
```

---

## Request Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. SIGNUP PAGE (/sign-up)                                       │
│                                                                  │
│ User enters: name, email, password                              │
│ Clicks: "Create account"                                        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │ auth-form.tsx (client)           │
        │ Calls: authClient.signUp.email() │
        └──────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │ Better Auth API                  │
        │ Creates user in database         │
        │ Returns: session token           │
        └──────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │ auth-form.tsx (client)           │
        │ Calls: /api/auth/post-signup     │
        └──────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │ POST /api/auth/post-signup       │
        │ - Get session                    │
        │ - Create organization            │
        │ - Store in cache                 │
        └──────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │ auth-form.tsx (client)           │
        │ Redirect to: /onboarding         │
        └──────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 2. ONBOARDING PAGE (/onboarding)                                │
│                                                                  │
│ onboarding/page.tsx (server)                                    │
│ - Verify session                                                │
│ - Load organization                                             │
│ - Fallback: create org if missing                               │
│ - Render form                                                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │ OnboardingContainer (client)     │
        │ Shows: 6-step form               │
        │ - Business type                  │
        │ - Category                       │
        │ - Contact info                   │
        │ - Location                       │
        │ - Timezone                       │
        │ - Summary                        │
        └──────────────────────────────────┘
                           │
            ┌──────────────┴──────────────┐
            │ User completes all 6 steps  │
            │ Clicks: "Complete Setup"    │
            └──────────────┬──────────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │ POST /api/onboarding/complete    │
        │ - Verify session                 │
        │ - Verify user owns org           │
        │ - Update organization fields     │
        │ - Seed starter data              │
        │ - Mark onboarding complete       │
        └──────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │ onboarding-container.tsx (client)│
        │ Redirect to: /dashboard          │
        └──────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 3. DASHBOARD (/dashboard)                                       │
│                                                                  │
│ dashboard/layout.tsx (server)                                   │
│ - Verify session                                                │
│ - Load organization                                             │
│ - Check onboarding complete                                     │
│ - Render dashboard                                              │
└──────────────────────────────────────────────────────────────────┘
```

---

## Security Checks

### Authentication (Session Validation)
Every protected page/endpoint checks:
```typescript
const session = await auth.api.getSession({ headers: await headers() })
if (!session?.user) redirect('/sign-in')
```

### Authorization (Ownership Verification)
Before allowing updates:
```typescript
const canAccess = await OrganizationService.canUserAccess(orgId, userId)
if (!canAccess) {
  return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
}
```

### Idempotency (Prevent Duplicates)
Post-signup and onboarding page both check for existing org:
```typescript
const existingOrgs = await OrganizationService.getOrganizationsForUser(userId)
if (existingOrgs.length > 0) {
  return existing org // Don't create again
}
```

### Enforcement (Force Flow)
Dashboard enforces onboarding completion:
```typescript
if (!organization.onboardingCompleted) {
  redirect('/onboarding')  // Can't access dashboard until done
}
```

---

## Error Handling & Fallbacks

### Scenario 1: Post-Signup Fails
**What happens:**
1. Auth form catches error and logs warning
2. Continues to redirect to onboarding anyway
3. Onboarding page sees no org and creates one (fallback)

```
User signs up → Post-signup fails → Redirect to onboarding
                                      → Onboarding creates org (fallback)
```

### Scenario 2: User Closes Browser During Onboarding
**What happens:**
1. User returns and visits `/onboarding`
2. Session still valid (cookie persists)
3. Organization still exists from before
4. Can resume onboarding form

```
User starts onboarding → Closes browser
→ User returns → Session still valid
→ Organization still exists → Can resume
```

### Scenario 3: User Tries to Access Dashboard Before Onboarding
**What happens:**
1. Dashboard layout checks `onboardingCompleted`
2. Automatically redirects to `/onboarding`
3. User can't access dashboard until done

```
User tries /dashboard → onboardingCompleted = false
→ Redirect to /onboarding → Force completion
```

---

## Data Persistence

### In-Memory Cache
```typescript
const userOrgCache = new Map<string, any>()
```

- **Pros:** Very fast, no database queries
- **Cons:** Data lost when server restarts
- **Use case:** Development, MVP, caching between requests

### Database
```typescript
await db.select().from(organization).where(eq(organization.userId, userId))
```

- **Pros:** Persistent, survives server restarts
- **Cons:** Slower than cache, requires database setup
- **Use case:** Production, when migrations run

### Hybrid Approach
Service tries database first, falls back to cache:
```typescript
try {
  // Try database query
  const result = await db.select().from(organization)...
  return result
} catch (err) {
  // Fall back to cache if database query fails
  return userOrgCache.get(userId)
}
```

---

## Testing the Flow

### Test Sign-Up to Dashboard
1. Go to http://localhost:3000
2. Click "Get Started"
3. Fill signup form:
   - Name: "Test User"
   - Email: "test@example.com"
   - Password: "TestPass123"
4. Click "Create account"
5. Wait for redirect to `/onboarding`
6. Complete all 6 onboarding steps
7. Click "Complete Setup"
8. Should redirect to `/dashboard`

### Expected Console Logs
```
[v0] Created organization in cache: { userId: '...', orgId: '...', name: '...' }
[v0] Post-signup success
[v0] Organization found for user
[v0] Onboarding complete - redirecting to dashboard
```

---

## Summary

The system now works as follows:

1. **Sign-Up** → User creates account + organization is created
2. **Organization Service** → Manages org lifecycle with cache/database hybrid
3. **Onboarding Page** → Loads org, creates fallback if missing, prevents duplicate orgs
4. **Onboarding Form** → 6-step business setup with validation
5. **Completion** → Marks org as complete, seeds data, updates database
6. **Dashboard** → Enforces onboarding completion, shows business data

All steps include **security checks**, **error handling**, and **fallbacks** to ensure a smooth user experience even when components fail.
