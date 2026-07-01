/**
 * lib/services/starter-data-service.ts
 *
 * Kept for backward compatibility.
 * All seeding logic has moved to WorkspaceFactory.seedStarterData (private).
 *
 * If you need to re-seed a workspace (e.g. admin tools), use this service
 * which exposes the seeding step directly.
 */

import { db } from '@/lib/db'
import { category, product } from '@/lib/db/schema'
import { generateId } from '@/lib/utils'
import type { WorkspaceTemplate } from '@/lib/templates/types'
import type { WorkspaceConfig } from '@/lib/types/workspace'

export class StarterDataService {
  /**
   * Backward-compatible wrapper used by the onboarding API.
   */
  static async seedStarterData(
    orgId: string,
    userId: string,
    workspaceConfig: WorkspaceConfig
  ): Promise<{ success: boolean; categoriesCreated: number; productsCreated: number }> {
    if (!workspaceConfig?.template) {
      return { success: false, categoriesCreated: 0, productsCreated: 0 }
    }

    return this.seedFromTemplate(orgId, userId, workspaceConfig.template)
  }

  /**
   * Insert starter categories and products for an org.
   * Wraps all inserts in a single DB transaction.
   */
  static async seedFromTemplate(
    orgId: string,
    userId: string,
    template: WorkspaceTemplate
  ): Promise<{ success: boolean; categoriesCreated: number; productsCreated: number }> {
    const { starterCategories, starterProducts } = template

    if (starterCategories.length === 0) {
      return { success: true, categoriesCreated: 0, productsCreated: 0 }
    }

    try {
      let categoriesCreated = 0
      let productsCreated = 0

      await db.transaction(async (tx) => {
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

        for (const item of starterProducts) {
          await tx.insert(product).values({
            id: generateId(),
            name: item.name,
            sku: item.sku,
            sellingPrice: String(item.sellingPrice),
            buyingPrice: String(item.buyingPrice),
            stock: item.stock,
            minStock: 5,
            unit: item.unit,
            categoryId: categoryIdMap[item.category] ?? null,
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
