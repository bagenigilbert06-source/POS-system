'use client';

import { useTransition } from 'react';
import { Download } from 'lucide-react';
import { notify } from '@/lib/notify';
import { exportInventoryMovementsCsv } from '@/app/actions/stock-adjustments';
import { Button } from '@/components/ui/button';

export function MovementExportButton({
  filters,
}: {
  filters: {
    search?: string;
    branchId?: string;
    movementType?: string;
    userId?: string;
    from?: string;
    to?: string;
  };
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            const result = await exportInventoryMovementsCsv(filters);
            const url = URL.createObjectURL(
              new Blob([result.csv], { type: 'text/csv;charset=utf-8' })
            );
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = result.filename;
            anchor.click();
            URL.revokeObjectURL(url);
          } catch (error) {
            notify.error(
              error instanceof Error ? error.message : 'Export failed'
            );
          }
        })
      }
    >
      <Download className="mr-2 h-4 w-4" />
      {pending ? 'Exporting…' : 'Export filtered CSV'}
    </Button>
  );
}
