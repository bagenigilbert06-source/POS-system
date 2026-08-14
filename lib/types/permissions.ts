/**
 * Permission and Role Types
 * RBAC (Role-Based Access Control) system
 */

export enum PermissionEnum {
  // POS & shifts
  POS_VIEW = 'pos:view',
  POS_SELL = 'pos:sell',
  POS_HOLD = 'pos:hold',
  POS_DISCOUNT = 'pos:discount',
  POS_VOID = 'pos:void',
  POS_PIN_USE = 'pos:pin-use',
  POS_PIN_RESET = 'pos:pin-reset',
  POS_LOCK = 'pos:lock',
  POS_SWITCH_USER = 'pos:switch-user',
  SHIFT_OPEN = 'shift:open',
  SHIFT_CLOSE = 'shift:close',
  SHIFT_MANAGE = 'shift:manage',
  // Products
  PRODUCT_VIEW = 'product:view',
  PRODUCT_CREATE = 'product:create',
  PRODUCT_EDIT = 'product:edit',
  PRODUCT_DELETE = 'product:delete',
  PRODUCT_EXPORT = 'product:export',

  // Sales & Orders
  SALE_VIEW = 'sale:view',
  SALE_CREATE = 'sale:create',
  SALE_EDIT = 'sale:edit',
  SALE_DELETE = 'sale:delete',
  SALE_REFUND = 'sale:refund',
  SALES_VIEW_OWN = 'sales:view-own',
  SALES_VIEW_ALL = 'sales:view-all',
  ORDER_VIEW = 'order:view',
  ORDER_CREATE = 'order:create',
  ORDER_EDIT = 'order:edit',
  ORDER_DELETE = 'order:delete',

  // Inventory
  INVENTORY_VIEW = 'inventory:view',
  INVENTORY_EDIT = 'inventory:edit',
  INVENTORY_TRANSFER = 'inventory:transfer',
  INVENTORY_ADJUST = 'inventory:adjust',
  PURCHASE_VIEW = 'purchase:view',
  PURCHASE_MANAGE = 'purchase:manage',

  // Customers
  CUSTOMER_VIEW = 'customer:view',
  CUSTOMER_CREATE = 'customer:create',
  CUSTOMER_EDIT = 'customer:edit',
  CUSTOMER_DELETE = 'customer:delete',

  // Reports
  REPORT_VIEW = 'report:view',
  REPORT_GENERATE = 'report:generate',
  REPORT_EXPORT = 'report:export',
  FINANCE_VIEW = 'finance:view',
  FINANCE_MANAGE = 'finance:manage',
  EXPENSE_VIEW = 'expense:view',
  EXPENSE_MANAGE = 'expense:manage',

  // Settings
  SETTINGS_VIEW = 'settings:view',
  SETTINGS_EDIT = 'settings:edit',
  SETTINGS_MANAGE_USERS = 'settings:manage-users',

  // Admin
  ADMIN_ACCESS = 'admin:access',
  OWNER_ACCESS = 'owner:access',
  AUDIT_LOG_VIEW = 'audit:log-view',
  STAFF_VIEW = 'staff:view',
  STAFF_MANAGE = 'staff:manage',

  // Restaurant Specific
  TABLE_VIEW = 'table:view',
  TABLE_EDIT = 'table:edit',
  KITCHEN_QUEUE_VIEW = 'kitchen:queue-view',
  KITCHEN_QUEUE_MANAGE = 'kitchen:queue-manage',

  // Pharmacy Specific
  PRESCRIPTION_VIEW = 'prescription:view',
  PRESCRIPTION_CREATE = 'prescription:create',
  PRESCRIPTION_DISPENSE = 'prescription:dispense',
  BATCH_TRACKING_VIEW = 'batch:tracking-view',
}

export enum RoleEnum {
  OWNER = 'owner',
  ADMIN = 'admin',
  MANAGER = 'manager',
  SUPERVISOR = 'supervisor',
  CASHIER = 'cashier',
  INVENTORY = 'inventory',
  ACCOUNTANT = 'accountant',
  STAFF = 'staff',
  CHEF = 'chef',
  PHARMACIST = 'pharmacist',
  PHARMACY_STAFF = 'pharmacy_staff',
}

