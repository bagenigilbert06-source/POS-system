/**
 * Permission and Role Types
 * RBAC (Role-Based Access Control) system
 */

export enum PermissionEnum {
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
  ORDER_VIEW = 'order:view',
  ORDER_CREATE = 'order:create',
  ORDER_EDIT = 'order:edit',
  ORDER_DELETE = 'order:delete',

  // Inventory
  INVENTORY_VIEW = 'inventory:view',
  INVENTORY_EDIT = 'inventory:edit',
  INVENTORY_TRANSFER = 'inventory:transfer',
  INVENTORY_ADJUST = 'inventory:adjust',

  // Customers
  CUSTOMER_VIEW = 'customer:view',
  CUSTOMER_CREATE = 'customer:create',
  CUSTOMER_EDIT = 'customer:edit',
  CUSTOMER_DELETE = 'customer:delete',

  // Reports
  REPORT_VIEW = 'report:view',
  REPORT_GENERATE = 'report:generate',
  REPORT_EXPORT = 'report:export',

  // Settings
  SETTINGS_VIEW = 'settings:view',
  SETTINGS_EDIT = 'settings:edit',
  SETTINGS_MANAGE_USERS = 'settings:manage-users',

  // Admin
  ADMIN_ACCESS = 'admin:access',
  AUDIT_LOG_VIEW = 'audit:log-view',

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
  MANAGER = 'manager',
  CASHIER = 'cashier',
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
    PermissionEnum.AUDIT_LOG_VIEW,
    PermissionEnum.TABLE_VIEW,
    PermissionEnum.TABLE_EDIT,
    PermissionEnum.KITCHEN_QUEUE_VIEW,
    PermissionEnum.KITCHEN_QUEUE_MANAGE,
    PermissionEnum.PRESCRIPTION_VIEW,
    PermissionEnum.PRESCRIPTION_CREATE,
    PermissionEnum.PRESCRIPTION_DISPENSE,
    PermissionEnum.BATCH_TRACKING_VIEW,
  ],
  [RoleEnum.MANAGER]: [
    PermissionEnum.PRODUCT_VIEW,
    PermissionEnum.PRODUCT_CREATE,
    PermissionEnum.PRODUCT_EDIT,
    PermissionEnum.PRODUCT_EXPORT,
    PermissionEnum.SALE_VIEW,
    PermissionEnum.SALE_CREATE,
    PermissionEnum.SALE_EDIT,
    PermissionEnum.ORDER_VIEW,
    PermissionEnum.ORDER_CREATE,
    PermissionEnum.ORDER_EDIT,
    PermissionEnum.INVENTORY_VIEW,
    PermissionEnum.INVENTORY_EDIT,
    PermissionEnum.INVENTORY_TRANSFER,
    PermissionEnum.CUSTOMER_VIEW,
    PermissionEnum.CUSTOMER_CREATE,
    PermissionEnum.CUSTOMER_EDIT,
    PermissionEnum.REPORT_VIEW,
    PermissionEnum.REPORT_GENERATE,
    PermissionEnum.REPORT_EXPORT,
    PermissionEnum.SETTINGS_VIEW,
    PermissionEnum.TABLE_VIEW,
    PermissionEnum.KITCHEN_QUEUE_VIEW,
    PermissionEnum.KITCHEN_QUEUE_MANAGE,
    PermissionEnum.PRESCRIPTION_VIEW,
    PermissionEnum.BATCH_TRACKING_VIEW,
  ],
  [RoleEnum.CASHIER]: [
    PermissionEnum.PRODUCT_VIEW,
    PermissionEnum.SALE_VIEW,
    PermissionEnum.SALE_CREATE,
    PermissionEnum.ORDER_VIEW,
    PermissionEnum.ORDER_CREATE,
    PermissionEnum.INVENTORY_VIEW,
    PermissionEnum.CUSTOMER_VIEW,
    PermissionEnum.CUSTOMER_CREATE,
    PermissionEnum.REPORT_VIEW,
    PermissionEnum.PRESCRIPTION_VIEW,
    PermissionEnum.PRESCRIPTION_DISPENSE,
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

export interface UserRole {
  userId: string;
  orgId: string;
  role: RoleEnum;
}

export type Permission = PermissionEnum;
