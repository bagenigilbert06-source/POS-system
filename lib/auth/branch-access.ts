export type BranchAccessScope = {
  isOrganizationWide: boolean
  branchIds: readonly string[]
}

/** Shared server-side branch boundary. Browser-provided IDs are never trusted. */
export function canAccessBranch(scope: BranchAccessScope, branchId: string) {
  return scope.isOrganizationWide || scope.branchIds.includes(branchId)
}
