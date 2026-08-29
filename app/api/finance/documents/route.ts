import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { put } from '@vercel/blob';
import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { NextResponse } from 'next/server';
import {
  getAuthorizationContext,
  hasPermission,
} from '@/lib/auth/authorization';
import { db } from '@/lib/db';
import {
  auditEvent,
  expense,
  financeDocument,
  financialAccount,
  reconciliationImport,
} from '@/lib/db/schema';
import { PermissionEnum } from '@/lib/types/permissions';

const MAX_BYTES = 10 * 1024 * 1024;
const TYPES = new Map([
  ['application/pdf', 'pdf'],
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['text/csv', 'csv'],
]);

async function entityBranch(organizationId: string, type: string, id: string) {
  if (type === 'expense')
    return db
      .select({ branchId: expense.branchId })
      .from(expense)
      .where(and(eq(expense.id, id), eq(expense.orgId, organizationId)))
      .limit(1)
      .then((rows) => rows[0]?.branchId);
  if (type === 'reconciliation_import')
    return db
      .select({ branchId: financialAccount.branchId })
      .from(reconciliationImport)
      .innerJoin(financialAccount, eq(financialAccount.id, reconciliationImport.financialAccountId))
      .where(
        and(
          eq(reconciliationImport.id, id),
          eq(reconciliationImport.organizationId, organizationId)
        )
      )
      .limit(1)
      .then((rows) => rows[0]?.branchId);
  return undefined;
}

export async function POST(request: Request) {
  try {
    const context = await getAuthorizationContext();
    if (!hasPermission(context, PermissionEnum.FINANCE_MANAGE))
      return NextResponse.json(
        { error: 'You do not have permission to upload finance documents.' },
        { status: 403 }
      );
    const form = await request.formData();
    const file = form.get('file');
    const entityType = String(form.get('entityType') || '');
    const entityId = String(form.get('entityId') || '');
    const entityBranchId = entityId ? await entityBranch(context.organizationId, entityType, entityId) : undefined;
    if (
      !(file instanceof File) ||
      !entityId ||
      entityBranchId === undefined ||
      (!context.isOrganizationWide && entityBranchId !== null && !context.branchIds.includes(entityBranchId))
    )
      return NextResponse.json(
        { error: 'Choose a valid finance record and document.' },
        { status: 400 }
      );
    if (!TYPES.has(file.type))
      return NextResponse.json(
        { error: 'Upload a PDF, JPG, PNG, or CSV document.' },
        { status: 415 }
      );
    if (file.size <= 0 || file.size > MAX_BYTES)
      return NextResponse.json(
        { error: 'Document must be smaller than 10 MB.' },
        { status: 413 }
      );
    const bytes = new Uint8Array(await file.arrayBuffer());
    const extension = TYPES.get(file.type)!;
    const storedName = `${crypto.randomUUID()}.${extension}`;
    let storageUrl: string;
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(
        `finance/${context.organizationId}/${storedName}`,
        Buffer.from(bytes),
        { access: 'private', contentType: file.type, addRandomSuffix: false }
      );
      storageUrl = `blob:${blob.url}`;
    } else {
      if (process.env.VERCEL)
        return NextResponse.json(
          { error: 'Private finance document storage is not configured.' },
          { status: 503 }
        );
      const directory = path.join(
        process.cwd(),
        '.data',
        'finance-documents',
        context.organizationId
      );
      await mkdir(directory, { recursive: true });
      await writeFile(path.join(directory, storedName), bytes, { flag: 'wx' });
      storageUrl = `local:${storedName}`;
    }
    const id = nanoid();
    await db.transaction(async (tx) => {
      await tx
        .insert(financeDocument)
        .values({
          id,
          organizationId: context.organizationId,
          entityType,
          entityId,
          filename: file.name.slice(0, 240),
          storageUrl,
          contentType: file.type,
          sizeBytes: file.size,
          uploadedBy: context.userId,
        });
      await tx
        .insert(auditEvent)
        .values({
          id: nanoid(),
          organizationId: context.organizationId,
          userId: context.userId,
          action: 'finance_document.uploaded',
          metadata: {
            documentId: id,
            entityType,
            entityId,
            filename: file.name,
            contentType: file.type,
            sizeBytes: file.size,
          },
        });
    });
    return NextResponse.json({ id, filename: file.name });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Document upload failed.',
      },
      { status: 500 }
    );
  }
}
