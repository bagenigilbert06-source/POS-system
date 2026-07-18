import { categoryLabel } from '../onboarding/config'

export type BusinessExperience = {
  kind: 'retail' | 'hospitality' | 'general'
  label: string
  overviewTitle: string
  overviewDescription: string
  navigation: {
    overview: string
    pos: string
    sales: string
    products: string
    inventory: string
    customers: string
  }
  actions: Array<'primary' | 'products' | 'inventory'>
  actionLabels: Record<'primary' | 'products' | 'inventory', string>
  metricLabels: [string, string, string, string]
  activityTitle: string
  activityDescription: string
  stockTitle: string
  stockDescription: string
}

export function getBusinessExperience(businessFamily: string, businessCategory: string, customCategory = ''): BusinessExperience {
  const category = businessCategory.toLowerCase()
  const label = categoryLabel(businessFamily, businessCategory, customCategory)

  if (businessFamily === 'food_hospitality') {
    const foodLabel = category === 'cafe' ? 'Café' : label
    return {
      kind: 'hospitality',
      label: foodLabel,
      overviewTitle: `${foodLabel} overview`,
      overviewDescription: 'Keep counter service, menu availability and daily trading in view.',
      navigation: { overview: `${foodLabel} overview`, pos: 'Counter POS', sales: 'Orders', products: 'Menu', inventory: 'Ingredients', customers: 'Guests' },
      actions: ['primary', 'products', 'inventory'],
      actionLabels: { primary: 'New order', products: 'Manage menu', inventory: 'Check ingredients' },
      metricLabels: ["Today's sales", 'Orders today', 'Average order', 'Menu items'],
      activityTitle: 'Recent orders',
      activityDescription: 'Latest completed counter orders.',
      stockTitle: 'Ingredient attention',
      stockDescription: 'Items at or below their reorder level.',
    }
  }

  if (businessFamily === 'retail') {
    const storeLabel = category === 'supermarket' ? 'Supermarket' : category === 'mini_mart' ? 'Mini-mart' : category === 'general_shop' ? 'Shop' : label
    return {
      kind: 'retail',
      label: storeLabel,
      overviewTitle: `${storeLabel} overview`,
      overviewDescription: 'Track checkout activity, stock health and products from one workspace.',
      navigation: { overview: `${storeLabel} overview`, pos: 'Checkout', sales: 'Sales', products: 'Products', inventory: 'Stock', customers: 'Customers' },
      actions: ['primary', 'products', 'inventory'],
      actionLabels: { primary: 'Start sale', products: 'Manage products', inventory: 'Review stock' },
      metricLabels: ["Today's sales", 'Transactions today', 'Average basket', 'Stock alerts'],
      activityTitle: 'Recent sales',
      activityDescription: 'Latest completed sales in this workspace.',
      stockTitle: 'Stock attention',
      stockDescription: 'Products at or below their reorder level.',
    }
  }

  return {
    kind: 'general',
    label,
    overviewTitle: 'Business overview',
    overviewDescription: 'See the live operational records for your business.',
    navigation: { overview: 'Overview', pos: 'Point of sale', sales: 'Sales', products: 'Products', inventory: 'Inventory', customers: 'Customers' },
    actions: ['primary', 'products', 'inventory'],
    actionLabels: { primary: 'New sale', products: 'Products', inventory: 'Inventory' },
    metricLabels: ["Today's sales", "Today's expenses", 'Operating position', 'Stock alerts'],
    activityTitle: 'Recent transactions',
    activityDescription: 'Latest sales recorded in this workspace.',
    stockTitle: 'Inventory attention',
    stockDescription: 'Products at or below reorder level.',
  }
}