export const ROLE_PERMISSIONS: Record<RoleEnum, PermissionEnum[]> = {
  [RoleEnum.OWNER]: [
    // All permissions
    PermissionEnum.PRODUCT_VIEW,
    PermissionEnum.PRODUCT_CREATE,
    PermissionEnum.PRODUCT_EDIT,
    PermissionEnum.PRODUCT_DELETE,
    PermissionEnum.PRODUCT_EXPORT,
    PermissionEnum.SALE_VIEW,
    PermissionEnum.SALE_CREATE,
    PermissionEnum.SALE_EDIT,
    PermissionEnum.SALE_DELETE,
    PermissionEnum.SALE_REFUND,
    PermissionEnum.ORDER_VIEW,
    PermissionEnum.ORDER_CREATE,
    PermissionEnum.ORDER_EDIT,
    PermissionEnum.ORDER_DELETE,
    PermissionEnum.INVENTORY_VIEW,
    PermissionEnum.INVENTORY_EDIT,
    PermissionEnum.INVENTORY_TRANSFER,
    PermissionEnum.INVENTORY_ADJUST,
    PermissionEnum.CUSTOMER_VIEW,
    PermissionEnum.CUSTOMER_CREATE,
    PermissionEnum.CUSTOMER_EDIT,
    PermissionEnum.CUSTOMER_DELETE,
    PermissionEnum.REPORT_VIEW,
    PermissionEnum.REPORT_GENERATE,
    PermissionEnum.REPORT_EXPORT,
    PermissionEnum.SETTINGS_VIEW,
    PermissionEnum.SETTINGS_EDIT,
    PermissionEnum.SETTINGS_MANAGE_USERS,
    PermissionEnum.ADMIN_ACCESS,
    PermissionEnum.OWNER_ACCESS,
    PermissionEnum.AUDIT_LOG_VIEW,
    PermissionEnum.TABLE_VIEW,
    PermissionEnum.TABLE_EDIT,
    PermissionEnum.KITCHEN_QUEUE_VIEW,
    PermissionEnum.KITCHEN_QUEUE_MANAGE,
    PermissionEnum.PRESCRIPTION_VIEW,
    PermissionEnum.PRESCRIPTION_CREATE,
    PermissionEnum.PRESCRIPTION_DISPENSE,
    PermissionEnum.BATCH_TRACKING_VIEW,
    PermissionEnum.POS_VIEW, PermissionEnum.POS_SELL, PermissionEnum.POS_HOLD, PermissionEnum.POS_DISCOUNT, PermissionEnum.POS_VOID,
    PermissionEnum.POS_PIN_USE, PermissionEnum.POS_PIN_RESET, PermissionEnum.POS_LOCK, PermissionEnum.POS_SWITCH_USER,
    PermissionEnum.SHIFT_OPEN, PermissionEnum.SHIFT_CLOSE, PermissionEnum.SHIFT_MANAGE, PermissionEnum.SALES_VIEW_OWN, PermissionEnum.SALES_VIEW_ALL,
    PermissionEnum.PURCHASE_VIEW, PermissionEnum.PURCHASE_MANAGE, PermissionEnum.FINANCE_VIEW, PermissionEnum.FINANCE_MANAGE,
    PermissionEnum.EXPENSE_VIEW, PermissionEnum.EXPENSE_MANAGE, PermissionEnum.STAFF_VIEW, PermissionEnum.STAFF_MANAGE,
  ],
  [RoleEnum.ADMIN]: [
    // Organization administration, excluding ownership-only controls.
    PermissionEnum.PRODUCT_VIEW, PermissionEnum.PRODUCT_CREATE, PermissionEnum.PRODUCT_EDIT, PermissionEnum.PRODUCT_DELETE, PermissionEnum.PRODUCT_EXPORT,
    PermissionEnum.SALE_VIEW, PermissionEnum.SALE_CREATE, PermissionEnum.SALE_EDIT, PermissionEnum.SALE_DELETE, PermissionEnum.SALE_REFUND,
    PermissionEnum.ORDER_VIEW, PermissionEnum.ORDER_CREATE, PermissionEnum.ORDER_EDIT, PermissionEnum.ORDER_DELETE,
    PermissionEnum.INVENTORY_VIEW, PermissionEnum.INVENTORY_EDIT, PermissionEnum.INVENTORY_TRANSFER, PermissionEnum.INVENTORY_ADJUST,
    PermissionEnum.PURCHASE_VIEW, PermissionEnum.PURCHASE_MANAGE,
    PermissionEnum.CUSTOMER_VIEW, PermissionEnum.CUSTOMER_CREATE, PermissionEnum.CUSTOMER_EDIT, PermissionEnum.CUSTOMER_DELETE,
    PermissionEnum.REPORT_VIEW, PermissionEnum.REPORT_GENERATE, PermissionEnum.REPORT_EXPORT,
    PermissionEnum.FINANCE_VIEW, PermissionEnum.FINANCE_MANAGE, PermissionEnum.EXPENSE_VIEW, PermissionEnum.EXPENSE_MANAGE,
    PermissionEnum.SETTINGS_VIEW, PermissionEnum.SETTINGS_EDIT, PermissionEnum.SETTINGS_MANAGE_USERS,
    PermissionEnum.ADMIN_ACCESS, PermissionEnum.AUDIT_LOG_VIEW, PermissionEnum.STAFF_VIEW, PermissionEnum.STAFF_MANAGE,
    PermissionEnum.POS_VIEW, PermissionEnum.POS_SELL, PermissionEnum.POS_HOLD, PermissionEnum.POS_DISCOUNT, PermissionEnum.POS_VOID,
    PermissionEnum.POS_PIN_USE, PermissionEnum.POS_PIN_RESET, PermissionEnum.POS_LOCK, PermissionEnum.POS_SWITCH_USER,
    PermissionEnum.SHIFT_OPEN, PermissionEnum.SHIFT_CLOSE, PermissionEnum.SHIFT_MANAGE,
    PermissionEnum.SALES_VIEW_OWN, PermissionEnum.SALES_VIEW_ALL,
    PermissionEnum.TABLE_VIEW, PermissionEnum.TABLE_EDIT, PermissionEnum.KITCHEN_QUEUE_VIEW, PermissionEnum.KITCHEN_QUEUE_MANAGE,
    PermissionEnum.PRESCRIPTION_VIEW, PermissionEnum.PRESCRIPTION_CREATE, PermissionEnum.PRESCRIPTION_DISPENSE, PermissionEnum.BATCH_TRACKING_VIEW,
  ],
  [RoleEnum.MANAGER]: [
    PermissionEnum.PRODUCT_VIEW,
    PermissionEnum.PRODUCT_CREATE,
    PermissionEnum.PRODUCT_EDIT,
    PermissionEnum.PRODUCT_EXPORT,
    PermissionEnum.SALE_VIEW,
    PermissionEnum.SALE_CREATE,
    PermissionEnum.SALE_EDIT,
    PermissionEnum.SALE_REFUND,
    PermissionEnum.ORDER_VIEW,
    PermissionEnum.ORDER_CREATE,
    PermissionEnum.ORDER_EDIT,
    PermissionEnum.INVENTORY_VIEW,
    PermissionEnum.INVENTORY_EDIT,
    PermissionEnum.INVENTORY_TRANSFER,
    PermissionEnum.INVENTORY_ADJUST,
    PermissionEnum.CUSTOMER_VIEW,
    PermissionEnum.CUSTOMER_CREATE,
    PermissionEnum.CUSTOMER_EDIT,
    PermissionEnum.REPORT_VIEW,
    PermissionEnum.REPORT_GENERATE,
    PermissionEnum.REPORT_EXPORT,
    PermissionEnum.FINANCE_VIEW,
    PermissionEnum.AUDIT_LOG_VIEW,
    PermissionEnum.TABLE_VIEW,
    PermissionEnum.KITCHEN_QUEUE_VIEW,
    PermissionEnum.KITCHEN_QUEUE_MANAGE,
    PermissionEnum.PRESCRIPTION_VIEW,
    PermissionEnum.BATCH_TRACKING_VIEW,
    PermissionEnum.POS_VIEW, PermissionEnum.POS_SELL, PermissionEnum.POS_HOLD, PermissionEnum.POS_DISCOUNT, PermissionEnum.POS_VOID,
    PermissionEnum.POS_PIN_USE, PermissionEnum.POS_PIN_RESET, PermissionEnum.POS_LOCK, PermissionEnum.POS_SWITCH_USER,
    PermissionEnum.SHIFT_OPEN, PermissionEnum.SHIFT_CLOSE, PermissionEnum.SHIFT_MANAGE, PermissionEnum.SALES_VIEW_OWN, PermissionEnum.SALES_VIEW_ALL,
    PermissionEnum.PURCHASE_VIEW, PermissionEnum.PURCHASE_MANAGE, PermissionEnum.EXPENSE_VIEW, PermissionEnum.EXPENSE_MANAGE, PermissionEnum.STAFF_VIEW, PermissionEnum.STAFF_MANAGE,
  ],
  [RoleEnum.SUPERVISOR]: [
    PermissionEnum.PRODUCT_VIEW, PermissionEnum.SALE_VIEW, PermissionEnum.SALE_CREATE, PermissionEnum.SALE_REFUND,
    PermissionEnum.POS_VIEW, PermissionEnum.POS_SELL, PermissionEnum.POS_HOLD, PermissionEnum.POS_DISCOUNT,
    PermissionEnum.POS_PIN_USE, PermissionEnum.POS_PIN_RESET, PermissionEnum.POS_LOCK, PermissionEnum.POS_SWITCH_USER,
    PermissionEnum.SHIFT_OPEN, PermissionEnum.SHIFT_CLOSE, PermissionEnum.SHIFT_MANAGE, PermissionEnum.SALES_VIEW_OWN, PermissionEnum.SALES_VIEW_ALL,
    PermissionEnum.INVENTORY_VIEW, PermissionEnum.INVENTORY_ADJUST, PermissionEnum.CUSTOMER_VIEW, PermissionEnum.CUSTOMER_CREATE,
  ],
  [RoleEnum.CASHIER]: [
    PermissionEnum.PRODUCT_VIEW,
    PermissionEnum.SALE_CREATE,
    PermissionEnum.ORDER_VIEW,
    PermissionEnum.ORDER_CREATE,
    PermissionEnum.CUSTOMER_VIEW,
    PermissionEnum.CUSTOMER_CREATE,
    PermissionEnum.PRESCRIPTION_VIEW,
    PermissionEnum.PRESCRIPTION_DISPENSE,
    PermissionEnum.POS_VIEW, PermissionEnum.POS_SELL, PermissionEnum.POS_HOLD, PermissionEnum.SHIFT_OPEN, PermissionEnum.SHIFT_CLOSE,
    PermissionEnum.POS_PIN_USE, PermissionEnum.POS_LOCK,
    PermissionEnum.SALES_VIEW_OWN,
  ],
  [RoleEnum.INVENTORY]: [
    PermissionEnum.PRODUCT_VIEW, PermissionEnum.PRODUCT_CREATE, PermissionEnum.PRODUCT_EDIT,
    PermissionEnum.INVENTORY_VIEW, PermissionEnum.INVENTORY_EDIT, PermissionEnum.INVENTORY_TRANSFER, PermissionEnum.INVENTORY_ADJUST,
    PermissionEnum.PURCHASE_VIEW, PermissionEnum.PURCHASE_MANAGE,
  ],
  [RoleEnum.ACCOUNTANT]: [
    PermissionEnum.SALE_VIEW, PermissionEnum.SALES_VIEW_ALL, PermissionEnum.REPORT_VIEW, PermissionEnum.REPORT_GENERATE, PermissionEnum.REPORT_EXPORT,
    PermissionEnum.FINANCE_VIEW, PermissionEnum.FINANCE_MANAGE, PermissionEnum.EXPENSE_VIEW, PermissionEnum.EXPENSE_MANAGE, PermissionEnum.PURCHASE_VIEW,
  ],
  [RoleEnum.STAFF]: [
    PermissionEnum.PRODUCT_VIEW,
    PermissionEnum.SALE_VIEW,
    PermissionEnum.INVENTORY_VIEW,
    PermissionEnum.CUSTOMER_VIEW,
    PermissionEnum.REPORT_VIEW,
  ],
  [RoleEnum.CHEF]: [
    PermissionEnum.ORDER_VIEW,
    PermissionEnum.KITCHEN_QUEUE_VIEW,
    PermissionEnum.KITCHEN_QUEUE_MANAGE,
  ],
  [RoleEnum.PHARMACIST]: [
    PermissionEnum.PRODUCT_VIEW,
    PermissionEnum.PRODUCT_CREATE,
    PermissionEnum.PRODUCT_EDIT,
    PermissionEnum.PRESCRIPTION_VIEW,
    PermissionEnum.PRESCRIPTION_CREATE,
    PermissionEnum.PRESCRIPTION_DISPENSE,
    PermissionEnum.BATCH_TRACKING_VIEW,
    PermissionEnum.INVENTORY_VIEW,
    PermissionEnum.INVENTORY_EDIT,
    PermissionEnum.CUSTOMER_VIEW,
    PermissionEnum.REPORT_VIEW,
  ],
  [RoleEnum.PHARMACY_STAFF]: [
    PermissionEnum.PRODUCT_VIEW,
    PermissionEnum.PRESCRIPTION_VIEW,
    PermissionEnum.PRESCRIPTION_DISPENSE,
    PermissionEnum.INVENTORY_VIEW,
    PermissionEnum.CUSTOMER_VIEW,
  ],
};

