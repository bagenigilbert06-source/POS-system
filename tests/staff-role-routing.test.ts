import assert from 'node:assert/strict'
import { resolveUserLandingDestination } from '../lib/auth/role-routing'
import { PermissionEnum, ROLE_PERMISSIONS, RoleEnum } from '../lib/types/permissions'

const has = (role: RoleEnum, permission: PermissionEnum) => ROLE_PERMISSIONS[role].includes(permission)

const landing=(role:RoleEnum)=>resolveUserLandingDestination({role,permissions:ROLE_PERMISSIONS[role]})
assert.equal(landing(RoleEnum.OWNER), '/dashboard')
assert.equal(landing(RoleEnum.ADMIN), '/dashboard')
assert.equal(landing(RoleEnum.MANAGER), '/dashboard')
assert.equal(landing(RoleEnum.SUPERVISOR), '/dashboard/operations')
assert.equal(landing(RoleEnum.CASHIER), '/dashboard/pos')
assert.equal(landing(RoleEnum.INVENTORY), '/dashboard/inventory')
assert.equal(landing(RoleEnum.ACCOUNTANT), '/dashboard/financials')
assert.equal(landing(RoleEnum.PHARMACIST), '/dashboard/pos')
assert.equal(landing(RoleEnum.PHARMACY_STAFF), '/dashboard/pos')
assert.equal(resolveUserLandingDestination({role:RoleEnum.STAFF,permissions:[]}), '/restricted')
assert.equal(resolveUserLandingDestination({role:RoleEnum.STAFF,permissions:[PermissionEnum.INVENTORY_VIEW]}), '/dashboard/inventory')
assert.equal(resolveUserLandingDestination({role:RoleEnum.STAFF,permissions:[PermissionEnum.FINANCE_VIEW]}), '/dashboard/financials')
assert.equal(resolveUserLandingDestination({role:RoleEnum.STAFF,permissions:[PermissionEnum.POS_VIEW]}), '/dashboard/pos')

for (const role of [RoleEnum.MANAGER, RoleEnum.SUPERVISOR, RoleEnum.CASHIER, RoleEnum.PHARMACIST, RoleEnum.PHARMACY_STAFF]) {
  assert.equal(has(role, PermissionEnum.POS_VIEW), true, `${role} must open the pharmacy POS`)
  assert.equal(has(role, PermissionEnum.POS_SELL), true, `${role} must complete pharmacy sales`)
  assert.equal(has(role, PermissionEnum.SHIFT_OPEN), true, `${role} must open a register shift`)
  assert.equal(has(role, PermissionEnum.SHIFT_CLOSE), true, `${role} must close a register shift`)
  assert.equal(has(role, PermissionEnum.PRESCRIPTION_DISPENSE), true, `${role} must support prescription checkout`)
}

assert.equal(has(RoleEnum.MANAGER, PermissionEnum.PHARMACY_RESTRICTED_APPROVE), true)
assert.equal(has(RoleEnum.PHARMACIST, PermissionEnum.PHARMACY_RESTRICTED_APPROVE), true)
assert.equal(has(RoleEnum.SUPERVISOR, PermissionEnum.PHARMACY_RESTRICTED_APPROVE), false)
assert.equal(has(RoleEnum.CASHIER, PermissionEnum.PHARMACY_RESTRICTED_APPROVE), false)
assert.equal(has(RoleEnum.CASHIER, PermissionEnum.PRESCRIPTION_VIEW), false, 'cashiers must not browse the prescription register')
assert.equal(has(RoleEnum.PHARMACY_STAFF, PermissionEnum.PRESCRIPTION_VIEW), false, 'pharmacy assistants must not browse all prescription records')
assert.equal(has(RoleEnum.MANAGER, PermissionEnum.PHARMACY_BATCH_MANAGE), true)
assert.equal(has(RoleEnum.PHARMACIST, PermissionEnum.PHARMACY_BATCH_MANAGE), true)
assert.equal(has(RoleEnum.SUPERVISOR, PermissionEnum.PHARMACY_BATCH_MANAGE), false, 'supervisors may review but not release or dispose medicine batches')
assert.equal(has(RoleEnum.PHARMACIST, PermissionEnum.PHARMACY_RECALL_MANAGE), true)

console.log('Pharmacy staff routing and permissions test passed')
