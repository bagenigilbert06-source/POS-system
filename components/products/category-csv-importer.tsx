'use client';
import { useMemo, useState, useTransition } from 'react';
import {
  importCategoriesFromCsv,
  previewCategoryImport,
} from '@/app/actions/category-import';
import { notify } from '@/lib/notify';
import { useRouter } from 'next/navigation';
const headers = ['name', 'description'];
const example = ['Whisky', 'Whisky and whiskey products'];
function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = '',
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"' && quoted && text[i + 1] === '"') {
      cell += '"';
      i++;
    } else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) {
      row.push(cell.trim());
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = '';
    } else cell += char;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}
export function CategoryCsvImporter() {
  const router = useRouter();
  const [text, setText] = useState(
      `${headers.join(',')}\n${example.join(',')}`
    ),
    [preview, setPreview] = useState<Awaited<
      ReturnType<typeof previewCategoryImport>
    > | null>(null),
    [pending, startTransition] = useTransition();
  const parsed = useMemo(() => {
    const data = parseCsv(text.replace(/^\uFEFF/, ''));
    if (!data.length)
      return {
        rows: [] as Array<{
          rowNumber: number;
          name: string;
          description?: string;
        }>,
        error: 'CSV is empty.',
      };
    const index = new Map(
      data[0].map((name, position) => [
        name
          .trim()
          .toLowerCase()
          .replace(/[ _-]+/g, ''),
        position,
      ])
    );
    const nameIndex = index.get('name') ?? index.get('categoryname');
    if (nameIndex === undefined)
      return { rows: [], error: "Required column 'name' was not found." };
    return {
      rows: data
        .slice(1, 501)
        .map((cells, offset) => ({
          rowNumber: offset + 2,
          name: cells[nameIndex] || '',
          description: cells[index.get('description') ?? -1] || '',
        })),
      error: data.length > 501 ? 'Maximum import size is 500 rows.' : undefined,
    };
  }, [text]);
  const downloadTemplate = () => {
    const blob = new Blob([`${headers.join(',')}\n${example.join(',')}\n`], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'categories-template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };
  const previewRows = () =>
    startTransition(async () => {
      try {
        if (parsed.error) throw new Error(parsed.error);
        setPreview(await previewCategoryImport({ rows: parsed.rows }));
      } catch (error) {
        notify.error(
          error instanceof Error ? error.message : 'Unable to preview CSV'
        );
      }
    });
  const confirm = () =>
    startTransition(async () => {
      try {
        const result = await importCategoriesFromCsv({ rows: parsed.rows });
        notify.success(`${result.imported} categories imported`);
        router.push('/dashboard/products/categories');
        router.refresh();
      } catch (error) {
        notify.error(error instanceof Error ? error.message : 'Import failed', {
          duration: 10000,
        });
      }
    });
  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">CSV category import</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Create-only import, maximum 500 categories. Existing categories
              are skipped.
            </p>
          </div>
          <button
            type="button"
            onClick={downloadTemplate}
            className="rounded-md border px-3 py-2 text-xs font-semibold hover:bg-muted"
          >
            Download CSV template
          </button>
        </div>
        <input
          type="file"
          accept=".csv,text/csv"
          className="mt-4 block text-xs"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (file && file.size <= 2 * 1024 * 1024) {
              setText(await file.text());
              setPreview(null);
            } else if (file)
              notify.error('CSV file must be smaller than 2 MB.');
          }}
        />
        <textarea
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setPreview(null);
          }}
          rows={12}
          spellCheck={false}
          className="mt-4 w-full rounded-lg border bg-background p-3 font-mono text-[11px]"
        />
      </section>
      {parsed.error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {parsed.error}
        </p>
      )}
      <p className="rounded-xl border bg-card p-4 text-sm">
        <b>{parsed.rows.length}</b> rows ready. Supported columns:{' '}
        {headers.join(', ')}.
      </p>
      {preview && (
        <section className="rounded-xl border bg-card p-4">
          <div className="flex gap-5 text-sm">
            <span>
              <b>{preview.validRows}</b> new
            </span>
            <span>
              <b>{preview.invalidRows}</b> invalid
            </span>
          </div>
          {preview.warnings.length > 0 && (
            <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
              {preview.warnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          )}
          {preview.errors.length > 0 && (
            <div className="mt-3 max-h-64 space-y-1 overflow-auto rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
              {preview.errors.map((error, index) => (
                <p key={`${error.rowNumber}-${index}`}>
                  Row {error.rowNumber}: {error.message}
                </p>
              ))}
            </div>
          )}
        </section>
      )}
      <div className="flex justify-end gap-2">
        <button
          disabled={pending || Boolean(parsed.error) || !parsed.rows.length}
          onClick={previewRows}
          className="rounded-lg border px-4 py-2.5 text-sm font-semibold disabled:opacity-40"
        >
          {pending ? 'Checking…' : 'Validate & preview'}
        </button>
        {preview && (
          <button
            disabled={
              pending || preview.invalidRows > 0 || preview.validRows === 0
            }
            onClick={confirm}
            className="rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-background disabled:opacity-40"
          >
            Import {preview.validRows} new
          </button>
        )}
      </div>
    </div>
  );
}
