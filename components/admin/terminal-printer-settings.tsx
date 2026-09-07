'use client';
import { useState } from 'react';
import { Pencil, Printer, ReceiptText, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { notify } from '@/lib/notify';
import {
  renamePosTerminal,
  updatePosTerminalPrinter,
} from '@/app/actions/admin-actions';
import {
  browserPrintReceipt,
  directPrintReceipt,
  getReceiptPrinterErrorCopy,
} from '@/lib/printing/receipt-print-service';

type Terminal = {
  id: string;
  name: string;
  branchName?: string;
  businessName?: string;
  status: string;
  printingMode: string;
  printerDisplayName: string | null;
  printerIdentifier: string | null;
  paperWidth: number;
  autoPrint: boolean;
  receiptCopies: number;
  cashDrawerPulse: boolean;
};
export function TerminalPrinterSettings({ terminal }: { terminal: Terminal }) {
  const [open, setOpen] = useState(false),
    [renameOpen, setRenameOpen] = useState(false),
    [saving, setSaving] = useState(false),
    [testing, setTesting] = useState(false);
  const [deviceName, setDeviceName] = useState(terminal.name),
    [mode, setMode] = useState<'browser' | 'direct'>(
      terminal.printingMode === 'direct' ? 'direct' : 'browser'
    ),
    [name, setName] = useState(terminal.printerDisplayName || ''),
    [identifier, setIdentifier] = useState(terminal.printerIdentifier || ''),
    [width, setWidth] = useState<58 | 80>(terminal.paperWidth === 58 ? 58 : 80),
    [autoPrint, setAutoPrint] = useState(terminal.autoPrint),
    [copies, setCopies] = useState(
      String(Math.min(3, Math.max(1, terminal.receiptCopies)))
    ),
    [drawer, setDrawer] = useState(terminal.cashDrawerPulse);
  const configured = mode === 'direct' && Boolean((name || identifier).trim());
  const save = async () => {
    setSaving(true);
    try {
      await updatePosTerminalPrinter(terminal.id, {
        printingMode: mode,
        printerDisplayName: name,
        printerIdentifier: identifier,
        paperWidth: width,
        autoPrint,
        receiptCopies: Number(copies),
        cashDrawerPulse: drawer,
      });
      notify.success('Printer settings saved');
      setOpen(false);
    } catch (e) {
      notify.error(
        e instanceof Error ? e.message : 'Could not save printer settings'
      );
    } finally {
      setSaving(false);
    }
  };
  const rename = async () => {
    try {
      await renamePosTerminal(terminal.id, deviceName);
      notify.success('Device renamed');
      setRenameOpen(false);
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Could not rename device');
    }
  };
  const testPrint = async () => {
    const esc = (value: string) =>
      value.replace(
        /[&<>"']/g,
        (character) =>
          ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
          })[character] || character
      );
    const business = esc(terminal.businessName || 'Pesaby');
    const branch = esc(terminal.branchName || '');
    const terminalName = esc(terminal.name || 'POS terminal');
    const printer = esc(name || identifier || 'Configured printer');
    const date = new Intl.DateTimeFormat('en-KE', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date());
    const html = `<div class="receipt-paper" style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;width:100%;box-sizing:border-box;padding:4mm 3mm;color:#000;background:#fff;font-size:12px;line-height:1.45"><style>.receipt-paper *{box-sizing:border-box}.receipt-head{text-align:center}.receipt-head h1{font-size:18px;letter-spacing:.04em;margin:0 0 2px}.receipt-head p{margin:0}.receipt-rule{border:0;border-top:1px dashed #000;margin:10px 0}.receipt-row{display:flex;justify-content:space-between;gap:8px}.receipt-row span:last-child{white-space:nowrap}.receipt-total{font-size:15px;font-weight:700}.receipt-note{text-align:center;margin-top:12px}.receipt-meta{font-size:11px}</style><div class="receipt-head"><h1>${business}</h1>${branch ? `<p>${branch}</p>` : ''}<p>PRINTER TEST RECEIPT</p></div><hr class="receipt-rule"><div class="receipt-meta"><div class="receipt-row"><span>Terminal</span><span>${terminalName}</span></div><div class="receipt-row"><span>Printer</span><span>${printer}</span></div><div class="receipt-row"><span>Paper</span><span>${width} mm</span></div><div class="receipt-row"><span>Mode</span><span>${mode === 'direct' ? 'Direct thermal' : 'Browser print'}</span></div><div class="receipt-row"><span>Date</span><span>${esc(date)}</span></div></div><hr class="receipt-rule"><div class="receipt-row"><span>Test item 1</span><span>KSh 100.00</span></div><div class="receipt-row"><span>Test item 2</span><span>KSh 250.00</span></div><hr class="receipt-rule"><div class="receipt-row"><span>Subtotal</span><span>KSh 350.00</span></div><div class="receipt-row"><span>VAT (16%)</span><span>KSh 0.00</span></div><div class="receipt-row receipt-total"><span>TOTAL</span><span>KSh 350.00</span></div><div class="receipt-note"><p>Printer configured successfully.</p><p>This is a test receipt. No sale was created.</p><p>Thank you.</p></div></div>`;
    if (mode === 'browser') {
      browserPrintReceipt(html, width);
      notify.info('Browser print dialog opened');
      return;
    }
    if (!identifier.trim())
      return notify.error('Enter the Windows/QZ printer identifier first');
    setTesting(true);
    try {
      await directPrintReceipt(html, {
        mode: 'direct',
        printerName: identifier.trim(),
        paperWidth: width,
        autoPrint: false,
        customerCopy: false,
        copies: 1,
        cashDrawerPulse: false,
      });
      notify.success('Test receipt sent to printer', {
        description: `Submitted to ${identifier.trim()}.`,
      });
    } catch (error) {
      const copy = getReceiptPrinterErrorCopy(error);
      notify.error(copy.title, { description: copy.description });
    } finally {
      setTesting(false);
    }
  };
  return (
    <div className="max-w-3xl space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Printer className="h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-semibold">Receipt printer</p>
            <p className="text-xs text-muted-foreground">
              {mode === 'browser'
                ? 'Browser print'
                : configured
                  ? `${name || identifier} · ${width} mm`
                  : 'Not configured'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-9 border border-slate-200 bg-white px-3 text-slate-700 shadow-sm hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            onClick={() => setRenameOpen((v) => !v)}
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            {renameOpen ? 'Close rename' : 'Rename device'}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-9 border border-slate-200 bg-white px-3 text-slate-700 shadow-sm hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            disabled={testing || (mode === 'direct' && !identifier.trim())}
            onClick={() => void testPrint()}
          >
            <ReceiptText className="mr-1.5 h-3.5 w-3.5" />
            {testing
              ? 'Testing…'
              : mode === 'browser'
                ? 'Test browser print'
                : 'Print test receipt'}
          </Button>
          <Button
            type="button"
            variant="outline"
            className={`h-9 border px-3 shadow-sm ${open ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200' : 'border-[#f4512a] bg-[#f4512a] text-white hover:bg-[#dc3f1c]'}`}
            onClick={() => setOpen((v) => !v)}
          >
            <Settings2 className="mr-1.5 h-3.5 w-3.5" />
            {open ? 'Close setup' : 'Configure printer'}
          </Button>
        </div>
      </div>
      {renameOpen && (
        <div className="flex gap-2">
          <input
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm shadow-sm outline-none focus:border-[#f4512a] focus:ring-2 focus:ring-[#f4512a]/20 dark:border-white/15 dark:bg-white/10"
          />
          <Button type="button" onClick={() => void rename()}>
            Save name
          </Button>
        </div>
      )}
      {open && (
        <div className="grid gap-5 rounded-xl border border-slate-100 bg-slate-50/60 p-5 sm:grid-cols-2 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="sm:col-span-2"><p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Receipt setup</p><p className="mt-0.5 text-xs text-muted-foreground">This configuration applies only to this POS device.</p></div>
          <label className="text-sm font-medium sm:col-span-2">
            Printing mode
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as 'browser' | 'direct')}
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm shadow-sm outline-none focus:border-[#f4512a] focus:ring-2 focus:ring-[#f4512a]/20 dark:border-white/15 dark:bg-white/10"
            >
              <option value="browser">Browser print</option>
              <option value="direct">Direct thermal printer</option>
            </select>
          </label>
          {mode === 'direct' && (
            <>
              <label className="text-sm font-medium">
                Receipt printer name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Front Counter Printer"
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm shadow-sm outline-none focus:border-[#f4512a] focus:ring-2 focus:ring-[#f4512a]/20 dark:border-white/15 dark:bg-white/10"
                />
              </label>
              <label className="text-sm font-medium">
                Printer identifier
                <input
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Exact Windows printer name"
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm shadow-sm outline-none focus:border-[#f4512a] focus:ring-2 focus:ring-[#f4512a]/20 dark:border-white/15 dark:bg-white/10"
                />
                <span className="mt-1 block text-xs font-normal text-muted-foreground">
                  Enter the exact receipt-printer name installed in Windows/QZ
                  Tray on this POS computer.
                </span>
              </label>
            </>
          )}
          <label className="text-sm font-medium">
            Paper width
            <select
              value={width}
              onChange={(e) => setWidth(Number(e.target.value) as 58 | 80)}
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm shadow-sm outline-none focus:border-[#f4512a] focus:ring-2 focus:ring-[#f4512a]/20 dark:border-white/15 dark:bg-white/10"
            >
              <option value="58">58 mm</option>
              <option value="80">80 mm</option>
            </select>
          </label>
          <label className="text-sm font-medium">
            Receipt copies
            <select
              value={copies}
              onChange={(e) => setCopies(e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm shadow-sm outline-none focus:border-[#f4512a] focus:ring-2 focus:ring-[#f4512a]/20 dark:border-white/15 dark:bg-white/10"
            >
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={autoPrint}
              onChange={(e) => setAutoPrint(e.target.checked)}
            />
            Auto-print receipt after successful sale
          </label>
          {mode === 'direct' && (
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={drawer}
                onChange={(e) => setDrawer(e.target.checked)}
              />
            <span>Automatically open drawer after completed cash sales.<span className="mt-0.5 block text-xs text-muted-foreground">Requires a compatible drawer connected to the configured direct receipt printer.</span></span>
            </label>
          )}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button
              type="button"
              variant="outline"
              className="border-0 bg-white shadow-sm hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" disabled={saving} className="bg-[#f4512a] text-white shadow-sm hover:bg-[#dc3f1c]" onClick={() => void save()}>
              {saving ? 'Saving…' : 'Save printer settings'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
