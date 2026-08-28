'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Save, X } from 'lucide-react'
import { LoadingSpinner as Loader2 } from '@/components/ui/page-loader'
import { notify } from '@/lib/notify'
import { Button } from '@/components/ui/button'
import { ReceiptTemplate } from '@/components/receipt/receipt-template'
import { updateAccountName, updateBusinessSettings, updateOrganizationSettings } from '@/app/actions/settings-actions'
import { directPrintReceipt, getDirectPrinterStatus, listDirectPrinters, type ReceiptPrinterStatus } from '@/lib/printing/receipt-print-service'
import type { BusinessSettings, Organization } from '@/lib/db/schema'

interface EditableSettingsProps {
  businessSettings: BusinessSettings | null
  organization: Organization
  buttonOnly?: boolean
  section?: 'business' | 'operating' | 'receipt' | 'account'
  accountName?: string
}

export function EditableSettings({ businessSettings, organization, buttonOnly = false, section, accountName = '' }: EditableSettingsProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const [printerStatus, setPrinterStatus] = useState<ReceiptPrinterStatus | null>(null)
  const [availablePrinters, setAvailablePrinters] = useState<string[]>([])
  const [formData, setFormData] = useState({
    displayName: businessSettings?.displayName || organization.name,
    accountName,
    address: businessSettings?.address || '',
    city: businessSettings?.city || '',
    region: businessSettings?.region || '',
    taxRate: businessSettings?.taxRate?.toString() || '16',
    taxName: businessSettings?.taxName || 'VAT',
    receiptBusinessName: businessSettings?.receiptBusinessName || '',
    receiptPhone: businessSettings?.receiptPhone || '',
    receiptAddress: businessSettings?.receiptAddress || '',
    receiptFooter: businessSettings?.receiptFooter || '',
    receiptLayout: businessSettings?.receiptLayout === 'detailed' ? 'detailed' as const : 'thermal' as const,
    receiptTemplate: businessSettings?.receiptTemplate === 'logo' || businessSettings?.receiptTemplate === 'cafe' ? businessSettings.receiptTemplate as 'logo' | 'cafe' : 'classic' as const,
    receiptLogoUrl: businessSettings?.receiptLogoUrl || '',
    receiptShowPhone: businessSettings?.receiptShowPhone ?? true,
    receiptShowAddress: businessSettings?.receiptShowAddress ?? true,
    receiptShowCashier: businessSettings?.receiptShowCashier ?? true,
    receiptShowCustomer: businessSettings?.receiptShowCustomer ?? true,
    receiptShowPayment: businessSettings?.receiptShowPayment ?? true,
    receiptShowQrCode: businessSettings?.receiptShowQrCode ?? false,
    receiptShowItemSku: businessSettings?.receiptShowItemSku ?? false,
    receiptPrintingMode: businessSettings?.receiptPrintingMode === 'browser' ? 'browser' as const : 'direct' as const,
    receiptPrinterName: businessSettings?.receiptPrinterName || '',
    receiptPaperWidth: businessSettings?.receiptPaperWidth === 58 ? 58 as const : 80 as const,
    receiptAutoPrint: businessSettings?.receiptAutoPrint ?? false,
    receiptPrintCustomerCopy: businessSettings?.receiptPrintCustomerCopy ?? true,
    receiptPrintCopies: businessSettings?.receiptPrintCopies ?? 1,
    receiptCashDrawerPulse: businessSettings?.receiptCashDrawerPulse ?? false,
    defaultPaymentMethod: businessSettings?.defaultPaymentMethod || 'cash',
    paymentMethods: (Array.isArray(businessSettings?.paymentMethods) && businessSettings.paymentMethods.length ? businessSettings.paymentMethods : ['cash']) as string[],
    taxEnabled: businessSettings?.taxEnabled ?? false,
    pricesIncludeTax: businessSettings?.pricesIncludeTax ?? false,
    showTaxOnReceipt: businessSettings?.showTaxOnReceipt ?? false,
    financialYearStart: businessSettings?.financialYearStart || '07-01',
    currency: organization.currency,
    timezone: organization.timezone || 'Africa/Nairobi',
  })

  const receiptPreview = {
    id: 'preview-sale-001',
    receiptNo: 'PREVIEW-001',
    createdAt: new Date('2026-08-04T10:30:00'),
    subtotal: '2500.00',
    taxAmount: '400.00',
    discountAmount: '0.00',
    roundingAmount: '0.00',
    total: '2900.00',
    paymentMethod: formData.defaultPaymentMethod,
    mpesaRef: formData.defaultPaymentMethod === 'mpesa' ? 'QWE123ABC' : null,
    items: [
      { id: 'preview-1', productId: 'ITEM-001', productName: 'Sample product', quantity: 2, totalPrice: '1800.00' },
      { id: 'preview-2', productId: 'ITEM-002', productName: 'Another item', quantity: 1, totalPrice: '700.00' },
    ],
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await Promise.all([
        updateBusinessSettings({
          displayName: formData.displayName,
          address: formData.address,
          city: formData.city,
          region: formData.region,
          taxRate: parseFloat(formData.taxRate),
          taxName: formData.taxName,
          receiptBusinessName: formData.receiptBusinessName,
          receiptPhone: formData.receiptPhone,
          receiptAddress: formData.receiptAddress,
          receiptFooter: formData.receiptFooter,
          receiptLayout: formData.receiptLayout,
          receiptTemplate: formData.receiptTemplate,
          receiptLogoUrl: formData.receiptLogoUrl,
          receiptShowPhone: formData.receiptShowPhone,
          receiptShowAddress: formData.receiptShowAddress,
          receiptShowCashier: formData.receiptShowCashier,
          receiptShowCustomer: formData.receiptShowCustomer,
          receiptShowPayment: formData.receiptShowPayment,
          receiptShowQrCode: formData.receiptShowQrCode,
          receiptShowItemSku: formData.receiptShowItemSku,
          defaultPaymentMethod: formData.defaultPaymentMethod,
          paymentMethods: formData.paymentMethods,
          taxEnabled: formData.taxEnabled,
          pricesIncludeTax: formData.pricesIncludeTax,
          showTaxOnReceipt: formData.showTaxOnReceipt,
          financialYearStart: formData.financialYearStart,
          receiptPrintingMode: formData.receiptPrintingMode,
          receiptPrinterName: formData.receiptPrinterName,
          receiptPaperWidth: formData.receiptPaperWidth,
          receiptAutoPrint: formData.receiptAutoPrint,
          receiptPrintCustomerCopy: formData.receiptPrintCustomerCopy,
          receiptPrintCopies: formData.receiptPrintCopies,
          receiptCashDrawerPulse: formData.receiptCashDrawerPulse,
        }),
        updateOrganizationSettings({
          name: formData.displayName,
          currency: formData.currency,
          timezone: formData.timezone,
          taxRate: parseFloat(formData.taxRate),
        }),
        ...(section === 'account' ? [updateAccountName(formData.accountName)] : []),
      ])

      notify.success('Settings updated successfully')
      setIsEditing(false)
      router.refresh()
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Failed to update settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogoUpload = async (file?: File) => {
    if (!file) return
    setLogoUploading(true)
    try {
      const body = new FormData(); body.set('file', file)
      const response = await fetch('/api/settings/receipt-logo', { method: 'POST', body })
      const result = await response.json() as { url?: string; error?: string }
      if (!response.ok || !result.url) throw new Error(result.error || 'Could not upload logo')
      setFormData({ ...formData, receiptLogoUrl: result.url })
      notify.success('Logo added to the receipt preview')
    } catch (error) { notify.error(error instanceof Error ? error.message : 'Could not upload logo') } finally { setLogoUploading(false) }
  }

  const discoverPrinters = async () => {
    setPrinterStatus(null)
    try { const printers = await listDirectPrinters(); setAvailablePrinters(printers); notify.success(`${printers.length} printer${printers.length === 1 ? '' : 's'} found`) }
    catch { setPrinterStatus('unavailable'); notify.error('QZ Tray is unavailable', { description: 'Install and start QZ Tray on this register.' }) }
  }

  const testReceiptPrinter = async () => {
    if (!formData.receiptPrinterName.trim()) return notify.error('Choose a thermal printer first')
    setPrinterStatus('printing')
    try {
      const html = `<div class="receipt-paper" style="padding:5mm;font-family:monospace;font-size:11px;line-height:1.5;color:#000;background:#fff"><h1 style="text-align:center;font-size:15px">${formData.receiptBusinessName || formData.displayName}</h1><p style="text-align:center">PRINTER TEST</p><hr><p>POS: ${formData.displayName}</p><p>Branch: Workspace default</p><p>Register: Current terminal</p><p>Printer: ${formData.receiptPrinterName}</p><p>Paper: ${formData.receiptPaperWidth} mm</p><p>Date: ${new Date().toLocaleString()}</p><hr><p style="text-align:center">Printer setup is working</p></div>`
      await directPrintReceipt(html, { mode: 'direct', printerName: formData.receiptPrinterName, paperWidth: formData.receiptPaperWidth, autoPrint: false, customerCopy: true, copies: 1, cashDrawerPulse: false })
      setPrinterStatus('ready'); notify.success('Test receipt printed')
    } catch (error) { setPrinterStatus('error'); notify.error('Test receipt could not be printed', { description: error instanceof Error ? error.message : 'Printer unavailable' }) }
  }

  if (buttonOnly && !isEditing) {
    return <Button onClick={() => setIsEditing(true)} variant="outline" className="border-white/10 bg-white/5 font-semibold text-[var(--dashboard-text)] hover:bg-white/10">{section === 'business' ? 'Edit profile' : section === 'operating' ? 'Edit defaults' : section === 'receipt' ? 'Customize receipt' : section === 'account' ? 'Edit name' : 'Edit settings'}</Button>
  }

  return (
    <div className={buttonOnly ? 'fixed inset-0 z-50 overflow-y-auto bg-[var(--dashboard-canvas)] p-4 text-[var(--dashboard-text)] sm:p-8' : 'space-y-6'}>
      {isEditing ? (
        <div className="mx-auto max-w-[1180px] space-y-5 rounded-2xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] p-5 shadow-[0_18px_48px_rgba(0,0,0,.16)] sm:p-6">
          <div className="flex items-start justify-between gap-4 border-b border-[var(--dashboard-border)] pb-5"><div><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#a47700] dark:text-[#ffd60a]">Workspace controls</p><h3 className="mt-1 text-2xl font-bold tracking-tight">Edit workspace settings</h3><p className="mt-1 text-sm text-muted-foreground">Manage business details, defaults, and receipt preferences.</p></div>{buttonOnly && <Button variant="outline" onClick={() => setIsEditing(false)}><X className="mr-2 h-4 w-4" />Close</Button>}</div>

          {/* Business Profile */}
          {(!section || section === 'business') && <div className="space-y-4 border-b pb-6">
            <h4 className="font-medium">Business Profile</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Business Name</label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Currency</label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="KES">KES (Kenya Shilling)</option>
                  <option value="USD">USD (US Dollar)</option>
                  <option value="EUR">EUR (Euro)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Region</label>
              <input
                type="text"
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
          </div>}

          {/* Tax Settings */}
          {(!section || section === 'operating') && <div className="space-y-4 border-b pb-6">
            <div><h4 className="font-medium">Operating defaults</h4><p className="mt-1 text-sm text-muted-foreground">Control payments, tax, timezone and financial reporting defaults.</p></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium">Timezone</label><input type="text" value={formData.timezone} onChange={(e) => setFormData({ ...formData, timezone: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" /></div>
              <div><label className="text-sm font-medium">Financial year starts</label><input type="text" inputMode="numeric" placeholder="07-01" value={formData.financialYearStart} onChange={(e) => setFormData({ ...formData, financialYearStart: e.target.value })} pattern="\d{2}-\d{2}" className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" /><p className="mt-1 text-xs text-muted-foreground">MM-DD, for example 07-01</p></div>
            </div>
            <div><label className="text-sm font-medium">Enabled payment methods</label><div className="mt-2 grid gap-2 sm:grid-cols-5">{(['cash', 'mpesa', 'airtel_money', 'card', 'bank_transfer'] as const).map((method) => { const checked = formData.paymentMethods.includes(method); return <label key={method} className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 capitalize"><input type="checkbox" checked={checked} onChange={(event) => { const methods = event.target.checked ? [...formData.paymentMethods, method] : formData.paymentMethods.filter((item) => item !== method); const defaultPaymentMethod = methods.includes(formData.defaultPaymentMethod) ? formData.defaultPaymentMethod : methods[0] || ''; setFormData({ ...formData, paymentMethods: methods, defaultPaymentMethod }) }} className="h-4 w-4 accent-[#e42527]" />{method === 'mpesa' ? 'M-Pesa' : method === 'airtel_money' ? 'Airtel Money' : method === 'bank_transfer' ? 'Bank transfer' : method}</label> })}</div></div>
            <div><label className="text-sm font-medium">Default payment method</label><select value={formData.defaultPaymentMethod} onChange={(e) => setFormData({ ...formData, defaultPaymentMethod: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm">{formData.paymentMethods.map((method) => <option key={method} value={method}>{method === 'mpesa' ? 'M-Pesa' : method.replace(/\b\w/g, (letter) => letter.toUpperCase())}</option>)}</select></div>
            <div className="grid gap-2 sm:grid-cols-3">{([
              ['taxEnabled', 'Enable tax', 'Calculate tax on new sales.'],
              ['pricesIncludeTax', 'Prices include tax', 'Treat catalogue prices as tax-inclusive.'],
              ['showTaxOnReceipt', 'Show tax on receipts', 'Print the calculated tax line.'],
            ] as const).map(([key, title, detail]) => <label key={key} className="flex cursor-pointer items-start gap-3 rounded-lg border p-3"><input type="checkbox" checked={formData[key]} onChange={(event) => setFormData({ ...formData, [key]: event.target.checked })} className="mt-0.5 h-4 w-4 accent-[#e42527]" /><span><span className="block text-sm font-medium">{title}</span><span className="mt-0.5 block text-xs text-muted-foreground">{detail}</span></span></label>)}</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Tax Name</label>
                <input
                  type="text"
                  value={formData.taxName}
                  onChange={(e) => setFormData({ ...formData, taxName: e.target.value })}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Tax Rate (%)</label>
                <input
                  type="number"
                  value={formData.taxRate}
                  onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>}

          {/* Receipt Settings */}
          {(!section || section === 'receipt') && <div className="space-y-4 border-b pb-6">
            <h4 className="font-medium">Receipt Settings</h4>
            <div className="space-y-4 rounded-xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface-subtle)] p-4 sm:p-5">
              <div><h5 className="font-semibold">POS receipt printing</h5><p className="mt-1 text-xs text-muted-foreground">Direct printing uses QZ Tray on this Windows register. Browser print remains available as a fallback.</p></div>
              <div className="grid gap-4 md:grid-cols-3">
                <div><label className="text-sm font-medium">Printing mode</label><select value={formData.receiptPrintingMode} onChange={(event) => setFormData({ ...formData, receiptPrintingMode: event.target.value as 'direct' | 'browser' })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"><option value="direct">Direct thermal printer</option><option value="browser">Browser print</option></select></div>
                <div><label className="text-sm font-medium">Paper width</label><select value={formData.receiptPaperWidth} onChange={(event) => setFormData({ ...formData, receiptPaperWidth: Number(event.target.value) as 58 | 80 })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"><option value={80}>80 mm</option><option value={58}>58 mm</option></select></div>
                <div><label className="text-sm font-medium">Number of copies</label><input type="number" min={1} max={5} value={formData.receiptPrintCopies} onChange={(event) => setFormData({ ...formData, receiptPrintCopies: Math.max(1, Math.min(5, Number(event.target.value))) })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" /></div>
              </div>
              {formData.receiptPrintingMode === 'direct' && <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end"><div><label className="text-sm font-medium">Configured printer</label><input list="receipt-printers" value={formData.receiptPrinterName} onChange={async (event) => { const name = event.target.value; setFormData({ ...formData, receiptPrinterName: name }); if (name) setPrinterStatus(await getDirectPrinterStatus(name)) }} placeholder="Exact Windows printer name" className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" /><datalist id="receipt-printers">{availablePrinters.map((printer) => <option key={printer} value={printer} />)}</datalist></div><Button type="button" variant="outline" onClick={() => void discoverPrinters()}>Find printers</Button><Button type="button" variant="outline" onClick={() => void testReceiptPrinter()}>Test receipt</Button></div>}
              {printerStatus && <p className={`text-xs font-semibold ${printerStatus === 'ready' ? 'text-emerald-600' : printerStatus === 'printing' ? 'text-amber-600' : 'text-red-600'}`}>Printer: {printerStatus === 'ready' ? 'Ready' : printerStatus === 'printing' ? 'Printing' : printerStatus === 'unavailable' ? 'Unavailable' : 'Error'}</p>}
              <div className="grid gap-2 sm:grid-cols-3">{([
                ['receiptAutoPrint', 'Auto-print after sale', 'Print after the sale is safely saved.'],
                ['receiptPrintCustomerCopy', 'Print customer copy', 'Use the configured copy count.'],
                ['receiptCashDrawerPulse', 'Cash-drawer pulse', 'Send the standard ESC/POS drawer pulse.'],
              ] as const).map(([key, title, detail]) => <label key={key} className="flex cursor-pointer items-start gap-3 rounded-lg border bg-background p-3"><input type="checkbox" checked={formData[key]} onChange={(event) => setFormData({ ...formData, [key]: event.target.checked })} className="mt-0.5 h-4 w-4 accent-[#e42527]"/><span><span className="block text-sm font-medium">{title}</span><span className="mt-0.5 block text-xs text-muted-foreground">{detail}</span></span></label>)}</div>
            </div>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-start">
            <div className="space-y-4 rounded-xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface-subtle)] p-4 sm:p-5">
            <div>
              <label className="text-sm font-medium">Receipt Business Name</label>
              <input
                type="text"
                value={formData.receiptBusinessName}
                onChange={(e) => setFormData({ ...formData, receiptBusinessName: e.target.value })}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Receipt Phone</label>
                <input
                  type="text"
                  value={formData.receiptPhone}
                  onChange={(e) => setFormData({ ...formData, receiptPhone: e.target.value })}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Default Payment Method</label>
                <select
                  value={formData.defaultPaymentMethod}
                  onChange={(e) => setFormData({ ...formData, defaultPaymentMethod: e.target.value })}
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="mpesa">M-Pesa</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Receipt Address</label>
              <textarea
                value={formData.receiptAddress}
                onChange={(e) => setFormData({ ...formData, receiptAddress: e.target.value })}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                rows={2}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Receipt Footer</label>
              <textarea
                value={formData.receiptFooter}
                onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value })}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                rows={2}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Receipt layout</label>
              <p className="mt-1 text-xs text-muted-foreground">Choose a detailed customer receipt or a compact thermal-printer format.</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {([
                  ['thermal', 'Thermal printer', 'A narrow, compact receipt for 80 mm receipt printers.'],
                  ['detailed', 'Detailed receipt', 'A full-page confirmation with transaction details.'],
                ] as const).map(([value, title, description]) => { const selected = formData.receiptLayout === value; return <label key={value} className={`cursor-pointer rounded-lg border p-4 transition-colors ${selected ? 'border-[#e42527] bg-[#fff3f3] dark:bg-[#2a1518]' : 'hover:bg-muted/40'}`}><input type="radio" name="receiptLayout" value={value} checked={selected} onChange={() => setFormData({ ...formData, receiptLayout: value })} className="sr-only" /><span className={`block text-sm font-semibold ${selected ? 'text-[#8f171b] dark:text-[#fff4f4]' : ''}`}>{title}</span><span className={`mt-1 block text-xs leading-4 ${selected ? 'text-[#9f3b3d] dark:text-[#f3b7b9]' : 'text-muted-foreground'}`}>{description}</span></label>})}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Thermal receipt template</label>
              <p className="mt-1 text-xs text-muted-foreground">Select the visual style used when Thermal printer is selected.</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {([
                  ['classic', 'Classic', 'Clean receipt with business details.'],
                  ['logo', 'Logo', 'Large logo-style heading and QR space.'],
                  ['cafe', 'Café', 'Store-focused heading with a compact feel.'],
                ] as const).map(([value, title, description]) => { const selected = formData.receiptTemplate === value; return <label key={value} className={`cursor-pointer rounded-xl border p-4 transition-colors ${selected ? 'border-[#e42527] bg-[#fff3f3] dark:bg-[#2a1518]' : 'hover:bg-muted/40'}`}><input type="radio" name="receiptTemplate" value={value} checked={selected} onChange={() => setFormData({ ...formData, receiptTemplate: value })} className="sr-only" /><span className={`block text-sm font-semibold ${selected ? 'text-[#8f171b] dark:text-[#fff4f4]' : ''}`}>{title}</span><span className={`mt-1 block text-xs leading-4 ${selected ? 'text-[#9f3b3d] dark:text-[#f3b7b9]' : 'text-muted-foreground'}`}>{description}</span></label>})}
              </div>
            </div>

            {formData.receiptTemplate === 'logo' && <div className="rounded-xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] p-4"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold">Business logo</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Upload a PNG, JPG, or WebP logo. A transparent PNG or a wide logo works best; it is automatically contained to fit receipt printers.</p></div>{formData.receiptLogoUrl && <Image src={formData.receiptLogoUrl} alt="Receipt logo preview" width={120} height={48} unoptimized className="h-12 w-[120px] rounded bg-white object-contain p-1" />}</div><div className="mt-3 flex flex-wrap items-center gap-3"><label className="cursor-pointer rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface-subtle)] px-3 py-2 text-xs font-semibold hover:bg-white/5">{logoUploading ? 'Uploading…' : formData.receiptLogoUrl ? 'Replace logo' : 'Upload logo'}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={logoUploading} onChange={(event) => handleLogoUpload(event.target.files?.[0])} className="sr-only" /></label>{formData.receiptLogoUrl && <button type="button" onClick={() => setFormData({ ...formData, receiptLogoUrl: '' })} className="text-xs font-semibold text-destructive hover:underline">Remove logo</button>}</div></div>}

            <div>
              <div className="mb-3"><h5 className="text-sm font-semibold">Receipt appearance</h5><p className="mt-1 text-xs text-muted-foreground">Choose the details customers see on each receipt.</p></div>
              <div className="grid gap-2 sm:grid-cols-2">
                {([
                  ['receiptShowPhone', 'Business phone', 'Show the business contact number.'],
                  ['receiptShowAddress', 'Business address', 'Show the business location.'],
                  ['receiptShowCashier', 'Cashier name', 'Show who completed the sale.'],
                  ['receiptShowCustomer', 'Customer name', 'Show the selected customer or walk-in.'],
                  ['receiptShowPayment', 'Payment details', 'Show the payment method and reference.'],
                  ['receiptShowQrCode', 'Receipt QR code', 'Include a scan-friendly receipt reference.'],
                  ['receiptShowItemSku', 'Item codes', 'Show catalogue identifiers under receipt items.'],
                ] as const).map(([key, title, description]) => (
                  <label key={key} className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/40">
                    <input type="checkbox" checked={formData[key]} onChange={(event) => setFormData({ ...formData, [key]: event.target.checked })} className="mt-0.5 h-4 w-4 accent-[#e42527]" />
                    <span><span className="block text-sm font-medium">{title}</span><span className="mt-0.5 block text-xs leading-4 text-muted-foreground">{description}</span></span>
                  </label>
                ))}
              </div>
            </div>

            </div>
            <div className="overflow-hidden rounded-xl border border-[var(--dashboard-border)] bg-[#181818] shadow-[0_10px_24px_rgba(0,0,0,.16)] lg:sticky lg:top-5">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3"><div><h5 className="text-sm font-semibold text-white">Live receipt preview</h5><p className="mt-0.5 text-[11px] text-zinc-400">Updates as you change the settings.</p></div><span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-zinc-300">Preview</span></div>
              <div className="max-h-[560px] overflow-y-auto bg-zinc-100 p-4"><div style={{ zoom: 0.78 }}><ReceiptTemplate sale={receiptPreview} businessName={formData.receiptBusinessName || formData.displayName} businessPhone={formData.receiptPhone} businessAddress={formData.receiptAddress} receiptFooter={formData.receiptFooter || 'Thank you for your business.'} taxName={formData.taxName} layout={formData.receiptLayout} template={formData.receiptTemplate} logoUrl={formData.receiptLogoUrl} showPhone={formData.receiptShowPhone} showAddress={formData.receiptShowAddress} showCashier={formData.receiptShowCashier} showCustomer={formData.receiptShowCustomer} showPayment={formData.receiptShowPayment} showQrCode={formData.receiptShowQrCode} showItemSku={formData.receiptShowItemSku} /></div></div>
            </div>
            </div>
          </div>}

          {section === 'account' && <div className="space-y-4 border-b pb-6"><div><h4 className="font-medium">Account profile</h4><p className="mt-1 text-sm text-muted-foreground">Change the name shown across your workspace. Your sign-in email cannot be changed here.</p></div><div><label className="text-sm font-medium">Display name</label><input type="text" value={formData.accountName} onChange={(e) => setFormData({ ...formData, accountName: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" /></div></div>}

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Business Settings</h3>
            <Button onClick={() => setIsEditing(true)}>Edit Settings</Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Business Name</p>
              <p className="font-medium">{formData.displayName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Currency</p>
              <p className="font-medium">{formData.currency}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">City</p>
              <p className="font-medium">{formData.city || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tax Rate</p>
              <p className="font-medium">{formData.taxRate}%</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
