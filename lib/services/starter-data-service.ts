import { db } from '@/lib/db'
import { category, product } from '@/lib/db/schema'
import { generateId } from '@/lib/utils'
import type { WorkspaceConfig } from '@/lib/types/workspace'

export class StarterDataService {
  /**
   * Insert starter categories and products into the database for a new org.
   *
   * The catalog is read directly from the WorkspaceTemplate that was resolved
   * during onboarding — no hardcoded catalogs or if/else chains here.
   * All inserts are wrapped in a single transaction.
   */
  static async seedStarterData(
    orgId: string,
    userId: string,
    config: WorkspaceConfig
  ): Promise<{ success: boolean; categoriesCreated: number; productsCreated: number }> {
    const { starterCategories, starterProducts } = config.template

    // Nothing to seed (e.g. "Other Retail" general template)
    if (starterCategories.length === 0) {
      return { success: true, categoriesCreated: 0, productsCreated: 0 }
    }

    try {
      let categoriesCreated = 0
      let productsCreated = 0

      await db.transaction(async (tx) => {
        // ── 1. Insert categories ─────────────────────────────────────────
        const categoryIdMap: Record<string, string> = {}

        for (const cat of starterCategories) {
          const catId = generateId()
          categoryIdMap[cat.name] = catId
          await tx.insert(category).values({
            id: catId,
            name: cat.name,
            description: cat.description ?? `${cat.name} products`,
            userId,
            orgId,
          })
          categoriesCreated++
        }

        // ── 2. Insert products ───────────────────────────────────────────
        for (const item of starterProducts) {
          const catId = categoryIdMap[item.category] ?? null
          await tx.insert(product).values({
            id: generateId(),
            name: item.name,
            sku: item.sku,
            sellingPrice: String(item.sellingPrice),
            buyingPrice: String(item.buyingPrice),
            stock: item.stock,
            minStock: 5,
            unit: item.unit,
            categoryId: catId,
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