/** Roles an actor may assign when creating or promoting a staff member. */
export const ASSIGNABLE_ROLES: Readonly<Record<RoleEnum, readonly RoleEnum[]>> = {
  [RoleEnum.OWNER]: [RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.SUPERVISOR, RoleEnum.CASHIER, RoleEnum.INVENTORY, RoleEnum.ACCOUNTANT],
  [RoleEnum.ADMIN]: [RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.SUPERVISOR, RoleEnum.CASHIER, RoleEnum.INVENTORY, RoleEnum.ACCOUNTANT],
  [RoleEnum.MANAGER]: [RoleEnum.SUPERVISOR, RoleEnum.CASHIER, RoleEnum.INVENTORY, RoleEnum.ACCOUNTANT],
  [RoleEnum.SUPERVISOR]: [], [RoleEnum.CASHIER]: [], [RoleEnum.INVENTORY]: [], [RoleEnum.ACCOUNTANT]: [],
  [RoleEnum.STAFF]: [], [RoleEnum.CHEF]: [], [RoleEnum.PHARMACIST]: [], [RoleEnum.PHARMACY_STAFF]: [],
}

export function canAssignRole(actor: RoleEnum, role: RoleEnum) {
  return ASSIGNABLE_ROLES[actor].includes(role)
}

/** Existing admins are owner-controlled; managers may only manage branch staff below them. */
export function canManageExistingRole(actor: RoleEnum, target: RoleEnum) {
  if (actor === RoleEnum.OWNER) return target !== RoleEnum.OWNER
  if (actor === RoleEnum.ADMIN) return target !== RoleEnum.OWNER && target !== RoleEnum.ADMIN
  if (actor === RoleEnum.MANAGER) return ASSIGNABLE_ROLES[RoleEnum.MANAGER].includes(target)
  return false
}

export interface UserRole {
  userId: string;
  orgId: string;
  role: RoleEnum;
}

export type Permission = PermissionEnum;
