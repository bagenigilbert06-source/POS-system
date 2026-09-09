'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  importProductsFromCsv,
  previewProductImport,
} from '@/app/actions/product-import';
import { notify } from '@/lib/notify';
import { useRouter } from 'next/navigation';
import type { ProductImportStatus } from '@/lib/products/product-import-types';

const headers = [
  'name',
  'sku',
  'barcode',
  'category',
  'costPrice',
  'sellingPrice',
  'openingStock',
  'ageRestricted',
];
const optionalHeaders = ['isActive'];
const example = [
  'Jameson 750ML',
  'INV00235',
  '',
  'Whisky',
  '2376.27',
  '2800',
  '12',
  'true',
];
type Row = { rowNumber: number; [key: string]: string | number | undefined };

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

export function ProductCsvImporter({
  branches,
  categories,
}: {
  branches: Array<{ id: string; name: string; code: string }>;
  categories: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<ProductImportStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [categoryOverrides, setCategoryOverrides] = useState<Record<number, string>>({});
  const [bulkCategory, setBulkCategory] = useState('');
  const [result, setResult] = useState<Awaited<ReturnType<typeof importProductsFromCsv>> | null>(null);
  const [branchId, setBranchId] = useState(branches[0]?.id ?? ''),
    [text, setText] = useState(`${headers.join(',')}\n${example.join(',')}`),
    [preview, setPreview] = useState<Awaited<
      ReturnType<typeof previewProductImport>
    > | null>(null),
    [pending, startTransition] = useTransition();
  const parsed = useMemo(() => {
    const data = parseCsv(text);
    if (!data.length) return { rows: [] as Row[], error: 'CSV is empty.' };
    const actual = data[0].map((cell) => cell.trim());
    const missing = headers.filter((header) => !actual.includes(header));
    if (missing.length)
      return {
        rows: [] as Row[],
        error: `Missing columns: ${missing.join(', ')}`,
      };
    const index = new Map(actual.map((header, position) => [header, position]));
    return {
      rows: data
        .slice(1, 501)
        .map(
          (cells, offset) =>
            Object.fromEntries(
              [...headers, ...optionalHeaders]
                .map((header) => [
                  header,
                  index.has(header) ? cells[index.get(header)!] || '' : '',
                ])
                .concat([['rowNumber', String(offset + 2)]])
            ) as Row
        ),
      error: data.length > 501 ? 'Maximum import size is 500 rows.' : undefined,
    };
  }, [text]);
  const request = () => ({
    branchId,
    rows: parsed.rows.map((row) => ({
      rowNumber: Number(row.rowNumber),
      name: String(row.name),
      sku: String(row.sku),
      barcode: String(row.barcode),
      category: categoryOverrides[Number(row.rowNumber)] || String(row.category),
      costPrice: String(row.costPrice),
      sellingPrice: String(row.sellingPrice),
      openingStock: String(row.openingStock),
      ageRestricted: String(row.ageRestricted),
      isActive: String(row.isActive || ''),
    })),
  });
  const previewRows = () =>
    startTransition(async () => {
      try {
        if (parsed.error) throw new Error(parsed.error);
        if (!branchId) throw new Error('Select an inventory branch.');
        setPreview(await previewProductImport(request()));
      } catch (error) {
        notify.error(
          error instanceof Error ? error.message : 'Unable to preview this CSV'
        );
      }
    });
  const confirm = () =>
    startTransition(async () => {
      try {
        const result = await importProductsFromCsv(request());
        setResult(result);
        notify.success(`${result.imported} products imported`);
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
        <h2 className="text-sm font-semibold">CSV catalogue import</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Create-only import. Product codes are SKUs, not barcodes. Maximum 500
          rows.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[260px_1fr]">
          <label className="grid gap-1 text-sm font-medium">
            Inventory branch
            <select
              value={branchId}
              onChange={(event) => {
                setBranchId(event.target.value);
                setPreview(null);
              }}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name} ({branch.code})
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium">
            CSV file
            <input
              type="file"
              accept=".csv,text/csv"
              className="text-xs"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (file) {
                  setText(await file.text());
                  setPreview(null);
                }
              }}
            />
          </label>
        </div>
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
      <section className="rounded-xl border bg-card p-4 text-sm">
        <p>
          <b>{parsed.rows.length}</b> rows ready for server-side preview.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Required values: name, SKU and sellingPrice. Optional or derived: barcode, category, costPrice, openingStock (defaults to 0), ageRestricted and isActive.
        </p>
      </section>
      {preview && (
        <section className="rounded-xl border bg-card p-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {([['ALL','Total rows',preview.totalRows],['READY','Ready',preview.counts.READY],['REVIEW_REQUIRED','Review',preview.counts.REVIEW_REQUIRED],['DUPLICATE','Duplicates',preview.counts.DUPLICATE],['EXCLUDED','Excluded',preview.counts.EXCLUDED],['INVALID','Invalid',preview.counts.INVALID]] as const).map(([status,label,count]) => <button key={status} type="button" onClick={() => setStatusFilter(status)} className={`rounded-lg border p-3 text-left ${statusFilter === status ? 'border-primary bg-primary/5' : ''}`}><span className="block text-xs text-muted-foreground">{label}</span><b className="text-lg">{count}</b></button>)}
          </div>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search product, SKU or barcode" className="mt-4 h-10 w-full max-w-sm rounded-md border bg-background px-3 text-sm" />
          <div className="mt-3 flex flex-wrap gap-2"><select value={bulkCategory} onChange={(event)=>setBulkCategory(event.target.value)} className="h-9 rounded-md border bg-background px-3 text-xs"><option value="">Bulk category for review rows</option>{categories.map((item)=><option key={item.id} value={item.name}>{item.name}</option>)}</select><button type="button" disabled={!bulkCategory} onClick={()=>setCategoryOverrides((current)=>({...current,...Object.fromEntries(preview.rows.filter((row)=>row.status==='REVIEW_REQUIRED').map((row)=>[row.rowNumber,bulkCategory]))}))} className="rounded-md border px-3 text-xs font-semibold disabled:opacity-40">Assign all review rows</button></div>
          <div className="mt-4 max-h-[460px] overflow-auto rounded-lg border"><table className="w-full min-w-[900px] text-xs"><thead className="sticky top-0 bg-muted"><tr>{['Status','SKU','Product','Suggested category','Selling price','Barcode','Opening stock','Issue'].map((label) => <th key={label} className="px-3 py-2 text-left">{label}</th>)}</tr></thead><tbody>{preview.rows.filter((row) => (statusFilter === 'ALL' || row.status === statusFilter) && [row.name,row.sku,row.barcode ?? ''].some((value) => value.toLowerCase().includes(search.toLowerCase()))).map((row) => <tr key={row.rowNumber} className="border-t"><td className="px-3 py-2 font-semibold">{row.status.replace('_',' ')}</td><td className="px-3 py-2">{row.sku || '—'}</td><td className="px-3 py-2 font-medium">{row.name || '—'}</td><td className="px-3 py-2">{row.status === 'REVIEW_REQUIRED' ? <select value={categoryOverrides[row.rowNumber] || ''} onChange={(event) => setCategoryOverrides((current) => ({...current,[row.rowNumber]:event.target.value}))} className="h-8 rounded border bg-background px-2"><option value="">Unassigned</option>{categories.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select> : row.category || 'Unassigned'}</td><td className="px-3 py-2 tabular-nums">{row.sellingPrice ?? '—'}</td><td className="px-3 py-2">{row.barcode || '—'}</td><td className="px-3 py-2">{row.openingStock ?? '—'}</td><td className="max-w-xs px-3 py-2 text-muted-foreground">{row.issue || '—'}</td></tr>)}</tbody></table></div>
          <button type="button" onClick={() => { const rows=preview.rows.filter((row)=>row.status!=='READY'); const safe=(value:string)=>/^[=+\-@]/.test(value)?`'${value}`:value; const csv=['row,product_code,name,selling_price,status,reason,suggested_category',...rows.map((row)=>[row.rowNumber,row.sku,row.name,row.sellingPrice??'',row.status,row.issue??'',row.category??''].map((value)=>`"${safe(String(value)).replace(/"/g,'""')}"`).join(','))].join('\n'); const url=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); const link=document.createElement('a');link.href=url;link.download='product-import-issues.csv';link.click();URL.revokeObjectURL(url)}} className="mt-3 rounded-md border px-3 py-2 text-xs font-semibold">Download issues CSV</button>
          {preview.errors.length > 0 && (
            <div className="mt-3 max-h-56 space-y-1 overflow-auto rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
              {preview.errors.map((error, index) => (
                <p key={`${error.rowNumber}-${index}`}>
                  Row {error.rowNumber}: {error.message}
                </p>
              ))}
            </div>
          )}
          {preview.warnings.length > 0 && (
            <div className="mt-3 max-h-40 space-y-1 overflow-auto text-xs text-muted-foreground">
              {preview.warnings.slice(0, 50).map((warning) => (
                <p key={warning}>{warning}</p>
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
              pending || preview.validRows === 0
            }
            onClick={confirm}
            className="rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-background disabled:opacity-40"
          >
            Import {preview.validRows} ready products
          </button>
        )}
      </div>
      {result && <section className="rounded-xl border bg-card p-5"><h2 className="font-semibold">Import completed</h2><p className="mt-2 text-sm">Created: {result.imported} · Duplicates: {result.duplicates} · Review not imported: {result.reviewRequired} · Excluded: {result.excluded} · Invalid: {result.invalid}</p><button onClick={() => router.push('/dashboard/products')} className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">View products</button></section>}
    </div>
  );
}
