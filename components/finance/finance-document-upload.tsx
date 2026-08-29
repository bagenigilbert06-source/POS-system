'use client';

import { useState } from 'react';
import { Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { notify } from '@/lib/notify';

export function FinanceDocumentUpload({
  entityType,
  entityId,
}: {
  entityType: 'expense' | 'reconciliation_import';
  entityId: string;
}) {
  const [busy, setBusy] = useState(false);
  const upload = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.set('file', file);
      form.set('entityType', entityType);
      form.set('entityId', entityId);
      const response = await fetch('/api/finance/documents', {
        method: 'POST',
        body: form,
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Upload failed');
      notify.success('Supporting document attached');
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <input
        id={`finance-document-${entityId}`}
        type="file"
        accept="application/pdf,image/jpeg,image/png,text/csv,.csv"
        className="sr-only"
        onChange={(event) => void upload(event.target.files?.[0])}
      />
      <Button asChild size="sm" variant="ghost">
        <label
          htmlFor={`finance-document-${entityId}`}
          className="cursor-pointer"
        >
          <Paperclip className="h-4 w-4" />
          <span className="sr-only">
            {busy ? 'Uploading document' : 'Attach document'}
          </span>
        </label>
      </Button>
    </>
  );
}
