'use server'

import { revalidatePath } from 'next/cache'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db'
import { expense } from '@/lib/db/schema'
import { generateId } from '@/lib/utils'
import { requirePermission } from '@/lib/auth/authorization'
import { PermissionEnum } from '@/lib/types/permissions'

const expenseSchema = z.object({
  title: z.string().trim().min(2, 'Enter a clear expense description').max(120),
  amount: z.coerce.number().positive('Amount must be greater than zero').max(999_999_999),
  category: z.enum(['stock', 'rent', 'utilities', 'payroll', 'transport', 'marketing', 'tax', 'maintenance', 'general']),
  notes: z.string().trim().max(500).optional(),
})

async function context(permission = PermissionEnum.EXPENSE_VIEW) {
  const authorization = await requirePermission(permission)
  return { userId: authorization.userId, orgId: authorization.organizationId, authorization }
}

export async function getExpenses() {
  const { orgId, authorization } = await context()
  return db.select().from(expense).where(and(
    eq(expense.orgId, orgId),
    authorization.isOrganizationWide ? undefined : authorization.branchIds.length ? inArray(expense.branchId, authorization.branchIds) : sql`false`,
  )).orderBy(desc(expense.createdAt)).limit(250)
}

export async function createExpense(input: z.input<typeof expenseSchema>) {
  const data = expenseSchema.parse(input)
  const { userId, orgId, authorization } = await context(PermissionEnum.EXPENSE_MANAGE)
  const branchId = authorization.isOrganizationWide ? null : authorization.branchIds[0]
  if (!authorization.isOrganizationWide && !branchId) throw new Error('No assigned branch is available')
  await db.insert(expense).values({
    id: generateId(), userId, orgId, title: data.title, amount: String(data.amount),
    category: data.category, notes: data.notes || null, branchId,
  })
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/expenses')
  revalidatePath('/dashboard/reports')
}

export async function deleteExpense(id: string) {
  if (!z.string().min(1).safeParse(id).success) throw new Error('Invalid expense')
  const { orgId, authorization } = await context(PermissionEnum.EXPENSE_MANAGE)
  await db.delete(expense).where(and(
    eq(expense.id, id), eq(expense.orgId, orgId),
    authorization.isOrganizationWide ? undefined : authorization.branchIds.length ? inArray(expense.branchId, authorization.branchIds) : sql`false`,
  ))
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/expenses')
  revalidatePath('/dashboard/reports')
}
