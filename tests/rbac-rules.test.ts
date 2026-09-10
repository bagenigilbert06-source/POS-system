import assert from 'node:assert/strict';
import {
  ASSIGNABLE_ROLES,
  STAFF_MANAGED_ROLES,
  canAssignRole,
  canManageExistingRole,
  isStaffManagedRole,
  PermissionEnum,
  ROLE_PERMISSIONS,
  RoleEnum,
} from '../lib/types/permissions';
import { canAccessBranch } from '../lib/auth/branch-access';

const has = (role: RoleEnum, permission: PermissionEnum) =>
  ROLE_PERMISSIONS[role].includes(permission);

for (const permission of [
  PermissionEnum.INVENTORY_RECEIVE,
  PermissionEnum.INVENTORY_ADJUST,
  PermissionEnum.INVENTORY_TRANSFER,
  PermissionEnum.INVENTORY_ADJUST_APPROVE,
  PermissionEnum.INVENTORY_COUNT_APPROVE,
  PermissionEnum.SHIFT_MANAGE,
  PermissionEnum.SALE_REFUND,
  PermissionEnum.REPORT_EXPORT,
]) assert.equal(has(RoleEnum.STORE_MANAGER, permission), true, `store managers require ${permission}`);
assert.equal(has(RoleEnum.STORE_MANAGER, PermissionEnum.CATALOG_VIEW), true);
assert.equal(has(RoleEnum.STORE_MANAGER, PermissionEnum.CATALOG_CREATE), false);
assert.equal(has(RoleEnum.STORE_MANAGER, PermissionEnum.CATALOG_EDIT), false);
assert.equal(has(RoleEnum.STORE_MANAGER, PermissionEnum.CATALOG_ARCHIVE), false);

for (const permission of [
  PermissionEnum.ADMIN_ACCESS,
  PermissionEnum.OWNER_ACCESS,
  PermissionEnum.SETTINGS_EDIT,
  PermissionEnum.SETTINGS_MANAGE_USERS,
  PermissionEnum.FINANCE_MANAGE,
  PermissionEnum.ETIMS_CONFIGURE,
  PermissionEnum.ETIMS_MANAGE,
]) assert.equal(has(RoleEnum.STORE_MANAGER, permission), false, `store managers must not receive ${permission}`);

assert.equal(canAccessBranch({ isOrganizationWide: false, branchIds: ['branch-a'] }, 'branch-a'), true);
assert.equal(canAccessBranch({ isOrganizationWide: false, branchIds: ['branch-a'] }, 'branch-b'), false);
assert.equal(canAssignRole(RoleEnum.STORE_MANAGER, RoleEnum.ADMIN), false);
assert.equal(canAssignRole(RoleEnum.STORE_MANAGER, RoleEnum.STORE_MANAGER), false);
assert.equal(canAssignRole(RoleEnum.STORE_MANAGER, RoleEnum.CASHIER), true);

