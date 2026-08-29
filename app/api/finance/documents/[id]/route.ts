import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { get } from '@vercel/blob';
import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import {
  getAuthorizationContext,
  hasPermission,
} from '@/lib/auth/authorization';
import { db } from '@/lib/db';
import { expense, financeDocument, financialAccount, reconciliationImport } from '@/lib/db/schema';
import { PermissionEnum } from '@/lib/types/permissions';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await getAuthorizationContext();
  if (!hasPermission(context, PermissionEnum.FINANCE_VIEW))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  const [document] = await db
    .select()
    .from(financeDocument)
    .where(
      and(
        eq(financeDocument.id, id),
        eq(financeDocument.organizationId, context.organizationId)
      )
    )
    .limit(1);
  if (!document)
    return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
  if (!context.isOrganizationWide) {
    let entityBranchId: string | null | undefined;
    if (document.entityType === 'expense')
      entityBranchId = await db.select({ branchId: expense.branchId }).from(expense).where(and(eq(expense.id, document.entityId), eq(expense.orgId, context.organizationId))).limit(1).then((rows) => rows[0]?.branchId);
    else if (document.entityType === 'reconciliation_import')
      entityBranchId = await db.select({ branchId: financialAccount.branchId }).from(reconciliationImport).innerJoin(financialAccount, eq(financialAccount.id, reconciliationImport.financialAccountId)).where(and(eq(reconciliationImport.id, document.entityId), eq(reconciliationImport.organizationId, context.organizationId))).limit(1).then((rows) => rows[0]?.branchId);
    if (entityBranchId && !context.branchIds.includes(entityBranchId))
      return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
  }
  const headers = {
    'Content-Type': document.contentType,
    'Content-Disposition': `attachment; filename="${document.filename.replace(/["\r\n]/g, '_')}"`,
    'Cache-Control': 'private, no-store',
  };
  if (document.storageUrl.startsWith('blob:')) {
    const result = await get(document.storageUrl.slice(5), {
      access: 'private',
    });
    if (!result)
      return NextResponse.json(
        { error: 'Stored document is unavailable.' },
        { status: 404 }
      );
    return new Response(result.stream, { headers });
  }
  const storedName = document.storageUrl.slice(6);
  if (!/^[a-f0-9-]+\.(pdf|jpg|png|csv)$/.test(storedName))
    return NextResponse.json(
      { error: 'Invalid document path.' },
      { status: 400 }
    );
  const bytes = await readFile(
    path.join(
      process.cwd(),
      '.data',
      'finance-documents',
      context.organizationId,
      storedName
    )
  );
  return new Response(bytes, { headers });
}
