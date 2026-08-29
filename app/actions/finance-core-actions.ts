'use server';

import { createHash } from 'crypto';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  getAuthorizationContext,
  hasPermission,
  type AuthorizationContext,
} from '@/lib/auth/authorization';
import { db } from '@/lib/db';
import {
  auditEvent,
  branch,
  expense,
  externalFinancialTransaction,
  financeApproval,
  financeApprovalPolicy,
  financialAccount,
  invoicePayment,
  reconciliationImport,
  reconciliationMatch,
  salePayment,
} from '@/lib/db/schema';
import { reconciliationResult } from '@/lib/finance/operations';
import { money } from '@/lib/finance/money';
import { PermissionEnum } from '@/lib/types/permissions';
import { finalizeApprovedExpense } from '@/app/actions/expenses';

async function authorize(manage = false) {
  const context = await getAuthorizationContext();
  const permission = manage
    ? PermissionEnum.FINANCE_MANAGE
    : PermissionEnum.FINANCE_VIEW;
  if (!hasPermission(context, permission))
    throw new Error(
      'You do not have permission to perform this finance action.'
    );
  return context;
}

function canUseBranch(
  context: AuthorizationContext,
  branchId: string | null | undefined
) {
  return (
    context.isOrganizationWide ||
    (!!branchId && context.branchIds.includes(branchId))
  );
}

async function requireBranch(context: AuthorizationContext, branchId: string) {
  if (!canUseBranch(context, branchId))
    throw new Error('You do not have access to this branch.');
  const [record] = await db
    .select({ id: branch.id })
    .from(branch)
    .where(
      and(
        eq(branch.id, branchId),
        eq(branch.organizationId, context.organizationId)
      )
    )
    .limit(1);
  if (!record) throw new Error('Branch not found.');
  return record.id;
}

function refresh() {
  for (const path of [
    '/dashboard/financials',
    '/dashboard/finance/accounts',
    '/dashboard/finance/reconciliation',
    '/dashboard/finance/approvals',
    '/dashboard/finance/audit',
  ])
    revalidatePath(path);
}

const accountSchema = z.object({
  name: z.string().trim().min(2).max(100),
  type: z.enum([
    'mpesa_till',
    'mpesa_paybill',
    'airtel_money',
    'bank',
    'card_settlement',
  ]),
  branchId: z.string().optional(),
  provider: z.string().trim().max(80).optional(),
  maskedIdentifier: z.string().trim().max(80).optional(),
  reconciliationEnabled: z.boolean().default(true),
});
export async function createFinancialAccount(
  input: z.input<typeof accountSchema>
) {
  const context = await authorize(true);
  const data = accountSchema.parse(input);
  if (data.branchId) await requireBranch(context, data.branchId);
  const [record] = await db
    .insert(financialAccount)
    .values({
      id: nanoid(),
      organizationId: context.organizationId,
      branchId: data.branchId,
      name: data.name,
      type: data.type,
      provider: data.provider,
      maskedIdentifier: data.maskedIdentifier,
      reconciliationEnabled: data.reconciliationEnabled,
      createdBy: context.userId,
    })
    .returning();
  await db
    .insert(auditEvent)
    .values({
      id: nanoid(),
      organizationId: context.organizationId,
      userId: context.userId,
      action: 'financial_account.created',
      metadata: {
        accountId: record.id,
        name: record.name,
        type: record.type,
        branchId: record.branchId,
      },
    });
  refresh();
  return { success: true, account: record };
}

export async function setFinancialAccountActive(id: string, active: boolean) {
  const context = await authorize(true);
  const [account] = await db
    .select({ id: financialAccount.id, branchId: financialAccount.branchId, name: financialAccount.name })
    .from(financialAccount)
    .where(and(eq(financialAccount.id, id), eq(financialAccount.organizationId, context.organizationId)))
    .limit(1);
  if (!account || !canUseBranch(context, account.branchId)) throw new Error('Payment account not found.');
  await db.update(financialAccount).set({ isActive: active, updatedAt: new Date() }).where(eq(financialAccount.id, id));
  await db.insert(auditEvent).values({ id: nanoid(), organizationId: context.organizationId, userId: context.userId, action: active ? 'financial_account.reactivated' : 'financial_account.disabled', metadata: { accountId: account.id, name: account.name } });
  refresh();
  return { success: true };
}

