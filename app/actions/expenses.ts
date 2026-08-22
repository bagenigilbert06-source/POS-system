'use server';

import { revalidatePath } from 'next/cache';
import { and, desc, eq, gte, ilike, inArray, lt, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { auditEvent, branch, expense, user } from '@/lib/db/schema';
import { generateId } from '@/lib/utils';
import { requirePermission } from '@/lib/auth/authorization';
import { PermissionEnum } from '@/lib/types/permissions';
import { EXPENSE_CATEGORIES, EXPENSE_PAYMENT_METHODS } from '@/lib/expenses';

const expenseSchema = z.object({
  title: z.string().trim().min(2, 'Enter a clear expense description').max(120),
  amount: z.coerce
    .number()
    .positive('Amount must be greater than zero')
    .max(999_999_999),
  category: z.enum(EXPENSE_CATEGORIES),
  paymentMethod: z.enum(EXPENSE_PAYMENT_METHODS),
  branchId: z.string().min(1, 'Choose a location'),
  expenseDate: z.coerce.date(),
  reference: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(500).optional(),
});

const filtersSchema = z.object({
  search: z.string().trim().max(120).optional(),
  category: z.enum(EXPENSE_CATEGORIES).optional(),
  paymentMethod: z.enum(EXPENSE_PAYMENT_METHODS).optional(),
  branchId: z.string().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce
    .number()
    .int()
    .refine((value) => [10, 25, 50].includes(value))
    .default(25),
});

export type ExpenseFilters = z.input<typeof filtersSchema>;
export type ExpenseInput = z.input<typeof expenseSchema>;

async function context(permission = PermissionEnum.EXPENSE_VIEW) {
  const authorization = await requirePermission(permission);
  return {
    userId: authorization.userId,
    orgId: authorization.organizationId,
    authorization,
  };
}

function endExclusive(value?: Date) {
  if (!value) return undefined;
  const date = new Date(value);
  date.setDate(date.getDate() + 1);
  return date;
}

async function expenseScope(input: ExpenseFilters = {}) {
  const filters = filtersSchema.parse(input);
  const { orgId, authorization } = await context();
  if (
    filters.branchId &&
    !authorization.isOrganizationWide &&
    !authorization.branchIds.includes(filters.branchId)
  )
    throw new Error('Location access denied');
  const search = filters.search ? `%${filters.search}%` : undefined;
  const scope = and(
    eq(expense.orgId, orgId),
    authorization.isOrganizationWide
      ? undefined
      : authorization.branchIds.length
        ? inArray(expense.branchId, authorization.branchIds)
        : sql`false`,
    filters.branchId ? eq(expense.branchId, filters.branchId) : undefined,
    filters.category ? eq(expense.category, filters.category) : undefined,
    filters.paymentMethod
      ? eq(expense.paymentMethod, filters.paymentMethod)
      : undefined,
    filters.from ? gte(expense.expenseDate, filters.from) : undefined,
    endExclusive(filters.to)
      ? lt(expense.expenseDate, endExclusive(filters.to)!)
      : undefined,
    search
      ? or(
          ilike(expense.title, search),
          ilike(expense.reference, search),
          ilike(expense.notes, search)
        )
      : undefined
  );
  return { filters, orgId, authorization, scope };
}

export async function getExpensePageData(input: ExpenseFilters = {}) {
  const { filters, orgId, authorization, scope } = await expenseScope(input);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const branchScope = authorization.isOrganizationWide
    ? undefined
    : authorization.branchIds.length
      ? inArray(expense.branchId, authorization.branchIds)
      : sql`false`;
  const baseScope = and(eq(expense.orgId, orgId), branchScope);
  const [rows, [count], [summary], locations] = await Promise.all([
    db
      .select({
        record: expense,
        branchName: branch.name,
        creatorName: user.name,
      })
      .from(expense)
      .leftJoin(branch, eq(branch.id, expense.branchId))
      .leftJoin(user, eq(user.id, expense.userId))
      .where(scope)
      .orderBy(desc(expense.expenseDate), desc(expense.createdAt))
      .limit(filters.pageSize)
      .offset((filters.page - 1) * filters.pageSize),
    db
      .select({ value: sql<number>`count(*)` })
      .from(expense)
      .where(scope),
    db
      .select({
        allTotal: sql<string>`coalesce(sum(${expense.amount}), 0)`,
        allCount: sql<number>`count(*)`,
        todayTotal: sql<string>`coalesce(sum(case when ${expense.expenseDate} >= ${today} and ${expense.expenseDate} < ${tomorrow} then ${expense.amount} else 0 end), 0)`,
        todayCount: sql<number>`count(*) filter (where ${expense.expenseDate} >= ${today} and ${expense.expenseDate} < ${tomorrow})`,
        monthTotal: sql<string>`coalesce(sum(case when ${expense.expenseDate} >= ${monthStart} then ${expense.amount} else 0 end), 0)`,
        monthCount: sql<number>`count(*) filter (where ${expense.expenseDate} >= ${monthStart})`,
        monthLargest: sql<string>`coalesce(max(case when ${expense.expenseDate} >= ${monthStart} then ${expense.amount} end), 0)`,
      })
      .from(expense)
      .where(baseScope),
    db
      .select({ id: branch.id, name: branch.name })
      .from(branch)
      .where(
        and(
          eq(branch.organizationId, orgId),
          authorization.isOrganizationWide
            ? undefined
            : inArray(branch.id, authorization.branchIds)
        )
      )
      .orderBy(desc(branch.isMain), branch.name),
  ]);
  return {
    rows,
    total: Number(count?.value ?? 0),
    page: filters.page,
    pageSize: filters.pageSize,
    summary: {
      allTotal: Number(summary?.allTotal ?? 0),
      allCount: Number(summary?.allCount ?? 0),
      todayTotal: Number(summary?.todayTotal ?? 0),
      todayCount: Number(summary?.todayCount ?? 0),
      monthTotal: Number(summary?.monthTotal ?? 0),
      monthCount: Number(summary?.monthCount ?? 0),
      monthLargest: Number(summary?.monthLargest ?? 0),
    },
    locations,
  };
}

async function validateBranch(
  branchId: string,
  orgId: string,
  authorization: Awaited<ReturnType<typeof requirePermission>>
) {
  if (
    !authorization.isOrganizationWide &&
    !authorization.branchIds.includes(branchId)
  )
    throw new Error('Location access denied');
  const [location] = await db
    .select({ id: branch.id })
    .from(branch)
    .where(and(eq(branch.id, branchId), eq(branch.organizationId, orgId)))
    .limit(1);
  if (!location) throw new Error('Choose a valid location');
}

function refreshExpenses() {
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/expenses');
  revalidatePath('/dashboard/reports');
  revalidatePath('/dashboard/expense-analytics');
}

export async function createExpense(input: ExpenseInput) {
  const data = expenseSchema.parse(input);
  const { userId, orgId, authorization } = await context(
    PermissionEnum.EXPENSE_MANAGE
  );
  await validateBranch(data.branchId, orgId, authorization);
  const id = generateId();
  await db.transaction(async (tx) => {
    await tx.insert(expense).values({
      id,
      userId,
      orgId,
      title: data.title,
      amount: String(data.amount),
      category: data.category,
      paymentMethod: data.paymentMethod,
      branchId: data.branchId,
      expenseDate: data.expenseDate,
      reference: data.reference || null,
      notes: data.notes || null,
    });
    await tx.insert(auditEvent).values({
      id: generateId(),
      organizationId: orgId,
      userId,
      action: 'expense.created',
      metadata: {
        expenseId: id,
        amount: data.amount,
        category: data.category,
        branchId: data.branchId,
      },
    });
  });
  refreshExpenses();
  return { id };
}

export async function updateExpense(id: string, input: ExpenseInput) {
  const data = expenseSchema.parse(input);
  const { userId, orgId, authorization } = await context(
    PermissionEnum.EXPENSE_MANAGE
  );
  await validateBranch(data.branchId, orgId, authorization);
  const recordScope = and(
    eq(expense.id, id),
    eq(expense.orgId, orgId),
    authorization.isOrganizationWide
      ? undefined
      : inArray(expense.branchId, authorization.branchIds)
  );
  const [current] = await db
    .select({ id: expense.id })
    .from(expense)
    .where(recordScope)
    .limit(1);
  if (!current) throw new Error('Expense not found or access denied');
  await db.transaction(async (tx) => {
    await tx
      .update(expense)
      .set({
        title: data.title,
        amount: String(data.amount),
        category: data.category,
        paymentMethod: data.paymentMethod,
        branchId: data.branchId,
        expenseDate: data.expenseDate,
        reference: data.reference || null,
        notes: data.notes || null,
        updatedAt: new Date(),
      })
      .where(recordScope);
    await tx.insert(auditEvent).values({
      id: generateId(),
      organizationId: orgId,
      userId,
      action: 'expense.updated',
      metadata: {
        expenseId: id,
        amount: data.amount,
        category: data.category,
        branchId: data.branchId,
      },
    });
  });
  refreshExpenses();
}

export async function deleteExpense(id: string) {
  if (!z.string().min(1).safeParse(id).success)
    throw new Error('Invalid expense');
  const { userId, orgId, authorization } = await context(
    PermissionEnum.EXPENSE_MANAGE
  );
  const recordScope = and(
    eq(expense.id, id),
    eq(expense.orgId, orgId),
    authorization.isOrganizationWide
      ? undefined
      : inArray(expense.branchId, authorization.branchIds)
  );
  const [current] = await db
    .select({
      id: expense.id,
      title: expense.title,
      amount: expense.amount,
      branchId: expense.branchId,
    })
    .from(expense)
    .where(recordScope)
    .limit(1);
  if (!current) throw new Error('Expense not found or access denied');
  await db.transaction(async (tx) => {
    await tx.delete(expense).where(recordScope);
    await tx.insert(auditEvent).values({
      id: generateId(),
      organizationId: orgId,
      userId,
      action: 'expense.deleted',
      metadata: {
        expenseId: id,
        title: current.title,
        amount: current.amount,
        branchId: current.branchId,
      },
    });
  });
  refreshExpenses();
}
