/**
 * WorkspaceTemplate — the contract every category template must satisfy.
 *
 * Business Type  → determines: dashboard route, navigation, modules, layout
 * Business Category → determines: starter data, widgets, quick actions,
 *                                  enabled features, default settings
 *
 * Adding a new category = create one file + register it below.
 * No new dashboard, no duplicated UI, no hardcoded if/else.
 */

export interface StarterCategory {
  name: string
  description?: string
}

export interface StarterProduct {
  name: string
  sku: string
  sellingPrice: number
  buyingPrice: number
  stock: number
  unit: string
  /** Must match a StarterCategory name above */
  category: string
}

export interface QuickAction {
  label: string
  href: string
  /** Lucide icon name */
  icon: string
  /** When true the button uses the primary brand color */
  primary?: boolean
}

export interface DashboardWidget {
  id: string
  /** Controls which shared widget component renders */
  type: 'stat' | 'alert-list' | 'product-table' | 'order-queue' | 'table-grid' | 'batch-list' | 'prescription-list'
  title: string
  /** Data source key passed to the widget component */
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

export interface WorkspaceTemplate {
  /** Unique dot-namespaced id, e.g. "retail.supermarket" */
  id: string
  /** Human-readable label shown in the UI */
  name: string
  /** Which business type owns this template */
  businessType: 'retail' | 'restaurant' | 'pharmacy'
  /** Features enabled for this category */
  enabledFeatures: string[]
  /** Default settings that differ from the business-type baseline */
  defaultSettings: Record<string, any>
  /** Starter inventory loaded at workspace creation */
  starterCategories: StarterCategory[]
  starterProducts: StarterProduct[]
  /** Widgets rendered on the dashboard (ordered top-left → bottom-right) */
  dashboardWidgets: DashboardWidget[]
  /** Quick-action buttons shown at the top of the dashboard */
  quickActions: QuickAction[]
  /** Checklist shown to new users */
  gettingStartedTasks: GettingStartedTask[]
}
