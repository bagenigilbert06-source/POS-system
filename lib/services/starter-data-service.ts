import { db } from '@/lib/db'
import { category, product } from '@/lib/db/schema'
import { generateId } from '@/lib/utils'
import type { WorkspaceConfig } from '@/lib/types/workspace'

// ---------------------------------------------------------------------------
// Per-business-type starter catalogs
// ---------------------------------------------------------------------------

interface StarterItem {
  name: string
  sku: string
  sellingPrice: number
  buyingPrice: number
  stock: number
  unit: string
  category: string
}

const STARTER_CATALOG: Record<string, { categories: string[]; products: StarterItem[] }> = {
  retail_store: {
    categories: ['Electronics', 'Clothing', 'Home & Garden', 'Sports & Outdoors', 'General'],
    products: [
      { name: 'USB-C Cable 1m', sku: 'ELEC-001', sellingPrice: 350, buyingPrice: 150, stock: 50, unit: 'pcs', category: 'Electronics' },
      { name: 'Phone Case (Universal)', sku: 'ELEC-002', sellingPrice: 500, buyingPrice: 200, stock: 30, unit: 'pcs', category: 'Electronics' },
      { name: 'Men\'s T-Shirt (M)', sku: 'CLTH-001', sellingPrice: 900, buyingPrice: 400, stock: 20, unit: 'pcs', category: 'Clothing' },
      { name: 'Women\'s Blouse (M)', sku: 'CLTH-002', sellingPrice: 1200, buyingPrice: 550, stock: 15, unit: 'pcs', category: 'Clothing' },
      { name: 'Plastic Storage Box', sku: 'HOME-001', sellingPrice: 650, buyingPrice: 280, stock: 25, unit: 'pcs', category: 'Home & Garden' },
    ],
  },
  restaurant: {
    categories: ['Appetizers', 'Main Courses', 'Desserts', 'Beverages', 'Specials'],
    products: [
      { name: 'Spring Rolls (4 pcs)', sku: 'APP-001', sellingPrice: 350, buyingPrice: 120, stock: 100, unit: 'plate', category: 'Appetizers' },
      { name: 'Grilled Chicken', sku: 'MAIN-001', sellingPrice: 850, buyingPrice: 350, stock: 100, unit: 'plate', category: 'Main Courses' },
      { name: 'Beef Stew & Ugali', sku: 'MAIN-002', sellingPrice: 700, buyingPrice: 280, stock: 100, unit: 'plate', category: 'Main Courses' },
      { name: 'Chocolate Cake Slice', sku: 'DES-001', sellingPrice: 300, buyingPrice: 100, stock: 50, unit: 'slice', category: 'Desserts' },
      { name: 'Mineral Water 500ml', sku: 'BEV-001', sellingPrice: 70, buyingPrice: 35, stock: 200, unit: 'bottle', category: 'Beverages' },
      { name: 'Fresh Juice (Glass)', sku: 'BEV-002', sellingPrice: 180, buyingPrice: 60, stock: 100, unit: 'glass', category: 'Beverages' },
    ],
  },
  pharmacy: {
    categories: ['Over-the-Counter', 'Prescription', 'Health & Wellness', 'Supplements', 'Medical Supplies'],
    products: [
      { name: 'Paracetamol 500mg (Strip)', sku: 'OTC-001', sellingPrice: 50, buyingPrice: 20, stock: 200, unit: 'strip', category: 'Over-the-Counter' },
      { name: 'Ibuprofen 400mg (Strip)', sku: 'OTC-002', sellingPrice: 80, buyingPrice: 35, stock: 150, unit: 'strip', category: 'Over-the-Counter' },
      { name: 'Multivitamin Tabs (30)', sku: 'SUP-001', sellingPrice: 450, buyingPrice: 200, stock: 80, unit: 'pack', category: 'Supplements' },
      { name: 'Vitamin C 1000mg (20)', sku: 'SUP-002', sellingPrice: 350, buyingPrice: 150, stock: 100, unit: 'pack', category: 'Supplements' },
      { name: 'Surgical Gloves (Box)', sku: 'MED-001', sellingPrice: 650, buyingPrice: 300, stock: 60, unit: 'box', category: 'Medical Supplies' },
      { name: 'Antiseptic Cream 50g', sku: 'OTC-003', sellingPrice: 280, buyingPrice: 120, stock: 90, unit: 'tube', category: 'Over-the-Counter' },
    ],
  },
  pet_shop: {
    categories: ['Pet Food', 'Supplies', 'Toys', 'Grooming Supplies', 'Health'],
    products: [
      { name: 'Dog Dry Food 2kg', sku: 'PET-001', sellingPrice: 1200, buyingPrice: 700, stock: 30, unit: 'bag', category: 'Pet Food' },
      { name: 'Cat Wet Food (Tin)', sku: 'PET-002', sellingPrice: 180, buyingPrice: 80, stock: 60, unit: 'tin', category: 'Pet Food' },
      { name: 'Dog Collar (Medium)', sku: 'SUP-001', sellingPrice: 450, buyingPrice: 180, stock: 25, unit: 'pcs', category: 'Supplies' },
      { name: 'Rubber Squeaky Toy', sku: 'TOY-001', sellingPrice: 300, buyingPrice: 100, stock: 40, unit: 'pcs', category: 'Toys' },
      { name: 'Pet Shampoo 250ml', sku: 'GRM-001', sellingPrice: 550, buyingPrice: 230, stock: 35, unit: 'bottle', category: 'Grooming Supplies' },
    ],
  },
}

// Fallback to retail
const DEFAULT_CATALOG = STARTER_CATALOG.retail_store

export class StarterDataService {
  /**
   * Insert starter categories and products into the database for a new org.
   * All inserts are wrapped in a transaction so they either all succeed or
   * all roll back — leaving the workspace in a clean state.
   */
  static async seedStarterData(
    orgId: string,
    userId: string,
    config: WorkspaceConfig
  ): Promise<{ success: boolean; categoriesCreated: number; productsCreated: number }> {
    const catalog = STARTER_CATALOG[config.template.id] ?? DEFAULT_CATALOG

    try {
      let categoriesCreated = 0
      let productsCreated = 0

      await db.transaction(async (tx) => {
        // --- 1. Insert categories ----------------------------------------
        const categoryIdMap: Record<string, string> = {}

        for (const catName of catalog.categories) {
          const catId = generateId()
          categoryIdMap[catName] = catId
          await tx.insert(category).values({
            id: catId,
            name: catName,
            description: `${catName} products`,
            userId,
            orgId,
          })
          categoriesCreated++
        }

        // --- 2. Insert products ------------------------------------------
        for (const item of catalog.products) {
          const catId = categoryIdMap[item.category]
          await tx.insert(product).values({
            id: generateId(),
            name: item.name,
            sku: item.sku,
            sellingPrice: String(item.sellingPrice),
            buyingPrice: String(item.buyingPrice),
            stock: item.stock,
            minStock: 5,
            unit: item.unit,
            categoryId: catId ?? null,
            isActive: true,
            userId,
            orgId,
          })
          productsCreated++
        }
      })

      return { success: true, categoriesCreated, productsCreated }
    } catch (error) {
      console.error('[StarterDataService] Seeding failed:', error)
      return { success: false, categoriesCreated: 0, productsCreated: 0 }
    }
  }
}