const externalRowSchema = z.object({
  externalId: z.string().trim().min(1).max(160),
  transactionAt: z.coerce.date(),
  amount: z.number().positive().finite(),
  feeAmount: z.number().nonnegative().finite().default(0),
  direction: z.enum(['inflow', 'outflow']),
  description: z.string().trim().max(500).optional(),
  reference: z.string().trim().max(160).optional(),
});
const importSchema = z.object({
  financialAccountId: z.string().min(1),
  filename: z.string().trim().min(1).max(200),
  rows: z.array(externalRowSchema).min(1).max(5000),
});
export async function importReconciliationStatement(
  input: z.input<typeof importSchema>
) {
  const context = await authorize(true);
  const data = importSchema.parse(input);
  const [account] = await db
    .select()
    .from(financialAccount)
    .where(
      and(
        eq(financialAccount.id, data.financialAccountId),
        eq(financialAccount.organizationId, context.organizationId)
      )
    )
    .limit(1);
  if (!account || !canUseBranch(context, account.branchId) || !account.isActive || !account.reconciliationEnabled || ['cash', 'cash_drawer'].includes(account.type))
    throw new Error('Payment account not found.');
  const canonical = data.rows.map((row) => ({
    ...row,
    transactionAt: row.transactionAt.toISOString(),
    amount: money(row.amount).toFixed(2),
    feeAmount: money(row.feeAmount).toFixed(2),
  }));
  const fileHash = createHash('sha256')
    .update(JSON.stringify(canonical))
    .digest('hex');
  const result = await db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`${context.organizationId}:statement:${fileHash}`}, 0))`
    );
    const [prior] = await tx
      .select()
      .from(reconciliationImport)
      .where(
        and(
          eq(reconciliationImport.organizationId, context.organizationId),
          eq(reconciliationImport.fileHash, fileHash)
        )
      )
      .limit(1);
    if (prior) return { importRecord: prior, duplicate: true, importedRows: 0 };
    const id = nanoid();
    const dates = data.rows.map((row) => row.transactionAt.getTime());
    const [importRecord] = await tx
      .insert(reconciliationImport)
      .values({
        id,
        organizationId: context.organizationId,
        financialAccountId: account.id,
        filename: data.filename,
        fileHash,
        statementFrom: new Date(Math.min(...dates)),
        statementTo: new Date(Math.max(...dates)),
        rowCount: data.rows.length,
        importedBy: context.userId,
      })
      .returning();
    const rows = data.rows.map((row) => {
      const rowHash = createHash('sha256')
        .update(
          [
            row.externalId,
            row.transactionAt.toISOString(),
            money(row.amount).toFixed(2),
            row.direction,
          ].join('|')
        )
        .digest('hex');
      return {
        id: nanoid(),
        organizationId: context.organizationId,
        financialAccountId: account.id,
        importId: id,
        externalId: row.externalId,
        transactionAt: row.transactionAt,
        amount: money(row.amount).toFixed(2),
        feeAmount: money(row.feeAmount).toFixed(2),
        direction: row.direction,
        description: row.description,
        reference: row.reference,
        rowHash,
      };
    });
    await tx
      .insert(externalFinancialTransaction)
      .values(rows)
      .onConflictDoNothing();
    await tx
      .insert(auditEvent)
      .values({
        id: nanoid(),
        organizationId: context.organizationId,
        userId: context.userId,
        action: 'reconciliation.statement_imported',
        metadata: {
          importId: id,
          financialAccountId: account.id,
          filename: data.filename,
          fileHash,
          rowCount: rows.length,
        },
      });
    return { importRecord, duplicate: false, importedRows: rows.length };
  });
  refresh();
  return { success: true, ...result };
}

const matchSchema = z.object({
  externalTransactionId: z.string().min(1),
  systemType: z.enum(['sale_payment', 'invoice_payment', 'expense']),
  systemId: z.string().min(1),
  reason: z.string().trim().max(500).optional(),
  idempotencyKey: z.string().min(8).max(120),
});
export async function reconcileTransaction(input: z.input<typeof matchSchema>) {
  const context = await authorize(true);
  const data = matchSchema.parse(input);
  const result = await db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`${context.organizationId}:reconcile:${data.idempotencyKey}`}, 0))`
    );
    const [prior] = await tx
      .select()
      .from(reconciliationMatch)
      .where(
        and(
          eq(reconciliationMatch.organizationId, context.organizationId),
          eq(reconciliationMatch.idempotencyKey, data.idempotencyKey)
        )
      )
      .limit(1);
    if (prior) return { match: prior, duplicate: true };
    const [external] = await tx
      .select()
      .from(externalFinancialTransaction)
      .where(
        and(
          eq(externalFinancialTransaction.id, data.externalTransactionId),
          eq(
            externalFinancialTransaction.organizationId,
            context.organizationId
          )
        )
      )
      .limit(1)
      .for('update');
    if (!external || external.status === 'matched')
      throw new Error(
        external
          ? 'This statement transaction is already reconciled.'
          : 'Statement transaction not found.'
      );
    const system =
      data.systemType === 'sale_payment'
        ? await tx
            .select({ id: salePayment.id, amount: salePayment.amount })
            .from(salePayment)
            .where(
              and(
                eq(salePayment.id, data.systemId),
                eq(salePayment.orgId, context.organizationId)
              )
            )
            .limit(1)
            .then((rows) => rows[0])
        : data.systemType === 'invoice_payment' ? await tx
            .select({ id: invoicePayment.id, amount: invoicePayment.amount })
            .from(invoicePayment)
            .where(
              and(
                eq(invoicePayment.id, data.systemId),
                eq(invoicePayment.organizationId, context.organizationId)
              )
            )
            .limit(1)
            .then((rows) => rows[0])
        : await tx.select({ id: expense.id, amount: expense.amount, financialAccountId: expense.financialAccountId }).from(expense).where(and(eq(expense.id, data.systemId), eq(expense.orgId, context.organizationId), eq(expense.status, 'effective'))).limit(1).then((rows) => rows[0]);
    if (!system) throw new Error('System payment not found.');
    if (data.systemType === 'expense' && (system as { financialAccountId?: string | null }).financialAccountId !== external.financialAccountId)
      throw new Error('This expense belongs to a different Payment Account.');
    const [existingSystemMatch] = await tx
      .select({ id: reconciliationMatch.id })
      .from(reconciliationMatch)
      .where(
        and(
          eq(reconciliationMatch.organizationId, context.organizationId),
          eq(reconciliationMatch.systemType, data.systemType),
          eq(reconciliationMatch.systemId, data.systemId)
        )
      )
      .limit(1);
    if (existingSystemMatch)
      throw new Error('This Pesaby payment is already matched to a statement transaction.');
    const comparison = reconciliationResult(system.amount, external.amount);
    if (
      comparison.status === 'difference' &&
      (!data.reason || data.reason.length < 3)
    )
      throw new Error('Explain the reconciliation difference before saving.');
    const id = nanoid();
    const [match] = await tx
      .insert(reconciliationMatch)
      .values({
        id,
        organizationId: context.organizationId,
        externalTransactionId: external.id,
        systemType: data.systemType,
        systemId: system.id,
        systemAmount: system.amount,
        externalAmount: external.amount,
        difference: comparison.difference.toFixed(2),
        status: comparison.status,
        reason: data.reason,
        idempotencyKey: data.idempotencyKey,
        matchedBy: context.userId,
      })
      .returning();
    await tx
      .update(externalFinancialTransaction)
      .set({ status: comparison.status, updatedAt: new Date() })
      .where(eq(externalFinancialTransaction.id, external.id));
    await tx
      .insert(auditEvent)
      .values({
        id: nanoid(),
        organizationId: context.organizationId,
        userId: context.userId,
        action: 'reconciliation.matched',
        metadata: {
          matchId: id,
          externalTransactionId: external.id,
          systemType: data.systemType,
          systemId: system.id,
          difference: comparison.difference.toFixed(2),
          reason: data.reason,
        },
      });
    return { match, duplicate: false };
  });
  refresh();
  return { success: true, ...result };
}

