'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { and, desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { expense } from '@/lib/db/schema'
import { OrganizationService } from '@/lib/services/organization-service'
import { generateId } from '@/lib/utils'

const expenseSchema = z.object({
  title: z.string().trim().min(2, 'Enter a clear expense description').max(120),
  amount: z.coerce.number().positive('Amount must be greater than zero').max(999_999_999),
  category: z.enum(['stock', 'rent', 'utilities', 'payroll', 'transport', 'marketing', 'tax', 'maintenance', 'general']),
  notes: z.string().trim().max(500).optional(),
})

async function context() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  const organization = await OrganizationService.getPrimaryOrganization(session.user.id)
  if (!organization) throw new Error('No organization available')
  return { userId: session.user.id, orgId: organization.id }
}

export async function getExpenses() {
  const { orgId } = await context()
  return db.select().from(expense).where(eq(expense.orgId, orgId)).orderBy(desc(expense.createdAt)).limit(250)
}

export async function createExpense(input: z.input<typeof expenseSchema>) {
  const data = expenseSchema.parse(input)
  const { userId, orgId } = await context()
  await db.insert(expense).values({
    id: generateId(), userId, orgId, title: data.title, amount: String(data.amount),
    category: data.category, notes: data.notes || null,
  })
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/expenses')
  revalidatePath('/dashboard/reports')
}

export async function deleteExpense(id: string) {
  if (!z.string().min(1).safeParse(id).success) throw new Error('Invalid expense')
  const { orgId } = await context()
  await db.delete(expense).where(and(eq(expense.id, id), eq(expense.orgId, orgId)))
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/expenses')
  revalidatePath('/dashboard/reports')
}
