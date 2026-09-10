export type PosCategory = { id: string; name: string }
export type PosCategoryProduct = { categoryId: string | null; isActive: boolean; stock: number; imageUrl?: string | null }

/** POS category cards must represent products that can actually be sold now. */
export function getSellableCategoryData<T extends PosCategoryProduct>(products: readonly T[], categories: readonly PosCategory[]) {
  const sellableProducts = products.filter((product) => product.isActive && product.stock > 0)
  const categoryIds = new Set(sellableProducts.map((product) => product.categoryId).filter((id): id is string => Boolean(id)))
  const visibleCategories = categories.filter((category) => category.name.trim() && categoryIds.has(category.id))
  const counts = new Map<string, number>()
  const images = new Map<string, string>()
  for (const product of sellableProducts) {
    if (!product.categoryId) continue
    counts.set(product.categoryId, (counts.get(product.categoryId) ?? 0) + 1)
    if (product.imageUrl && !images.has(product.categoryId)) images.set(product.categoryId, product.imageUrl)
  }
  return { sellableProducts, visibleCategories, counts, images }
}