export async function ignoreExternalTransaction(id: string, reason: string) {
  const context = await authorize(true);
  if (reason.trim().length < 3)
    throw new Error('Enter a reason for ignoring this transaction.');
  const [record] = await db
    .update(externalFinancialTransaction)
    .set({
      status: 'ignored',
      ignoredReason: reason.trim(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(externalFinancialTransaction.id, id),
        eq(externalFinancialTransaction.organizationId, context.organizationId),
        sql`${externalFinancialTransaction.status} <> 'matched'`
      )
    )
    .returning();
  if (!record)
    throw new Error('Transaction was not found or is already matched.');
  await db
    .insert(auditEvent)
    .values({
      id: nanoid(),
      organizationId: context.organizationId,
      userId: context.userId,
      action: 'reconciliation.ignored',
      metadata: { externalTransactionId: id, reason: reason.trim() },
    });
  refresh();
  return { success: true };
}

const approvalRequestSchema = z.object({
  branchId: z.string().optional(),
  actionType: z.string().trim().min(2).max(80),
  entityType: z.string().trim().min(2).max(80),
  entityId: z.string().trim().min(1).max(160),
  amount: z.number().nonnegative().finite(),
  reason: z.string().trim().min(3).max(500),
  idempotencyKey: z.string().min(8).max(120),
});
export async function requestFinanceApproval(
  input: z.input<typeof approvalRequestSchema>
) {
  const context = await authorize(true);
  const data = approvalRequestSchema.parse(input);
  if (data.branchId) await requireBranch(context, data.branchId);
  const result = await db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`${context.organizationId}:approval:${data.idempotencyKey}`}, 0))`
    );
    const [existing] = await tx
      .select()
      .from(financeApproval)
      .where(
        and(
          eq(financeApproval.organizationId, context.organizationId),
          eq(financeApproval.idempotencyKey, data.idempotencyKey)
        )
      )
      .limit(1);
    if (existing) return { approval: existing, duplicate: true };
    const [policy] = await tx
      .select()
      .from(financeApprovalPolicy)
      .where(
        and(
          eq(financeApprovalPolicy.organizationId, context.organizationId),
          eq(financeApprovalPolicy.actionType, data.actionType),
          eq(financeApprovalPolicy.isActive, true)
        )
      )
      .limit(1);
    const status =
      policy && money(data.amount).greaterThanOrEqualTo(policy.thresholdAmount)
        ? 'pending'
        : 'not_required';
    const [approval] = await tx
      .insert(financeApproval)
      .values({
        id: nanoid(),
        organizationId: context.organizationId,
        branchId: data.branchId,
        actionType: data.actionType,
        entityType: data.entityType,
        entityId: data.entityId,
        amount: money(data.amount).toFixed(2),
        reason: data.reason,
        status,
        requestedBy: context.userId,
        idempotencyKey: data.idempotencyKey,
      })
      .returning();
    await tx
      .insert(auditEvent)
      .values({
        id: nanoid(),
        organizationId: context.organizationId,
        userId: context.userId,
        action: 'finance_approval.requested',
        metadata: {
          approvalId: approval.id,
          actionType: data.actionType,
          entityType: data.entityType,
          entityId: data.entityId,
          amount: approval.amount,
          status,
          branchId: data.branchId,
        },
      });
    return { approval, duplicate: false };
  });
  refresh();
  return { success: true, ...result };
}

const approvalPolicySchema = z.object({
  actionType: z.string().trim().min(2).max(80),
  thresholdAmount: z.number().nonnegative().finite(),
  preventSelfApproval: z.boolean().default(true),
  isActive: z.boolean().default(true),
});
export async function setFinanceApprovalPolicy(
  input: z.input<typeof approvalPolicySchema>
) {
  const context = await authorize(true);
  const data = approvalPolicySchema.parse(input);
  const [record] = await db
    .insert(financeApprovalPolicy)
    .values({
      id: nanoid(),
      organizationId: context.organizationId,
      actionType: data.actionType,
      thresholdAmount: money(data.thresholdAmount).toFixed(2),
      preventSelfApproval: data.preventSelfApproval,
      isActive: data.isActive,
    })
    .onConflictDoUpdate({
      target: [
        financeApprovalPolicy.organizationId,
        financeApprovalPolicy.actionType,
      ],
      set: {
        thresholdAmount: money(data.thresholdAmount).toFixed(2),
        preventSelfApproval: data.preventSelfApproval,
        isActive: data.isActive,
        updatedAt: new Date(),
      },
    })
    .returning();
  await db
    .insert(auditEvent)
    .values({
      id: nanoid(),
      organizationId: context.organizationId,
      userId: context.userId,
      action: 'finance_approval.policy_saved',
      metadata: {
        policyId: record.id,
        actionType: record.actionType,
        thresholdAmount: record.thresholdAmount,
        preventSelfApproval: record.preventSelfApproval,
        isActive: record.isActive,
      },
    });
  refresh();
  return { success: true, policy: record };
}

export async function decideFinanceApproval(
  approvalId: string,
  decision: 'approved' | 'rejected',
  reason: string
) {
  const context = await authorize(true);
  if (reason.trim().length < 3) throw new Error('Enter a decision reason.');
  const result = await db.transaction(async (tx) => {
    const [approval] = await tx
      .select()
      .from(financeApproval)
      .where(
        and(
          eq(financeApproval.id, approvalId),
          eq(financeApproval.organizationId, context.organizationId)
        )
      )
      .limit(1)
      .for('update');
    if (!approval || !canUseBranch(context, approval.branchId))
      throw new Error('Approval request not found.');
    if (approval.status !== 'pending')
      throw new Error('This approval request has already been decided.');
    const [policy] = await tx
      .select()
      .from(financeApprovalPolicy)
      .where(
        and(
          eq(financeApprovalPolicy.organizationId, context.organizationId),
          eq(financeApprovalPolicy.actionType, approval.actionType),
          eq(financeApprovalPolicy.isActive, true)
        )
      )
      .limit(1);
    if (policy?.preventSelfApproval && approval.requestedBy === context.userId)
      throw new Error('Organization policy prevents self-approval.');
    if (decision === 'approved' && approval.entityType === 'expense')
      await finalizeApprovedExpense(tx, approval.entityId, context.userId);
    if (decision === 'rejected' && approval.entityType === 'expense') {
      await tx.update(expense).set({ status: 'rejected', updatedAt: new Date() }).where(and(eq(expense.id, approval.entityId), eq(expense.orgId, context.organizationId), eq(expense.status, 'pending')));
      await tx.insert(auditEvent).values({ id: nanoid(), organizationId: context.organizationId, userId: context.userId, action: 'expense.rejected', metadata: { expenseId: approval.entityId, approvalId, amount: approval.amount, branchId: approval.branchId, reason: reason.trim() } });
    }
    const [updated] = await tx
      .update(financeApproval)
      .set({
        status: decision,
        decidedBy: context.userId,
        decisionReason: reason.trim(),
        decidedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(financeApproval.id, approval.id),
          eq(financeApproval.status, 'pending')
        )
      )
      .returning();
    if (!updated) throw new Error('This approval was decided by another user.');
    await tx
      .insert(auditEvent)
      .values({
        id: nanoid(),
        organizationId: context.organizationId,
        userId: context.userId,
        action: `finance_approval.${decision}`,
        metadata: {
          approvalId,
          actionType: approval.actionType,
          entityType: approval.entityType,
          entityId: approval.entityId,
          amount: approval.amount,
          reason: reason.trim(),
          branchId: approval.branchId,
        },
      });
    return updated;
  });
  refresh();
  return { success: true, approval: result };
}
