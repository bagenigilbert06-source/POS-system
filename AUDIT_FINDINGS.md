# POS Implementation - Comprehensive Audit Report

## Executive Summary

**VERDICT: NOT READY FOR STAGING**

The implementation has critical production safety issues that must be fixed before any deployment. Issues range from missing idempotency protection to unsafe concurrent stock deduction.

---

## 1. CHANGED FILES VERIFICATION

### app/actions/sales.ts
**Status**: Partially implemented

**What Changed:**
- Added `createSale()` function with server-side tax, discount, and stock validation
- Server recalculates tax based on `businessSettings` instead of hardcoded value
- Validates payment method against enabled methods
- Uses atomic database transaction (Drizzle `tx`)
- Creates audit event for each sale
- Accepts `amountReceived` parameter for cash change calculation

**What's Missing:**
- NO idempotency key field in schema
- NO idempotency checking in code
- Stock update uses read-then-update pattern (unsafe)
- No row locking or conditional update

### app/actions/business.ts
**Status**: Working correctly

**What Changed:**
- New file that loads business settings from database
- Returns safe defaults if settings missing
- Authenticates user and scopes to organization

### app/dashboard/pos/page.tsx
**Status**: Working correctly

**What Changed:**
- Loads business settings alongside products and customers
- Passes settings to POSTerminal component

### components/pos/pos-terminal.tsx
**Status**: Partially implemented

**What Changed:**
- Accepts settings prop with tax configuration
- Uses settings tax rate instead of hardcoded 0.16
- Discount only: fixed amount, NOT percentage
- Barcode scanner detection (buffers Enter-terminated input)
- Category filtering by categoryId
- Customer quick creation inline
- Shows payment method status (pending for M-Pesa/Card)

---

## 2. REAL IDEMPOTENCY VERIFICATION

**REAL IDEMPOTENCY IS NOT IMPLEMENTED**

### Required Items Missing:
- ❌ Client-generated idempotency key
- ❌ Idempotency key passed to server
- ❌ Database field storing key
- ❌ Database constraint or index on key
- ❌ Server logic searching for existing completed sale
- ❌ Safe handling for simultaneous identical requests
- ❌ Response returning existing sale on duplicate

### Current Protection:
- Processing button disabled during request
- Toast message on error
- **NOT sufficient for production**

### Risks:
- Double-click creates two sales
- Browser back + submit creates new sale
- Automatic retries create duplicates
- Two tabs/windows can submit simultaneously

### Fix Required:
Add idempotency key to sale table and implement checking logic before createSale commits.

---

## 3. STOCK CONCURRENCY SAFETY

**UNSAFE PATTERN CONFIRMED**

Current code in sales.ts (lines 105-115):
```typescript
// Line 105: Read stock
const [current] = await tx.select({ stock: product.stock, name: product.name })
  .from(product)
  .where(and(eq(product.id, item.productId), eq(product.orgId, orgId)))
  .limit(1)

// Line 108: Check quantity
if (current.stock < item.quantity) throw new Error(...)

// Line 114: Update stock later
await tx.update(product)
  .set({ stock: sql`${product.stock} - ${item.quantity}` })
  .where(and(eq(product.id, item.productId), eq(product.orgId, orgId)))
```

### Problem:
Two transactions can both read stock=10, both check quantity=5, both update. Result: stock becomes -10 (oversell).

### Why Current Code Doesn't Protect:
- Uses Drizzle transaction but only for atomicity of multiple statements
- Does NOT use conditional update
- Does NOT use row locking
- Does NOT use serializable isolation

### Fix Required:
Change update to conditional:
```typescript
const result = await tx.update(product)
  .set({ stock: sql`${product.stock} - ${item.quantity}` })
  .where(and(
    eq(product.id, item.productId),
    eq(product.orgId, orgId),
    gte(product.stock, item.quantity)  // Conditional!
  ))

if (!result.rowsAffected) throw new Error('Stock unavailable')
```

---

## 4. TAX CONFIGURATION VERIFICATION

**Partially Complete**

### Hardcoded 16% Removal:
✅ Removed from `components/pos/pos-terminal.tsx`
✅ Removed from `app/actions/sales.ts`
❌ Still present in `components/receipt/receipt-template.tsx` line with "Tax (16%)"

### Dynamic Tax Loading:
✅ Loads from `businessSettings` table
✅ Server-side authority maintained
✅ Client tax calculation shown but server overrides

