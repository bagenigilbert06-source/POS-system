export const STAFF_DEPARTMENTS = ['sales', 'operations', 'finance', 'support', 'unassigned'] as const
export type StaffDepartment = (typeof STAFF_DEPARTMENTS)[number]

export const STAFF_DEPARTMENT_LABELS: Record<StaffDepartment, string> = {
  sales: 'Sales',
  operations: 'Operations',
  finance: 'Finance',
  support: 'Support',
  unassigned: 'Unassigned',
}

export function normalizeStaffDepartment(value: string | null | undefined): StaffDepartment {
  const normalized = value?.trim().toLowerCase()
  return STAFF_DEPARTMENTS.includes(normalized as StaffDepartment)
    ? normalized as StaffDepartment
    : 'unassigned'
}
