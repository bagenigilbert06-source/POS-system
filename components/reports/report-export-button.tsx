'use client';

import { Download } from 'lucide-react';

export type ExportCell = string | number | null;
export type ExportBlock = {
  title: string;
  headers?: string[];
  rows: ExportCell[][];
};

function csvCell(value: ExportCell) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

export function ReportExportButton({
  section,
  from,
  to,
  location,
  currency,
  blocks,
}: {
  section: string;
  from: string;
  to: string;
  location: string;
  currency: string;
  blocks: ExportBlock[];
}) {
  function download() {
    const rows: ExportCell[][] = [
      [`Pesaby ${section === 'products' ? 'stock items' : section} report`],
      ['Period', from === to ? from : `${from} to ${to}`],
      ['Location', location],
      ['Currency', currency],
    ];
    for (const block of blocks) {
      rows.push([], [block.title]);
      if (block.headers) rows.push(block.headers);
      rows.push(...block.rows);
    }
    const blob = new Blob(
      [`\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\n')}`],
      { type: 'text/csv;charset=utf-8' }
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    const period =
      from.slice(0, 7) === to.slice(0, 7) ? from.slice(0, 7) : `${from}-${to}`;
    anchor.download = `pesaby-${section}-${period}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  return (
    <button
      type="button"
      onClick={download}
      className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] px-3 text-xs font-semibold shadow-sm transition-colors hover:bg-[var(--dashboard-surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dashboard-accent)]"
    >
      <Download className="h-4 w-4 text-[var(--dashboard-accent)]" />
      Export CSV
    </button>
  );
}