### Tax Configuration Supported:
✅ Tax enabled/disabled flag
✅ Tax rate from settings
✅ Tax name (VAT, GST, Tax, etc.)
✅ Tax-inclusive vs tax-exclusive
✅ Show tax on receipt toggle

### Missing:
- Product-level tax exemption NOT supported
- Tax classes NOT supported
- Multiple tax rates NOT supported

### Safe Defaults:
✅ Returns 0% tax if settings missing
✅ Returns false for taxEnabled if missing

### Calculation Rule Verification:
**Client** (POS component):
```
taxAmount = applyTax && taxEnabled ? subtotal * (taxRate/100) : 0
```

**Server** (sales action):
```
const rate = taxEnabled ? taxRate/100 : 0
const calculatedTax = rate > 0 
  ? (pricesIncludeTax ? subtotal - (subtotal/(1+rate)) : subtotal * rate)
  : 0
```

**Issue**: Client doesn't implement tax-inclusive calculation. Server is authoritative but client only shows client-calculated amount in preview.

---

## 5. DISCOUNT SUPPORT VERIFICATION

**Only Fixed Discount Implemented**

### Implemented:
✅ Cart fixed discount (amount input)
✅ Discount validation: 0 to (subtotal + tax)
✅ Discount shown on receipt
✅ Discount in audit metadata

### NOT Implemented:
❌ Cart percentage discount
❌ Item fixed discount
❌ Item percentage discount
❌ Discount permission check
❌ Discount reason/notes
❌ Discount audit separate event

### Current Implementation:
- Single input field in UI takes fixed amount
- Frontend enforces max = subtotal + tax
- Server recalculates and re-validates

### Missing:
- Percentage discount not in UI
- No discount type selector
- No per-item discounts

---

## 6. PAYMENT METHOD ENFORCEMENT

**Partially Implemented**

### Server Validation:
✅ Loads enabled payment methods from business settings
✅ Rejects payment method if not in allowed list
✅ Throws error: "Payment method not enabled for this workspace"

### Cash Method:
✅ Validates amountReceived >= total
✅ Calculates change

### M-Pesa & Card:
⚠️ Accepted by server but no real integration
⚠️ M-Pesa: Accepts manual reference number only
⚠️ Card: No validation or API call
⚠️ Both marked as "Integration pending" in UI

### Issue:
Server doesn't prevent a disabled payment method if client code is modified. Only checks if method is in the allowed array—doesn't validate that the method is actually implemented.

---

## 7. CASH DATA STORAGE

**Partially Addressed**

### Where Values Are Stored:

| Value | Location | Field | Storage |
|-------|----------|-------|---------|
| Payment Method | sale table | paymentMethod | Direct field ✅ |
| Amount Received | Calculated only | (none) | NOT stored ❌ |
| Change Due | Calculated only | (none) | NOT stored ❌ |
| Final Amount Paid | sale table | total | Correct field ✅ |
| Payment Reference (M-Pesa) | sale table | mpesaRef | Direct field ✅ |

### Issue:
Amount received and change are calculated in frontend but NOT stored in database. If audit or customer inquiry needed later, this data is lost.

### Problem:
Cannot verify if customer paid exact amount, overpaid, or if cashier gave correct change.

### Fix Required:
Add fields to sale table:
- `amountReceived: numeric` (cash only)
- `change: numeric` (cash only)

---

## 8. CUSTOMER CREATION VERIFICATION

**Working Correctly**

### Authentication:
✅ Requires user session
✅ Throws "Unauthorized" if no session

### Organisation Scope:
✅ Loads user's primary organization
✅ Creates customer in that organization
✅ Cannot access other organizations

### Permission Checks:
✅ POS module enabled check
✅ Creates in correct org

### Server Validation:
✅ Phone normalization: NOT implemented (accepts as-is)
✅ Email validation: NOT implemented (accepts any string)
✅ Duplicate phone handling: NO database constraint (allowed)
✅ Duplicate email handling: NO database constraint (allowed)

### Error Messages:
✅ Generic error handling
✅ Toast on success/failure

### Automatic Selection:
✅ New customer auto-selected after creation
✅ Form clears for next entry

### Issue:
No duplicate prevention. Same phone can be entered twice. No email format validation.

---

## 9. ORGANISATION AND BRANCH ISOLATION

**Verified Working**

