import { WorkspaceConfig } from '@/lib/types/workspace'

export interface StarterCategory {
  name: string
  description?: string
}

export interface StarterProduct {
  name: string
  sku: string
  price: number
  category: string
  quantity?: number
}

export class StarterDataService {
  /**
   * Generate starter categories for workspace
   */
  static generateCategories(config: WorkspaceConfig): StarterCategory[] {
    return config.template.defaultCategories.map((name) => ({
      name,
      description: `${name} products`,
    }))
  }

  /**
   * Generate starter products for workspace
   */
  static generateProducts(config: WorkspaceConfig): StarterProduct[] {
    return config.template.defaultProducts.map((product) => ({
      ...product,
      quantity: 100,
    }))
  }

  /**
   * Generate starter data manifest
   */
  static createDataManifest(workspaceId: string, config: WorkspaceConfig) {
    return {
      workspaceId,
      businessType: config.businessType,
      customCategory: config.customCategory,
      template: config.template.id,
      categories: this.generateCategories(config),
      products: this.generateProducts(config),
      createdAt: new Date(),
    }
  }

  /**
   * Seed starter data to database
   * This would normally interact with the database
   */
  static async seedStarterData(
    workspaceId: string,
    config: WorkspaceConfig
  ): Promise<boolean> {
    try {
      const manifest = this.createDataManifest(workspaceId, config)
      console.log('[v0] Seeding starter data:', manifest)

      // TODO: Implement actual database seeding
      // This would:
      // 1. Create categories
      // 2. Create products
      // 3. Create default settings
      // 4. Create default views/filters

      return true
    } catch (error) {
      console.error('[v0] Failed to seed starter data:', error)
      return false
    }
  }
}
