import type { WorkspaceSettings } from '../../types'
import { RETAIL_SETTINGS } from '../../_shared/defaults'

export const settings: WorkspaceSettings = {
  ...RETAIL_SETTINGS,
  inventory: {
    ...RETAIL_SETTINGS.inventory,
    enableExpiryTracking: true,
    lowStockThreshold: 20,
  },
  notifications: {
    ...RETAIL_SETTINGS.notifications,
    expiryAlerts: true,
    expiryAlertDays: 14,
  },
}