### Product Scope:
✅ Loaded by org: `products.filter(p => p.orgId === orgId)`
✅ Server verifies on each product query

### Customer Scope:
✅ Customers org-scoped
✅ Quick-create stores correct org

### Business Settings Scope:
✅ Loaded by org: `where(eq(organizationId, orgId))`

### Sale Scope:
✅ Created with correct org
✅ Retrieved filtered by org
✅ Cannot access other org sales

### Stock Movement Scope:
✅ Created with correct org

### Branch Isolation:
❌ No branch concept in current schema
❌ All sales treated equally regardless of location
❌ No branch/counter/register selection

### Verification Path:
- Each action verifies: `orgId = await getOrgId(userId)`
- All database queries filter by: `where(eq(table.orgId, orgId))`
- Cannot manipulate org via client IDs

---

## 10. PERMISSION CHECKS

**Insufficient Granularity**

### Existing Role/Permission System:
- User table has no role field in code
- Organization membership determines access
- Module enablement flags exist (pos, sales, customers, etc.)

### Current Permission Enforcement:

| Action | Check | File |
|--------|-------|------|
| POS Access | Module "pos" enabled | sales.ts getOrgId() |
| Sale Creation | Module "pos" enabled | sales.ts getOrgId() |
| Customer Creation | (none) | customers.ts (not shown) |
| Discount Application | (none) - client only | pos-terminal.tsx |
| Receipt Reprint | (none) | (not implemented) |

### Missing:
- No granular discount permission
- No receipt reprint permission
- No role-based (cashier, manager, admin) checks
- No audit of who applied discount

### Fix Required:
Implement role-based permissions system:
- Define roles: cashier, manager, admin
- Store role in user or organization_user table
- Check permission before allowing discount > threshold
- Check permission for receipt modifications

---

## 11. AUDIT LOGGING

**Partially Implemented**

### Logging Inside Transaction:
✅ Audit event created INSIDE sale transaction
✅ If sale commits, audit commits
✅ If sale rolls back, audit rolls back
✅ Atomically consistent

### Audit Metadata Captured:
✅ saleId, receiptNo
✅ subtotal, tax, discount, total
✅ items count, payment method
✅ Not stored: amount received, change, customer name

### Audit Events Currently Logged:
- `sale_created` only

### Sensitive Data Check:
✅ No authentication tokens
✅ No payment secrets
✅ No full card info
✅ Customer ID stored but name not included

### Missing Audit Events:
- Customer creation NOT logged
- Discount application NOT logged separately
- Receipt reprint NOT logged
- Failed permission checks NOT logged

### Fix Required:
Add separate audit events for:
- `customer_created` with user ID and name
- `discount_applied` with reason
- `receipt_printed` with reference
- `permission_denied` with action and reason

---

## 12. RECEIPT PRINTING

**NOT IMPLEMENTED**

Current State:
- ✅ Receipt data displayed in overlay modal
- ✅ Receipt loaded from cart state
- ❌ Print button shows but no handler
- ❌ No thermal printer CSS
- ❌ No print stylesheet
- ❌ Cannot reprint from history
- ❌ Print doesn't fetch from database

### Issues:
1. Refreshing page loses receipt overlay (only in client state)
2. Cannot reprint sale from history
3. Printing uses cart state, not persisted sale data
4. No print-specific styling

### Fix Required:
1. Implement receipt view by sale ID
2. Add print CSS (thermal formatting)
3. Implement print handler that fetches sale from database
4. Allow reprinting from sales history

---

## 13. ERROR RECOVERY

**Limited Error Handling**

### Scenarios Tested:

| Scenario | Behavior | Result |
|----------|----------|--------|
| Product deactivated after cart | Cart still shows | ⚠️ Proceeds - frontend doesn't check |
| Product price changes | Server uses current price? | ⚠️ Unknown - not validated |
| Stock changes | Server validates at checkout | ✅ Error thrown if insufficient |
| Customer deleted | Checkout proceeds | ⚠️ orphaned customer ID |
| Business settings missing | Uses safe defaults | ✅ Checkout works |
| DB transaction fails | Transaction rolls back, error thrown | ✅ Cart preserved |
| Network fails before request | Error toast shown | ✅ Cart preserved |
| Network fails after sale completes | Unclear | ❌ No idempotency, may retry |
| Receipt print fails | Receipt shown, no print | ⚠️ Not tested |

### Issues:
- No price validation - product price could change
- No active status check on checkout
- No customer existence check
- Customer deletion doesn't cascade

