import assert from 'node:assert/strict'
import { PermissionEnum, ROLE_PERMISSIONS, RoleEnum } from '../lib/types/permissions'

const has = (role: RoleEnum, permission: PermissionEnum) => ROLE_PERMISSIONS[role].includes(permission)

assert.equal(has(RoleEnum.CASHIER, PermissionEnum.POS_SELL), true, 'cashiers must be able to sell')
assert.equal(has(RoleEnum.CASHIER, PermissionEnum.FINANCE_VIEW), false, 'cashiers must not see finance')
assert.equal(has(RoleEnum.CASHIER, PermissionEnum.INVENTORY_VIEW), false, 'cashiers must not access the inventory workspace')
assert.equal(has(RoleEnum.CASHIER, PermissionEnum.REPORT_VIEW), false, 'cashiers must not access business reports')
assert.equal(has(RoleEnum.CASHIER, PermissionEnum.PRODUCT_EDIT), false, 'cashiers must not manage the product catalogue')
assert.equal(has(RoleEnum.CASHIER, PermissionEnum.SALE_REFUND), false, 'cashiers must not refund without elevated permission')
assert.equal(has(RoleEnum.SUPERVISOR, PermissionEnum.SHIFT_MANAGE), true, 'supervisors must manage shifts')
assert.equal(has(RoleEnum.SUPERVISOR, PermissionEnum.INVENTORY_ADJUST), true, 'supervisors must be able to record operational stock losses')
assert.equal(has(RoleEnum.INVENTORY, PermissionEnum.INVENTORY_ADJUST), true, 'inventory staff must adjust inventory')
assert.equal(has(RoleEnum.INVENTORY, PermissionEnum.FINANCE_VIEW), false, 'inventory staff must not see finance')
assert.equal(has(RoleEnum.ACCOUNTANT, PermissionEnum.FINANCE_VIEW), true, 'accountants must see finance')
assert.equal(has(RoleEnum.ACCOUNTANT, PermissionEnum.POS_SELL), false, 'accountants must not operate POS by default')
assert.equal(has(RoleEnum.MANAGER, PermissionEnum.STAFF_MANAGE), true, 'managers must be able to create and manage permitted staff roles')
assert.equal(has(RoleEnum.OWNER, PermissionEnum.STAFF_MANAGE), true, 'owners must administer access')

console.log('RBAC rules unit test passed')
