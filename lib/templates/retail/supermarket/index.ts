import type { WorkspaceTemplate } from '../../types'
import { RETAIL_PERMISSIONS, RETAIL_REPORTS } from '../../_shared/defaults'
import { navigation } from './navigation'
import { dashboardWidgets, quickActions } from './dashboard'
import { enabledModules, enabledFeatures } from './features'
import { starterCategories, starterProducts } from './starter-data'
import { settings } from './settings'
import { gettingStartedTasks } from './getting-started'

export const supermarketTemplate: WorkspaceTemplate = {
  id: 'retail.supermarket',
  version: 1,
  name: 'Supermarket',
  businessType: 'retail',
  navigation,
  dashboardWidgets,
  quickActions,
  enabledModules,
  enabledFeatures,
  settings,
  permissions: RETAIL_PERMISSIONS,
  reports: RETAIL_REPORTS,
  starterCategories,
  starterProducts,
  gettingStartedTasks,
}