assert.equal(
  has(RoleEnum.CASHIER, PermissionEnum.POS_SELL),
  true,
  'cashiers must be able to sell'
);
assert.equal(
  has(RoleEnum.CASHIER, PermissionEnum.FINANCE_VIEW),
  false,
  'cashiers must not see finance'
);
assert.equal(
  has(RoleEnum.CASHIER, PermissionEnum.INVENTORY_VIEW),
  false,
  'cashiers must not access the inventory workspace'
);
assert.equal(
  has(RoleEnum.CASHIER, PermissionEnum.REPORT_VIEW),
  false,
  'cashiers must not access business reports'
);
assert.equal(
  has(RoleEnum.CASHIER, PermissionEnum.PRODUCT_EDIT),
  false,
  'cashiers must not manage the product catalogue'
);
assert.equal(has(RoleEnum.CASHIER, PermissionEnum.CUSTOMER_VIEW), true, 'cashiers need customer lookup during checkout');
assert.equal(has(RoleEnum.CASHIER, PermissionEnum.CUSTOMER_CREATE), true, 'cashiers need to add checkout customers');
assert.equal(has(RoleEnum.CASHIER, PermissionEnum.ATTENDANCE_USE), true, 'cashiers must record their work time');
assert.equal(has(RoleEnum.CASHIER, PermissionEnum.ATTENDANCE_VIEW_OWN), true, 'cashiers must review their own attendance');
assert.equal(has(RoleEnum.CASHIER, PermissionEnum.ATTENDANCE_VIEW_ALL), false, 'cashiers must not see team attendance');
assert.equal(has(RoleEnum.CASHIER, PermissionEnum.SALES_VIEW_OWN), true, 'cashiers need their own receipt history');
assert.equal(
  has(RoleEnum.CASHIER, PermissionEnum.SALE_REFUND),
  false,
  'cashiers must not refund without elevated permission'
);
assert.equal(
  has(RoleEnum.SUPERVISOR, PermissionEnum.SHIFT_MANAGE),
  true,
  'supervisors must manage shifts'
);
assert.equal(
  has(RoleEnum.SUPERVISOR, PermissionEnum.INVENTORY_ADJUST),
  true,
  'supervisors must be able to record operational stock losses'
);
assert.equal(
  has(RoleEnum.SUPERVISOR, PermissionEnum.PRESCRIPTION_VIEW),
  true,
  'pharmacy supervisors must review prescription records'
);
assert.equal(
  has(RoleEnum.SUPERVISOR, PermissionEnum.BATCH_TRACKING_VIEW),
  true,
  'pharmacy supervisors must review batches and expiry'
);
assert.equal(
  has(RoleEnum.MANAGER, PermissionEnum.PRESCRIPTION_DISPENSE),
  true,
  'pharmacy managers must be able to cover prescription checkout'
);
assert.equal(
  has(RoleEnum.INVENTORY, PermissionEnum.INVENTORY_ADJUST),
  true,
  'inventory staff must adjust inventory'
);
assert.equal(
  has(RoleEnum.INVENTORY, PermissionEnum.INVENTORY_RECEIVE),
  true,
  'inventory staff must receive externally obtained stock'
);
assert.equal(
  has(RoleEnum.INVENTORY, PermissionEnum.INVENTORY_COUNT_START),
  true,
  'inventory staff must start count sessions'
);
assert.equal(
  has(RoleEnum.INVENTORY, PermissionEnum.INVENTORY_COUNT_APPROVE),
  true,
  'inventory staff may approve another user count'
);
assert.equal(
  has(RoleEnum.SUPERVISOR, PermissionEnum.INVENTORY_COUNT_APPROVE),
  false,
  'supervisors must not approve stock counts'
);
assert.equal(
  has(RoleEnum.MANAGER, PermissionEnum.INVENTORY_EXPORT),
  true,
  'managers must export filtered inventory records'
);
assert.equal(
  has(RoleEnum.INVENTORY, PermissionEnum.FINANCE_VIEW),
  false,
  'inventory staff must not see finance'
);
assert.equal(
  has(RoleEnum.ACCOUNTANT, PermissionEnum.FINANCE_VIEW),
  true,
  'accountants must see finance'
);
assert.equal(
  has(RoleEnum.ACCOUNTANT, PermissionEnum.POS_SELL),
  false,
  'accountants must not operate POS by default'
);
assert.equal(
  has(RoleEnum.MANAGER, PermissionEnum.STAFF_MANAGE),
  true,
  'managers must be able to create and manage permitted staff roles'
);
assert.equal(
  has(RoleEnum.MANAGER, PermissionEnum.INVENTORY_ADJUST),
  true,
  'managers must be able to count, correct, and approve stock'
);
assert.equal(
  has(RoleEnum.MANAGER, PermissionEnum.INVENTORY_RECEIVE),
  true,
  'managers must be able to receive replenishment stock'
);
assert.equal(
  has(RoleEnum.MANAGER, PermissionEnum.SALE_REFUND),
  true,
  'managers must handle returns and refunds'
);
assert.equal(
  has(RoleEnum.MANAGER, PermissionEnum.FINANCE_VIEW),
  true,
  'managers must see branch financial performance'
);
assert.equal(
  has(RoleEnum.MANAGER, PermissionEnum.SETTINGS_VIEW),
  false,
  'managers must not see organization configuration'
);
assert.equal(
  has(RoleEnum.MANAGER, PermissionEnum.ADMIN_ACCESS),
  false,
  'managers must not access administration'
);
assert.equal(
  has(RoleEnum.ADMIN, PermissionEnum.SETTINGS_EDIT),
  true,
  'admins must configure the organization'
);
assert.equal(
  has(RoleEnum.ADMIN, PermissionEnum.OWNER_ACCESS),
  false,
  'admins must not receive ownership-only controls'
);
assert.equal(
  has(RoleEnum.OWNER, PermissionEnum.STAFF_MANAGE),
  true,
  'owners must administer access'
);
assert.equal(
  has(RoleEnum.OWNER, PermissionEnum.OWNER_ACCESS),
  true,
  'owners retain ownership-only controls'
);
assert.equal(
  canAssignRole(RoleEnum.MANAGER, RoleEnum.ADMIN),
  false,
  'managers must never create administrators'
);
assert.equal(
  canAssignRole(RoleEnum.MANAGER, RoleEnum.MANAGER),
  false,
  'managers must never promote staff to manager'
);
assert.equal(
  canAssignRole(RoleEnum.ADMIN, RoleEnum.MANAGER),
  true,
  'admins must create branch managers'
);
assert.equal(
  canAssignRole(RoleEnum.ADMIN, RoleEnum.ADMIN),
  false,
  'admins must never create another administrator'
);
assert.equal(
  canAssignRole(RoleEnum.OWNER, RoleEnum.ADMIN),
  false,
  'owners must not create admins through Staff & Access'
);
assert.equal(
  isStaffManagedRole(RoleEnum.ADMIN),
  false,
  'admin must be rejected as a managed staff role'
);
assert.equal(
  canManageExistingRole(RoleEnum.ADMIN, RoleEnum.ADMIN),
  false,
  'admins must not alter the primary administrator through staff management'
);
assert.equal(
  canManageExistingRole(RoleEnum.OWNER, RoleEnum.ADMIN),
  false,
  'owners must not alter the primary administrator through staff management'
);
assert.equal(
  canManageExistingRole(RoleEnum.MANAGER, RoleEnum.CASHIER),
  true,
  'managers must manage branch cashiers'
);
assert.deepEqual(
  ASSIGNABLE_ROLES[RoleEnum.ADMIN],
  STAFF_MANAGED_ROLES,
  'admins may assign exactly the five managed staff roles'
);
for (const role of [
  RoleEnum.SUPERVISOR,
  RoleEnum.CASHIER,
  RoleEnum.INVENTORY,
  RoleEnum.ACCOUNTANT,
]) {
  assert.equal(
    ASSIGNABLE_ROLES[role].length,
    0,
    `${role} must not assign any staff role`
  );
}

console.log('RBAC rules unit test passed');
