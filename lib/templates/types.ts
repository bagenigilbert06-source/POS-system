/**
 * lib/templates/types.ts
 *
 * The canonical contract every workspace template must satisfy.
 *
 * Design principles:
 *  - Templates are pure data — no logic, no imports from services.
 *  - Every property that can vary per business category lives here.
 *  - The dashboard renders whatever the template provides; it never branches on
 *    businessType or businessCategory.
 *  - templateId is dot-namespaced ("retail.supermarket") and must never change.
 *  - templateVersion allows future improvements without breaking existing workspaces.
 */

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export interface StarterCategory {
  name: string
  description?: string
  /** Lucide icon name shown in the category list */
  icon?: string
}

export interface StarterProduct {
  name: string
  sku: string
  sellingPrice: number
  buyingPrice: number
  stock: number
  unit: string
  /** Must match a StarterCategory.name in the same template */
  category: string
}

export interface QuickAction {
  id: string
  label: string
  href: string
  /** Lucide icon name */
  icon: string
  /** When true the button uses the primary brand color */
  primary?: boolean
}

export interface DashboardWidget {
  id: string
  /**
   * Controls which shared widget component renders.
   * The dashboard never branches on businessType — only on this type string.
   */
  type:
    | 'stat'
    | 'alert-list'
    | 'product-table'
    | 'order-queue'
    | 'table-grid'
    | 'batch-list'
    | 'prescription-list'
  title: string
  /** Data-fetching key passed to the widget component */
  dataSource: string
  /** Grid column span 1–4 */
  span?: 1 | 2 | 3 | 4
}

export interface GettingStartedTask {
  id: string
  title: string
  description: string
  /** href the action button links to */
  action: string
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

export interface NavItem {
  id: string
  label: string
  /** Lucide icon name */
  icon: string
  route: string
  /** Sub-items for collapsible nav sections */
  children?: NavItem[]
}

export interface NavigationConfig {
  primaryNav: NavItem[]
  secondaryNav: NavItem[]
}

// ---------------------------------------------------------------------------
// Features & Settings
// ---------------------------------------------------------------------------

/** A named feature flag that modules check at runtime */
export type FeatureFlag = string

export interface TaxDefaults {
  /** e.g. "VAT" */
  name: string
  /** Percentage, e.g. 16 */
  rate: number
  inclusive: boolean
}

export interface ReceiptDefaults {
  showLogo: boolean
  showBusinessName: boolean
  footerMessage: string
  printAutomatically: boolean
}

export interface InvoiceDefaults {
  prefix: string
  /** Starting number, e.g. 1000 */
  startingNumber: number
  dueDays: number
}

export interface InventorySettings {
  trackStock: boolean
  allowNegativeStock: boolean
  lowStockThreshold: number
  /** Automatically create purchase orders when stock hits reorder point */
  autoReorder: boolean
  enableExpiryTracking: boolean
  enableBatchTracking: boolean
  enableBarcodeScanning: boolean
  enableSerialNumbers: boolean
}

export interface NotificationDefaults {
  lowStockAlerts: boolean
  expiryAlerts: boolean
  /** Days before expiry to trigger alert */
  expiryAlertDays: number
  dailySalesSummary: boolean
}

export interface WorkspaceSettings {
  currency: string
  /** IANA timezone, e.g. "Africa/Nairobi" */
  timezone: string
  tax: TaxDefaults
  receipt: ReceiptDefaults
  invoice: InvoiceDefaults
  inventory: InventorySettings
  notifications: NotificationDefaults
}

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

export interface RolePermissions {
  /** e.g. "admin" | "manager" | "cashier" | "waiter" | "pharmacist" */
  role: string
  /** Permission keys this role has */
  permissions: string[]
}

export interface PermissionsConfig {
  roles: RolePermissions[]
  /** The role assigned to the first user (workspace owner) */
  defaultOwnerRole: string
  /** The role assigned when inviting a new employee */
  defaultEmployeeRole: string
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export interface ReportDefinition {
  id: string
  title: string
  description: string
  /** Route to the report page */
  route: string
  /** Whether this report is available on this template */
  enabled: boolean
}

// ---------------------------------------------------------------------------
// Root Template
// ---------------------------------------------------------------------------

export interface WorkspaceTemplate {
  /**
   * Unique dot-namespaced id, e.g. "retail.supermarket".
   * Must remain stable forever — this is stored on every workspace row.
   */
  id: string

  /**
   * Integer version. Increment when the template changes materially.
   * Existing workspaces keep their current version; new signups get the latest.
   */
  version: number

  /** Human-readable label shown in the UI */
  name: string

  /** Which of the three dashboards owns this template */
  businessType: 'retail' | 'restaurant' | 'pharmacy'

  // ── Module config ──────────────────────────────────────────────────────
  navigation: NavigationConfig
  dashboardWidgets: DashboardWidget[]
  quickActions: QuickAction[]
  enabledModules: string[]
  enabledFeatures: FeatureFlag[]
  settings: WorkspaceSettings
  permissions: PermissionsConfig
  reports: ReportDefinition[]
  gettingStartedTasks: GettingStartedTask[]

  // ── Starter data seeded at workspace creation ──────────────────────────
  starterCategories: StarterCategory[]
  starterProducts: StarterProduct[]
}