---

## 14. REAL CHECKS - BUILD OUTPUT

### TypeScript Check:
```bash
$ npx tsc --noEmit
# Result: No errors (verified)
```

### Lint Check:
(Not run - no lint script in package.json output)

### Production Build:
```bash
$ npm run build
# Result: Successful (verified in previous run)
```

### Code Quality Checks:

| Issue | Status |
|-------|--------|
| `any` types | ✅ None found |
| `@ts-ignore` | ✅ None found |
| `@ts-expect-error` | ✅ None found |
| Hardcoded 0.16 | ❌ FOUND in `receipt-template.tsx` |
| Hardcoded "16" | ✅ Only in CSS (0.16em tracking) |
| TODO comments | ✅ None found |
| Placeholder code | ❌ "Integration pending" for M-Pesa/Card |
| Mock data | ✅ None found |
| Console logging | ✅ None found |

### Critical Issue Found:
File `components/receipt/receipt-template.tsx` contains hardcoded "Tax (16%)"

---

## 15. SCENARIO TESTS - NOT RUN

All 25 scenarios listed in requirements were NOT executed. Cannot verify:

1. Product name search - untested
2. SKU search - untested
3. Exact barcode scan - barcode logic coded but not tested
4. Unknown barcode - error handling exists but untested
5. Add duplicate product - increments qty but untested
6. Quantity above stock - validation exists but untested
7. Fixed discount - implemented but untested
8. Percentage discount - NOT IMPLEMENTED
9. Discount above subtotal - validation exists but untested
10. Cash below total - validation exists but untested
11. Exact cash - calculation exists but untested
12. Cash above total - change calculation exists but untested
13. Successful sale - transaction logic exists but untested
14. Stock deduction - UNSAFE CODE not tested
15. Stock movement record - code exists but untested
16. Double-click submission - button disabled but untested
17. Same idempotency key twice - NOT IMPLEMENTED
18. Two simultaneous for final stock - UNSAFE untested
19. Unauthorised role attempt - role system NOT IMPLEMENTED
20. Cross-org product attempt - org isolation coded but untested
21. Disabled payment method - validation exists but untested
22. Customer quick creation - code implemented but untested
23. Duplicate customer - NO constraint NOT tested
24. Receipt reprint - NOT IMPLEMENTED

---

## CRITICAL ISSUES SUMMARY

| # | Issue | Severity | Component | Fix Effort |
|---|-------|----------|-----------|-----------|
| 1 | NO idempotency protection | CRITICAL | sales.ts | Medium |
| 2 | Unsafe stock deduction pattern | CRITICAL | sales.ts | Low |
| 3 | Hardcoded "Tax (16%)" still exists | HIGH | receipt-template.tsx | Low |
| 4 | Amount received NOT stored | HIGH | schema + sales.ts | Medium |
| 5 | No percentage discount | MEDIUM | pos-terminal.tsx | Low |
| 6 | Receipt print NOT implemented | MEDIUM | pos-terminal.tsx | High |
| 7 | No per-product price/status validation | MEDIUM | sales.ts | Low |
| 8 | No duplicate customer prevention | MEDIUM | schema | Low |
| 9 | No discount permission checks | MEDIUM | sales.ts | Medium |
| 10 | No email/phone validation | LOW | customers.ts | Low |

---

## REQUIRED FINAL VERDICT

**VERDICT: NOT READY FOR STAGING**

### Reasons:
1. ❌ Real idempotency NOT implemented - double sales possible
2. ❌ Stock deduction uses unsafe read-then-update pattern
3. ❌ Hardcoded "16%" still in code
4. ❌ Amount received not stored in database
5. ❌ Receipt printing not implemented
6. ❌ Percentage discount not implemented
7. ❌ No per-item price/status validation at checkout
8. ❌ Role-based permissions not implemented
9. ❌ Duplicate customer prevention missing
10. ❌ Scenarios 1-25 not tested

### For STAGING Readiness Requires:
1. Implement idempotency with unique constraint
2. Fix stock deduction to conditional update
3. Remove remaining hardcoded "16%"
4. Add amountReceived and change to sale table
5. Implement receipt printing with database fetch
6. Add percentage discount UI and logic
7. Validate product price/status at checkout
8. Implement and test role-based discount permissions
9. Add unique constraint for customer phone
10. Run and document all 25 scenario tests

