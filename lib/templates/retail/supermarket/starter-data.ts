import type { StarterCategory, StarterProduct } from '../../types'

export const starterCategories: StarterCategory[] = [
  { name: 'Beverages', description: 'Water, juices, sodas, energy drinks', icon: 'GlassWater' },
  { name: 'Dairy & Eggs', description: 'Milk, cheese, yoghurt, eggs', icon: 'Milk' },
  { name: 'Bakery', description: 'Bread, cakes, pastries', icon: 'Cake' },
  { name: 'Snacks & Confectionery', description: 'Biscuits, crisps, sweets', icon: 'Cookie' },
  { name: 'Cleaning Supplies', description: 'Detergents, dishwashing, mops', icon: 'Sparkles' },
]

export const starterProducts: StarterProduct[] = [
  { name: 'Mineral Water 500ml', sku: 'BEV-001', sellingPrice: 60, buyingPrice: 30, stock: 200, unit: 'bottle', category: 'Beverages' },
  { name: 'Fresh Milk 1L', sku: 'DAI-001', sellingPrice: 130, buyingPrice: 90, stock: 80, unit: 'packet', category: 'Dairy & Eggs' },
  { name: 'White Bread Loaf', sku: 'BAK-001', sellingPrice: 65, buyingPrice: 40, stock: 60, unit: 'loaf', category: 'Bakery' },
  { name: 'Crisps 100g', sku: 'SNK-001', sellingPrice: 80, buyingPrice: 45, stock: 120, unit: 'packet', category: 'Snacks & Confectionery' },
  { name: 'Dishwashing Liquid 500ml', sku: 'CLN-001', sellingPrice: 180, buyingPrice: 100, stock: 50, unit: 'bottle', category: 'Cleaning Supplies' },
]
