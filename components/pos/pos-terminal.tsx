'use client'

import { useState, useCallback, useRef, useEffect, useMemo, useDeferredValue, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { createSale, syncOfflineSale, type CartItem } from '@/app/actions/sales'
import { getMpesaPaymentStatus, initiateMpesaPaybillPayment, initiateMpesaPayment } from '@/app/actions/mpesa'
import { createCustomer } from '@/app/actions/customers'
import { discardHeldSale, holdSaleOnServer, listHeldSales, resumeHeldSaleFromServer, type HeldSaleRecord } from '@/app/actions/held-sales'
import { formatCurrency, formatDateTime, normalizeBarcode } from '@/lib/utils'
import { cn } from '@/lib/utils'
import {
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Loader2,
  CheckCircle2,
  X,
  Package,
  Printer,
  History,
  PauseCircle,
  ArchiveRestore,
  AlertTriangle,
  ShieldCheck,
  Search,
  Building2,
  Smartphone,
  Zap,
  Banknote,
  ContactRound,
  BadgePercent,
  ChevronDown,
  ArrowLeft,
  Download,
  MoreHorizontal,
  Share2,
  WalletCards,
  UserRound,
  BadgeCheck,
  Monitor,
  MapPin,
  CloudOff,
  RefreshCw,
} from 'lucide-react'
import type { Product, ProductPackage, PharmacyProduct, Customer, Sale, SaleItem } from '@/lib/db/schema'
import { toast } from 'sonner'
import { calculateMpesaAmount } from '@/lib/mpesa/amount'
import { adoptLegacyOfflineSales, cacheOfflineCatalogue, listOfflineSales, readOfflineCatalogue, saveOfflineSale, updateOfflineSale, type OfflineSaleRecord } from '@/lib/pos/offline-store'
import { bindPosConnectivityEvents, checkoutAlreadyQueued, createProvisionalReceiptNo, isConnectivityFailure, offlineWorkspaceStorageKey, shouldSynchronizeOfflineSale, summarizeOfflineQueue } from '@/lib/pos/offline-policy'
import { useWorkspace } from '@/lib/context/workspace-context'
import { getProductTerminology } from '@/lib/products/terminology'

const RefundDialog = dynamic(() => import('./refund-dialog').then((module) => module.RefundDialog), { ssr: false })
const ReceiptReprint = dynamic(() => import('./receipt-reprint').then((module) => module.ReceiptReprint), { ssr: false })
const SalesHistoryModal = dynamic(() => import('./sales-history-modal').then((module) => module.SalesHistoryModal), { ssr: false })
const ReceiptTemplate = dynamic(() => import('@/components/receipt/receipt-template').then((module) => module.ReceiptTemplate), { ssr: false })
const WirelessScannerPairing = dynamic(() => import('@/components/barcode/wireless-scanner-pairing').then((module) => module.WirelessScannerPairing), { ssr: false })

type PosProduct = Product & { packages: ProductPackage[]; pharmacy?: PharmacyProduct | null }

interface POSTerminalProps {
  standalone?: boolean
  organizationId: string
  products: PosProduct[]
  categories: Array<{ id: string; name: string }>
  requiresAgeVerification?: boolean
  pharmacyMode?: boolean
  customers: Customer[]
  settings: {
    displayName: string
    receiptBusinessName: string
    receiptPhone: string
    receiptAddress: string
    receiptFooter: string
    receiptLayout: 'detailed' | 'thermal'
    receiptTemplate: 'classic' | 'logo' | 'cafe'
    receiptLogoUrl: string
    taxEnabled: boolean
    taxRate: number
    taxName: string
    pricesIncludeTax: boolean
    paymentMethods: string[]
    showTaxOnReceipt: boolean
    receiptShowPhone: boolean
    receiptShowAddress: boolean
    receiptShowCashier: boolean
    receiptShowCustomer: boolean
    receiptShowPayment: boolean
    receiptShowQrCode: boolean
    receiptShowItemSku: boolean
  }
  startCheckout?: boolean
  checkoutOnly?: boolean
  hasActiveShift?: boolean
  canDiscount?: boolean
  canRefund?: boolean
  canHold?: boolean
  canApproveRestricted?: boolean
  receiptContext?: {
    cashierName?: string
    registerName?: string | null
    locationName?: string | null
  }
  offlineContext?: {
    sessionId: string | null
    branchId: string
    terminalId: string | null
  }
}

interface ReceiptData {
  saleId: string
  receiptNo: string
  items: Array<CartItem & { saleItemId: string }>
  subtotal: number
  taxAmount: number
  discountAmount: number
  roundingAmount: number
  total: number
  paymentMethod: string
  mpesaRef?: string
  change: number
  idempotencyKey: string
  ageVerified: boolean
  completedAt: Date
  amountReceived?: number
  discountType?: 'fixed' | 'percentage'
  discountValue?: number
  customerName: string
  customerEmail?: string | null
  etims?: {
    status: string
    message?: string
    environment?: string
    invoiceNumber?: string | null
    controlNumber?: string | null
    receiptNumber?: string | null
    internalReference?: string | null
    qrData?: string | null
    verificationData?: string | null
    showOnReceipt?: boolean
  }
  offline?: {
    status: 'PENDING' | 'SYNCED'
    provisionalReceiptNo: string
  }
}

type HeldSale = HeldSaleRecord

type MpesaStatus = 'idle' | 'initiating' | 'pending' | 'success' | 'failed' | 'timeout'

function createIdempotencyKey() {
  return crypto.randomUUID()
}

/**
 * Shared design tokens. Centralising these keeps every surface (cards, pills,
 * inputs, buttons) visually consistent instead of one-off hex values scattered
 * through the JSX.
 */
const ui = {
  card: 'rounded-xl border border-[#e4e7ec] bg-white dark:border-white/10 dark:bg-[#161616]',
  panel: 'rounded-xl border border-[#e4e7ec] bg-[#fbfbfc] dark:border-white/10 dark:bg-[#131313]',
  subtleBtn:
    'rounded-lg border border-[#d8dce3] bg-white px-3 py-2 text-xs font-medium text-[#344054] transition-colors hover:bg-[#f9fafb] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-transparent dark:text-[#d0d5dd] dark:hover:bg-white/5',
  input:
    'w-full rounded-lg border border-[#d0d5dd] bg-white px-3 py-2 text-sm text-[#101828] outline-none transition-shadow placeholder:text-[#98a2b3] focus:border-[#101828] focus:ring-4 focus:ring-[#101828]/[0.06] disabled:bg-[#f9fafb] disabled:text-[#98a2b3] dark:border-white/10 dark:bg-[#1c1c1c] dark:text-[#f2f2f2]',
  label: 'mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#667085] dark:text-[#8b8b8b]',
  divider: 'border-[#e4e7ec] dark:border-white/10',
  primary: '#F2B705',
  primaryHover: '#E0A800',
  primaryInk: '#241D00',
}

function PaymentBrand({ method }: { method: 'cash' | 'mpesa' | 'card' }) {
  if (method === 'cash') return (
    <span className="flex h-[88px] w-full items-center justify-center overflow-hidden rounded-xl bg-[#f7e5c9]">
      <Image src="/payment-logos/cash-ksh-note.png" alt="" width={1665} height={945} className="h-[112px] w-full scale-[1.18] object-cover" />
    </span>
  )
  if (method === 'mpesa') return (
    <span style={{ backgroundColor: '#11ad2d' }} className="flex h-[88px] w-full items-center justify-center rounded-xl px-4">
      <Image src="/payment-logos/mpesa.svg" alt="" width={132} height={54} className="h-10 w-auto object-contain brightness-0 invert" />
    </span>
  )
  return (
    <span style={{ backgroundColor: '#1a4f9a' }} className="flex h-[88px] w-full items-center justify-center gap-3 rounded-xl px-4">
      <Image src="/payment-logos/visa.svg" alt="" width={70} height={40} className="h-9 w-auto object-contain brightness-0 invert" />
      <Image src="/payment-logos/mastercard-color.svg" alt="" width={52} height={32} className="h-8 w-auto object-contain" />
    </span>
  )
}

function ReceiptMeta({ mark, label, value }: { mark: ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-[#e4e7ec] bg-white px-2.5 py-2.5 dark:border-white/10 dark:bg-[#191919]">
      <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase leading-none tracking-[0.08em] text-[#667085] dark:text-[#a8a8a8]">{mark}{label}</p>
      <p className="mt-1.5 truncate text-xs font-semibold leading-none text-[#101828] dark:text-white" title={value} aria-label={value}>{value}</p>
    </div>
  )
}

export function POSTerminal({ standalone = false, organizationId, products, categories, customers, settings, requiresAgeVerification = false, pharmacyMode = false, startCheckout = false, checkoutOnly = false, hasActiveShift = false, canDiscount = false, canRefund = false, canHold = false, canApproveRestricted = false, receiptContext, offlineContext }: POSTerminalProps) {
  const { config } = useWorkspace()
  const productTerms = getProductTerminology(config?.businessType, config?.businessCategory)
  const router = useRouter()
  const cartStorageKey = offlineWorkspaceStorageKey(organizationId, 'cart')
  const checkoutStorageKey = offlineWorkspaceStorageKey(organizationId, 'checkout-id')
  const mpesaStorageKey = offlineWorkspaceStorageKey(organizationId, 'mpesa')
  const [catalogProducts, setCatalogProducts] = useState(products)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartHydrated, setCartHydrated] = useState(false)
  const [discount, setDiscount] = useState(0)
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa' | 'card'>('cash')
  const [mpesaRef, setMpesaRef] = useState('')
  const [mpesaPhone, setMpesaPhone] = useState('')
  const [mpesaFlow, setMpesaFlow] = useState<'stk' | 'paybill'>('stk')
  const [mpesaAccountReference, setMpesaAccountReference] = useState('')
  const [mpesaShortcode, setMpesaShortcode] = useState('')
  const [mpesaAccountType, setMpesaAccountType] = useState<'paybill' | 'till'>('paybill')
  const [mpesaRequestId, setMpesaRequestId] = useState('')
  const [mpesaStatus, setMpesaStatus] = useState<MpesaStatus>('idle')
  const [mpesaMessage, setMpesaMessage] = useState('')
  const [amountPaid, setAmountPaid] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<string>('')
  const [prescriptionReference, setPrescriptionReference] = useState('')
  const [prescriberReference, setPrescriberReference] = useState('')
  const [patientReference, setPatientReference] = useState('')
  const [prescriptionIssuedAt, setPrescriptionIssuedAt] = useState('')
  const [prescriptionExpiresAt, setPrescriptionExpiresAt] = useState('')
  const [pharmacyNotes, setPharmacyNotes] = useState('')
  const [customerMenuOpen, setCustomerMenuOpen] = useState(false)
  const [discountMenuOpen, setDiscountMenuOpen] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [receipt, setReceipt] = useState<ReceiptData | null>(null)
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [newCustomerEmail, setNewCustomerEmail] = useState('')
  const [creatingCustomer, setCreatingCustomer] = useState(false)
  const [availableCustomers, setAvailableCustomers] = useState(customers || [])
  const [showRefundDialog, setShowRefundDialog] = useState(false)
  const [showReceiptReprint, setShowReceiptReprint] = useState(false)
  const [showSalesHistory, setShowSalesHistory] = useState(false)
  const [showHeldSales, setShowHeldSales] = useState(false)
  const [heldSales, setHeldSales] = useState<HeldSale[]>([])
  const [heldSalesLoading, setHeldSalesLoading] = useState(false)
  const [heldSaleActionId, setHeldSaleActionId] = useState<string | null>(null)
  const [refundSale, setRefundSale] = useState<(Sale & { items: SaleItem[] }) | null>(null)
  const [ageVerified, setAgeVerified] = useState(false)
  const [showAgeVerification, setShowAgeVerification] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(startCheckout)
  const [checkoutStep, setCheckoutStep] = useState<'customer' | 'payment'>(startCheckout ? 'payment' : 'customer')
  const [scanMessage, setScanMessage] = useState('')
  const [showWirelessScanner, setShowWirelessScanner] = useState(false)
  const [receiptPaperWidth, setReceiptPaperWidth] = useState<58 | 80>(80)
  const [receiptOptionsOpen, setReceiptOptionsOpen] = useState(false)
  const [receiptPrinted, setReceiptPrinted] = useState(false)
  const [offlineSales, setOfflineSales] = useState<OfflineSaleRecord[]>([])
  const [offlineQueueHydrated, setOfflineQueueHydrated] = useState(false)
  const [offlineSyncing, setOfflineSyncing] = useState(false)
  const offlineSyncRunningRef = useRef(false)

  useEffect(() => {
    document.body.classList.toggle('pos-receipt-active', Boolean(receipt))
    return () => document.body.classList.remove('pos-receipt-active')
  }, [receipt])
  const searchInputRef = useRef<HTMLInputElement>(null)
  const barcodeBufferRef = useRef<string>('')
  const barcodeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastScanRef = useRef<{ barcode: string; at: number } | null>(null)
  const checkoutIdempotencyKeyRef = useRef<string>('')
  const autoFinalizeRef = useRef<() => void>(() => undefined)
  const autoFinalizingRef = useRef(false)
  const processCheckoutRef = useRef<(verified?: boolean, serverAlreadyConfirmed?: boolean) => Promise<unknown>>(async () => undefined)
  const ageVerificationConfirmRef = useRef<HTMLButtonElement>(null)
  const [isOnline, setIsOnline] = useState(true)
  const mpesaLocksBasket = paymentMethod === 'mpesa' && ['initiating', 'pending', 'success'].includes(mpesaStatus)

  useEffect(() => {
    try {
      let saved = window.localStorage.getItem(cartStorageKey)
      if (!saved) {
        const legacyCart = window.localStorage.getItem('pos-active-cart')
        if (legacyCart) {
          const parsed = JSON.parse(legacyCart) as CartItem[]
          const allowedProductIds = new Set(products.map((item) => item.id))
          if (parsed.length > 0 && parsed.every((item) => allowedProductIds.has(item.productId))) {
            saved = legacyCart
            window.localStorage.setItem(cartStorageKey, legacyCart)
            const legacyCheckout = window.localStorage.getItem('pos-active-checkout-id')
            const legacyMpesa = window.localStorage.getItem('pos-active-mpesa')
            if (legacyCheckout) window.localStorage.setItem(checkoutStorageKey, legacyCheckout)
            if (legacyMpesa) window.localStorage.setItem(mpesaStorageKey, legacyMpesa)
            window.localStorage.removeItem('pos-active-cart')
            window.localStorage.removeItem('pos-active-checkout-id')
            window.localStorage.removeItem('pos-active-mpesa')
          }
        }
      }
      if (saved) setCart(JSON.parse(saved) as CartItem[])
      checkoutIdempotencyKeyRef.current = window.localStorage.getItem(checkoutStorageKey) || ''
    } catch { /* ignore malformed local state */ }
    setCartHydrated(true)
  }, [cartStorageKey, checkoutStorageKey, mpesaStorageKey, products])

  useEffect(() => {
    if (!cartHydrated) return
    window.localStorage.setItem(cartStorageKey, JSON.stringify(cart))
  }, [cart, cartHydrated, cartStorageKey])

  const refreshHeldSales = useCallback(async () => {
    if (!canHold || !hasActiveShift || typeof navigator === 'undefined' || !navigator.onLine) return
    setHeldSalesLoading(true)
    try { setHeldSales(await listHeldSales()) }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Could not load held sales') }
    finally { setHeldSalesLoading(false) }
  }, [canHold, hasActiveShift])

  useEffect(() => { void refreshHeldSales() }, [refreshHeldSales])

  useEffect(() => {
    setIsOnline(navigator.onLine)
  }, [])

  useEffect(() => {
    if (!cartHydrated) return
    try {
      const saved = JSON.parse(window.localStorage.getItem(mpesaStorageKey) || 'null') as { requestId?: string; idempotencyKey?: string; flow?: 'stk' | 'paybill'; accountReference?: string; shortcode?: string; accountType?: 'paybill' | 'till' } | null
      if (saved?.requestId && cart.length) {
        checkoutIdempotencyKeyRef.current = saved.idempotencyKey || ''
        setMpesaRequestId(saved.requestId)
        setMpesaFlow(saved.flow || 'stk')
        setMpesaAccountReference(saved.accountReference || '')
        setMpesaShortcode(saved.shortcode || '')
        setMpesaAccountType(saved.accountType || 'paybill')
        setPaymentMethod('mpesa')
        setMpesaStatus('pending')
        setMpesaMessage('Reconnecting to the active M-Pesa checkout…')
        setCheckoutOpen(true)
      }
    } catch { window.localStorage.removeItem(mpesaStorageKey) }
    // Restore once; subsequent basket updates must not restart an old request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartHydrated, mpesaStorageKey])

  const refreshOfflineSales = useCallback(async () => {
    const records = await listOfflineSales(organizationId)
    setOfflineSales(records)
    return records
  }, [organizationId])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        await adoptLegacyOfflineSales(organizationId, products.map((item) => item.id))
        // Reading before replacing the snapshot verifies that the browser cache
        // remains usable across a reload. Fresh server data wins whenever it is
        // available; the durable queue is then reserved from visible stock.
        const [cached, records] = await Promise.all([
          readOfflineCatalogue<PosProduct, POSTerminalProps['categories'][number], Customer, POSTerminalProps['settings']>(organizationId),
          listOfflineSales(organizationId),
        ])
        if (cancelled) return
        const activeCheckoutId = window.localStorage.getItem(checkoutStorageKey)
        if (checkoutAlreadyQueued(activeCheckoutId, records.map((record) => record.id))) {
          // This basket is already represented by a durable queued sale.
          window.localStorage.removeItem(cartStorageKey)
          window.localStorage.removeItem(checkoutStorageKey)
          checkoutIdempotencyKeyRef.current = ''
          setCart([])
        }
        const baseProducts = products.length ? products : cached?.products ?? []
        const reserved = new Map<string, number>()
        for (const record of records) {
          if (record.status === 'SYNCED') continue
          for (const item of record.payload.items) reserved.set(item.productId, (reserved.get(item.productId) ?? 0) + item.quantity * (item.baseUnitQuantity ?? 1))
        }
        setCatalogProducts(baseProducts.map((item) => ({ ...item, stock: Math.max(0, item.stock - (reserved.get(item.id) ?? 0)) })))
        if (!customers.length && cached?.customers?.length) setAvailableCustomers(cached.customers)
        setOfflineSales(records)
        await cacheOfflineCatalogue(organizationId, { products: baseProducts, categories: categories.length ? categories : cached?.categories ?? [], customers: customers.length ? customers : cached?.customers ?? [], settings })
      } catch {
        // Checkout still refuses an offline sale if durable storage itself fails.
      } finally {
        if (!cancelled) setOfflineQueueHydrated(true)
      }
    })()
    return () => { cancelled = true }
  }, [cartStorageKey, categories, checkoutStorageKey, customers, organizationId, products, settings])

  const synchronizeOfflineQueue = useCallback(async () => {
    if (offlineSyncRunningRef.current || typeof navigator === 'undefined' || !navigator.onLine) return
    offlineSyncRunningRef.current = true
    setOfflineSyncing(true)
    let accepted = 0
    let failed = 0
    try {
      const records = await listOfflineSales(organizationId)
      for (const record of records) {
        if (!shouldSynchronizeOfflineSale(record.status) || !navigator.onLine) continue
        await updateOfflineSale(record.id, organizationId, { status: 'SYNCING', attemptCount: record.attemptCount + 1, lastError: undefined })
        try {
          const result = await syncOfflineSale(record.payload)
          await updateOfflineSale(record.id, organizationId, { status: 'SYNCED', official: {
            saleId: result.saleId, receiptNo: result.receiptNo, tax: result.tax, rounding: result.rounding,
            total: result.total, items: result.items,
          } })
          setReceipt((current) => {
            if (!current || current.idempotencyKey !== record.id) return current
            return {
              ...current,
              saleId: result.saleId,
              receiptNo: result.receiptNo,
              taxAmount: result.tax,
              roundingAmount: result.rounding,
              total: result.total,
              items: current.items.map((item) => ({ ...item, saleItemId: result.items.find((saved) => saved.productId === item.productId)?.saleItemId ?? item.saleItemId })),
              offline: { status: 'SYNCED', provisionalReceiptNo: record.provisionalReceiptNo },
              etims: {
                status: result.etims.status,
                message: 'message' in result.etims ? result.etims.message : undefined,
                showOnReceipt: 'receiptDetailsEnabled' in result.etims ? result.etims.receiptDetailsEnabled : false,
                ...('submission' in result.etims && result.etims.submission ? {
                  environment: result.etims.submission.environment,
                  invoiceNumber: result.etims.submission.invoiceNumber,
                  controlNumber: result.etims.submission.controlNumber,
                  receiptNumber: result.etims.submission.receiptNumber,
                  internalReference: result.etims.submission.internalReference,
                  qrData: result.etims.submission.qrData,
                  verificationData: result.etims.submission.verificationData,
                } : {}),
              },
            }
          })
          accepted += 1
        } catch (error) {
          await updateOfflineSale(record.id, organizationId, { status: 'FAILED', lastError: error instanceof Error ? error.message : 'Synchronization failed' })
          failed += 1
        }
      }
      await refreshOfflineSales()
      if (accepted) toast.success(`${accepted} offline sale${accepted === 1 ? '' : 's'} synchronized`)
      if (failed) toast.error(`${failed} offline sale${failed === 1 ? '' : 's'} need${failed === 1 ? 's' : ''} review`)
    } finally {
      offlineSyncRunningRef.current = false
      setOfflineSyncing(false)
    }
  }, [organizationId, refreshOfflineSales])

  useEffect(() => {
    // The queue starts directly from the connectivity event. The synchronization
    // lock keeps this and the state-driven fallback from submitting twice.
    return bindPosConnectivityEvents(window, setIsOnline, synchronizeOfflineQueue)
  }, [synchronizeOfflineQueue])

  useEffect(() => {
    if (!offlineQueueHydrated || !isOnline) return
    void synchronizeOfflineQueue()
  }, [isOnline, offlineQueueHydrated, synchronizeOfflineQueue])

  useEffect(() => {
    if (isOnline || paymentMethod === 'cash') return
    setPaymentMethod('cash')
    setMpesaStatus('idle')
    setMpesaMessage('')
    setMpesaRef('')
  }, [isOnline, paymentMethod])

  useEffect(() => {
    if (!mpesaRequestId || mpesaStatus !== 'pending' || !isOnline) return
    let cancelled = false
    const applyResult = (result: { status: string; message?: string | null; receiptNumber?: string | null; saleId?: string | null }) => {
        if (cancelled) return
        const nextStatus: MpesaStatus = result.status === 'CONFIRMED' && result.saleId ? 'success'
          : ['SENDING_STK'].includes(result.status) ? 'initiating'
          : ['AWAITING_CUSTOMER', 'AWAITING_CONFIRMATION', 'CONFIRMED'].includes(result.status) ? 'pending'
          : result.status === 'EXPIRED' ? 'timeout'
          : ['FAILED', 'CANCELLED'].includes(result.status) ? 'failed'
          : result.status as MpesaStatus
        setMpesaStatus(nextStatus)
        setMpesaMessage(result.message || '')
        if (nextStatus === 'failed' || nextStatus === 'timeout') window.localStorage.removeItem(mpesaStorageKey)
        if (nextStatus === 'success' && result.receiptNumber) {
          setMpesaRef(result.receiptNumber)
          toast.success('M-Pesa payment received', { description: `Receipt ${result.receiptNumber}` })
          if (!autoFinalizingRef.current) {
            autoFinalizingRef.current = true
            window.setTimeout(() => autoFinalizeRef.current(), 500)
          }
        }
    }
    const poll = async () => {
      try {
        applyResult(await getMpesaPaymentStatus(mpesaRequestId))
      } catch (error) {
        if (!cancelled) setMpesaMessage(error instanceof Error ? error.message : 'Could not check M-Pesa status')
      }
    }
    void poll()
    const events = new EventSource(`/api/mpesa/status/${encodeURIComponent(mpesaRequestId)}`)
    events.onmessage = (event) => {
      try { applyResult(JSON.parse(event.data) as { status: string; message?: string | null; receiptNumber?: string | null; saleId?: string | null }) } catch { /* polling remains available */ }
    }
    const timer = window.setInterval(() => { if (navigator.onLine) void poll() }, 8_000)
    return () => { cancelled = true; events.close(); window.clearInterval(timer) }
  }, [mpesaRequestId, mpesaStatus, isOnline, mpesaStorageKey])

  // Checkout is already mounted in this terminal. Measure the local transition in
  // development without making a network request part of the cashier's Pay action.
  const openCheckout = useCallback(() => {
    if (!hasActiveShift) {
      toast.error('Start your shift before taking payment')
      return
    }
    performance.mark('pos-pay-click')
    setCheckoutOpen(true)
    setCheckoutStep('customer')
    requestAnimationFrame(() => {
      performance.mark('pos-checkout-visible')
      performance.measure('pos-pay-to-checkout-visible', 'pos-pay-click', 'pos-checkout-visible')
    })
  }, [hasActiveShift])

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && checkoutOpen) {
        setCheckoutOpen(false)
        return
      }
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && cart.length > 0 && !receipt) {
        event.preventDefault()
        openCheckout()
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchInputRef.current?.focus()
      }
      if (checkoutOpen && checkoutStep === 'payment' && !receipt) {
        const paymentShortcut = ({ F3: 'cash', F4: 'mpesa', F5: 'card' } as const)[event.key as 'F3' | 'F4' | 'F5']
        const lockedToMpesa = paymentMethod === 'mpesa' && ['initiating', 'pending', 'success'].includes(mpesaStatus)
        if (paymentShortcut && settings.paymentMethods.includes(paymentShortcut) && (isOnline || paymentShortcut === 'cash') && (!lockedToMpesa || paymentShortcut === 'mpesa')) {
          event.preventDefault()
          setPaymentMethod(paymentShortcut)
        }
      }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [cart.length, checkoutOpen, checkoutStep, receipt, settings.paymentMethods, openCheckout, paymentMethod, mpesaStatus, isOnline])

  const addToCart = useCallback((product: PosProduct, selectedPackage?: ProductPackage) => {
    if (paymentMethod === 'mpesa' && ['initiating', 'pending', 'success'].includes(mpesaStatus)) {
      toast.error('Finish the current M-Pesa payment before changing the basket')
      return
    }
    const unitsPerSale = selectedPackage?.baseUnitQuantity ?? 1
    const availablePackages = Math.floor(product.stock / unitsPerSale)
    if (availablePackages <= 0) {
      toast.error(`${product.name} is out of stock`)
      return
    }
    setCart((previousCart) => {
      const existing = previousCart.find((item) => item.productId === product.id)
      const price = Number(selectedPackage?.sellingPrice ?? product.sellingPrice)
      const packageName = selectedPackage?.name
      if (existing) {
        if ((existing.packageId ?? null) !== (selectedPackage?.id ?? null)) {
          toast.error(`Remove ${product.name} from the basket before changing its package`)
          return previousCart
        }
        if (existing.quantity >= availablePackages) {
          toast.error(`Only ${availablePackages} ${packageName ?? product.unit} in stock`)
          return previousCart
        }
        return previousCart.map((item) => item.productId === product.id
          ? { ...item, quantity: item.quantity + 1, totalPrice: (item.quantity + 1) * price }
          : item)
      }
      return [...previousCart, { productId: product.id, productName: packageName ? `${product.name} (${packageName})` : product.name, quantity: 1, unitPrice: price, totalPrice: price, packageId: selectedPackage?.id, packageName, baseUnitQuantity: unitsPerSale }]
    })
  }, [paymentMethod, mpesaStatus])

  const handleBarcodeScan = useCallback((rawBarcode: string) => {
    const barcode = normalizeBarcode(rawBarcode)
    if (!barcode) return false
    const matches = catalogProducts.flatMap((product) => {
      const candidates: Array<{ product: PosProduct; selectedPackage?: ProductPackage }> = []
      if (normalizeBarcode(product.barcode ?? '') === barcode && product.isActive) candidates.push({ product })
      for (const selectedPackage of product.packages) if (normalizeBarcode(selectedPackage.barcode ?? '') === barcode && selectedPackage.isActive) candidates.push({ product, selectedPackage })
      return candidates
    })
    if (matches.length === 0) {
      setScanMessage(`No ${productTerms.singularLower} found for barcode ${barcode}. Add the barcode to the ${productTerms.singularLower} first.`)
      toast.error(`No ${productTerms.singularLower} found for barcode ${barcode}`, {
        description: 'Register the item once, then future scans will add it to the basket.',
        action: { label: `Register ${productTerms.singularLower}`, onClick: () => router.push(`/dashboard/products/new?barcode=${encodeURIComponent(barcode)}`) },
      })
      return false
    }
    if (matches.length > 1) {
      setScanMessage(`Barcode ${barcode} is assigned to more than one ${productTerms.singularLower}. Correct the ${productTerms.singularLower} records before selling.`)
      toast.error(`Duplicate barcode detected. Ask a manager to correct the ${productTerms.pluralLower}.`)
      return false
    }
    const { product, selectedPackage } = matches[0]
    if (product.stock < (selectedPackage?.baseUnitQuantity ?? 1)) {
      setScanMessage(`${product.name} is out of stock.`)
      toast.error(`${product.name} is out of stock`)
      return false
    }
    addToCart(product, selectedPackage)
    setSearch('')
    setSelectedCategory('')
    setScanMessage(`${product.name}${selectedPackage ? ` (${selectedPackage.name})` : ''} added to basket.`)
    return true
  }, [addToCart, catalogProducts, productTerms, router])

  const SCANNER_INACTIVITY_MS = 450

  const availableCategories = useMemo(() => {
    const categoryIds = new Set(catalogProducts.map((product) => product.categoryId).filter(Boolean))
    return categories.filter((category) => category.name.trim() && categoryIds.has(category.id))
  }, [catalogProducts, categories])

  // USB scanners type rapidly like a keyboard and normally finish with Enter.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const editable = target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName ?? '')
      if (receipt || processing || checkoutOpen || editable) return

      if (e.key === 'Enter' && barcodeBufferRef.current) {
        e.preventDefault()
        const barcode = normalizeBarcode(barcodeBufferRef.current)
        barcodeBufferRef.current = ''
        if (!barcode) return
        const now = Date.now()
        if (lastScanRef.current && lastScanRef.current.barcode === barcode && now - lastScanRef.current.at < 350) return
        lastScanRef.current = { barcode, at: now }

        handleBarcodeScan(barcode)
        return
      }

      // Collect barcode characters (numbers, usually 5-20 chars)
      if (e.key.length === 1 && /[0-9a-zA-Z]/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        barcodeBufferRef.current += e.key

        // Clear buffer after 2 seconds without input
        if (barcodeTimeoutRef.current) clearTimeout(barcodeTimeoutRef.current)
        barcodeTimeoutRef.current = setTimeout(() => {
          barcodeBufferRef.current = ''
        }, SCANNER_INACTIVITY_MS)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [receipt, processing, checkoutOpen, handleBarcodeScan])

  const productsById = useMemo(() => new Map(catalogProducts.map((product) => [product.id, product])), [catalogProducts])
  const cartQuantityByProductId = useMemo(() => new Map(cart.map((item) => [item.productId, item.quantity])), [cart])
  const containsAgeRestrictedItem = requiresAgeVerification && cart.length > 0
  const prescriptionRequired = cart.some((item) => productsById.get(item.productId)?.pharmacy?.prescriptionRequired)
  const containsRestrictedMedicine = cart.some((item) => productsById.get(item.productId)?.pharmacy?.restrictedItem)
  const deferredSearch = useDeferredValue(search.trim().toLocaleLowerCase())

  const filteredProducts = useMemo(() => catalogProducts.filter(
    (p) =>
      p.isActive &&
      p.stock > 0 &&
      (!selectedCategory || p.categoryId === selectedCategory) &&
      (!deferredSearch ||
        p.name.toLocaleLowerCase().includes(deferredSearch) ||
        (p.brand ?? '').toLocaleLowerCase().includes(deferredSearch) ||
        (p.pharmacy?.genericName ?? '').toLocaleLowerCase().includes(deferredSearch) ||
        (p.pharmacy?.manufacturer ?? '').toLocaleLowerCase().includes(deferredSearch) ||
        (p.pharmacy?.internalCode ?? '').toLocaleLowerCase().includes(deferredSearch) ||
        (p.sku ?? '').toLocaleLowerCase().includes(deferredSearch) ||
        (p.barcode ?? '').toLocaleLowerCase().includes(deferredSearch))
  ), [catalogProducts, deferredSearch, selectedCategory])

  const updateQty = (productId: string, delta: number) => {
    if (mpesaLocksBasket) return toast.error('The basket is locked while M-Pesa payment is in progress')
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.productId !== productId) return i
          const newQty = i.quantity + delta
          if (newQty <= 0) return null
          const product = productsById.get(productId)
          const unitsPerSale = i.baseUnitQuantity ?? 1
          if (product && newQty * unitsPerSale > product.stock) {
            toast.error(`Only ${Math.floor(product.stock / unitsPerSale)} ${i.packageName ?? product.unit} in stock`)
            return i
          }
          return { ...i, quantity: newQty, totalPrice: newQty * i.unitPrice }
        })
        .filter(Boolean) as CartItem[]
    )
  }

  const removeFromCart = (productId: string) => {
    if (mpesaLocksBasket) return toast.error('The basket is locked while M-Pesa payment is in progress')
    setCart((prev) => prev.filter((i) => i.productId !== productId))
  }

  const subtotal = cart.reduce((sum, i) => sum + i.totalPrice, 0)
  const TAX_RATE = settings.taxEnabled ? settings.taxRate / 100 : 0
  const taxAmount = settings.taxEnabled
    ? settings.pricesIncludeTax ? subtotal - (subtotal / (1 + TAX_RATE)) : subtotal * TAX_RATE
    : 0
  const grossBeforeDiscount = settings.pricesIncludeTax ? subtotal : subtotal + taxAmount

  // Calculate discount based on type
  let discountAmount = 0
  if (discountType === 'percentage') {
    discountAmount = canDiscount ? Math.min((discount / 100) * grossBeforeDiscount, grossBeforeDiscount) : 0
  } else {
    discountAmount = canDiscount ? Math.min(discount, grossBeforeDiscount) : 0
  }

  const unroundedTotal = Number((grossBeforeDiscount - discountAmount).toFixed(2))
  const mpesaAmount = calculateMpesaAmount(unroundedTotal)
  const total = paymentMethod === 'mpesa' ? mpesaAmount.amount : unroundedTotal
  const roundingAmount = paymentMethod === 'mpesa' ? mpesaAmount.roundingAmount : 0
  const change = paymentMethod === 'cash' ? Math.max(0, parseFloat(amountPaid || '0') - total) : 0
  const offlineQueueSummary = summarizeOfflineQueue(offlineSales.map((item) => item.status))
  const showOfflineStatus = !isOnline || offlineQueueSummary.pending > 0 || offlineQueueSummary.failed > 0 || offlineSyncing

  const saveCashCheckoutOffline = async (verified: boolean, queueId: string) => {
    if (paymentMethod !== 'cash') throw new Error('Offline checkout supports cash only')
    if (!offlineContext?.sessionId) throw new Error('This register has no cached open shift for offline selling')
    if (prescriptionRequired || containsRestrictedMedicine) throw new Error('Prescription and restricted medicines require an online approval workflow')
    const offlineCreatedAt = new Date()
    const provisionalReceiptNo = createProvisionalReceiptNo(offlineCreatedAt, queueId)
    const record: OfflineSaleRecord = {
      id: queueId,
      organizationId,
      status: 'PENDING',
      provisionalReceiptNo,
      createdAt: offlineCreatedAt.toISOString(),
      updatedAt: offlineCreatedAt.toISOString(),
      attemptCount: 0,
      payload: {
        queueId,
        provisionalReceiptNo,
        offlineCreatedAt: offlineCreatedAt.toISOString(),
        sessionId: offlineContext.sessionId,
        customerId: selectedCustomer || undefined,
        items: cart,
        subtotal,
        discountAmount,
        total,
        amountReceived: parseFloat(amountPaid || '0'),
        ageVerified: requiresAgeVerification ? verified : false,
      },
    }
    await saveOfflineSale(record)
    await refreshOfflineSales()
    setReceipt({
      saleId: `offline-${queueId}`,
      receiptNo: provisionalReceiptNo,
      items: cart.map((item) => ({ ...item, saleItemId: `offline-${queueId}-${item.productId}` })),
      subtotal,
      taxAmount,
      discountAmount,
      roundingAmount: 0,
      total,
      paymentMethod: 'cash',
      change: parseFloat(amountPaid || '0') - total,
      idempotencyKey: queueId,
      ageVerified: requiresAgeVerification ? verified : false,
      completedAt: offlineCreatedAt,
      amountReceived: parseFloat(amountPaid || '0'),
      discountType: discountAmount > 0 ? discountType : undefined,
      discountValue: discountAmount > 0 ? discount : undefined,
      customerName: availableCustomers.find((customer) => customer.id === selectedCustomer)?.name || 'Walk-in customer',
      customerEmail: availableCustomers.find((customer) => customer.id === selectedCustomer)?.email,
      offline: { status: 'PENDING', provisionalReceiptNo },
      etims: { status: 'PENDING', message: 'Fiscal submission will begin after this sale synchronizes.', showOnReceipt: false },
    })
    setCatalogProducts((current) => current.map((product) => {
      const sold = cart.find((item) => item.productId === product.id)
      return sold ? { ...product, stock: Math.max(0, product.stock - sold.quantity * (sold.baseUnitQuantity ?? 1)) } : product
    }))
    setCart([])
    window.localStorage.removeItem(cartStorageKey)
    window.localStorage.removeItem(checkoutStorageKey)
    toast.success('Offline cash sale saved on this register', { description: `${provisionalReceiptNo} · synchronization pending` })
  }

  const processCheckout = async (verified = ageVerified, serverAlreadyConfirmed = false) => {
    if (!hasActiveShift) return toast.error('Start your shift before completing a sale')
    if (cart.length === 0) return toast.error('Cart is empty')
    if (prescriptionRequired && !prescriptionReference.trim()) return toast.error('Enter the prescription reference')
    if (containsRestrictedMedicine && !canApproveRestricted) return toast.error('An authorized pharmacist or manager must complete this sale')
    if (paymentMethod === 'mpesa' && ((!serverAlreadyConfirmed && mpesaStatus !== 'success') || !mpesaRequestId || !mpesaRef)) return toast.error('Wait for M-Pesa payment confirmation')
    if (paymentMethod === 'card' && !mpesaRef) return toast.error('Enter the card approval or terminal reference')
    if (paymentMethod === 'cash' && parseFloat(amountPaid || '0') < total) {
      return toast.error('Amount paid is less than total')
    }

    // Check for low stock items
    const lowStockItems = cart.filter(item => {
      const product = catalogProducts.find(p => p.id === item.productId)
      return product && (product.stock - item.quantity * (item.baseUnitQuantity ?? 1)) < product.minStock
    })

    if (lowStockItems.length > 0) {
      toast.warning(`${lowStockItems.length} item(s) will go below minimum stock level after this sale`)
    }

    setProcessing(true)

    // Generate idempotency key on first attempt
    if (!checkoutIdempotencyKeyRef.current) {
      checkoutIdempotencyKeyRef.current = createIdempotencyKey()
      window.localStorage.setItem(checkoutStorageKey, checkoutIdempotencyKeyRef.current)
    }

    if (!isOnline) {
      try {
        await saveCashCheckoutOffline(verified, checkoutIdempotencyKeyRef.current)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not save this offline sale')
      } finally {
        setProcessing(false)
      }
      return
    }

    try {
      const { saleId, receiptNo, tax, rounding: returnedRounding, total: returnedTotal, items: savedItems, etims } = await createSale({
        customerId: selectedCustomer || undefined,
        items: cart,
        subtotal,
        discountAmount,
        total,
        paymentMethod,
        paymentReference: mpesaRef || undefined,
        mpesaPaymentRequestId: paymentMethod === 'mpesa' ? mpesaRequestId : undefined,
        amountReceived: paymentMethod === 'cash' ? parseFloat(amountPaid || '0') : undefined,
        idempotencyKey: checkoutIdempotencyKeyRef.current,
        ageVerified: requiresAgeVerification ? verified : undefined,
        pharmacy: prescriptionRequired || containsRestrictedMedicine ? { prescriptionReference: prescriptionReference.trim() || undefined, prescriberReference: prescriberReference.trim() || undefined, patientReference: patientReference.trim() || undefined, issuedAt: prescriptionIssuedAt ? new Date(prescriptionIssuedAt) : undefined, expiresAt: prescriptionExpiresAt ? new Date(prescriptionExpiresAt) : undefined, notes: pharmacyNotes.trim() || undefined } : undefined,
      })
      setReceipt({
        saleId,
        receiptNo,
        items: cart.map((item) => {
          const savedItem = savedItems.find((candidate) => candidate.productId === item.productId)
          if (!savedItem) throw new Error(`Receipt item was not saved for ${item.productName}`)
          return { ...item, saleItemId: savedItem.saleItemId }
        }),
        subtotal,
        taxAmount: tax || taxAmount,
        discountAmount,
        roundingAmount: returnedRounding ?? roundingAmount,
        total: returnedTotal || total,
        paymentMethod,
        mpesaRef: mpesaRef || undefined,
        change: paymentMethod === 'cash' ? (parseFloat(amountPaid || '0') - (returnedTotal || total)) : 0,
        idempotencyKey: checkoutIdempotencyKeyRef.current,
        ageVerified: requiresAgeVerification ? verified : false,
        completedAt: new Date(),
        amountReceived: paymentMethod === 'cash' ? parseFloat(amountPaid || '0') : undefined,
        discountType: discountAmount > 0 ? discountType : undefined,
        discountValue: discountAmount > 0 ? discount : undefined,
        customerName: availableCustomers.find((customer) => customer.id === selectedCustomer)?.name || 'Walk-in customer',
        customerEmail: availableCustomers.find((customer) => customer.id === selectedCustomer)?.email,
        etims: {
          status: etims.status,
          message: 'message' in etims ? etims.message : undefined,
          showOnReceipt: 'receiptDetailsEnabled' in etims ? etims.receiptDetailsEnabled : false,
          ...('submission' in etims && etims.submission ? {
            environment: etims.submission.environment,
            invoiceNumber: etims.submission.invoiceNumber,
            controlNumber: etims.submission.controlNumber,
            receiptNumber: etims.submission.receiptNumber,
            internalReference: etims.submission.internalReference,
            qrData: etims.submission.qrData,
            verificationData: etims.submission.verificationData,
          } : {}),
        },
      })
      if (paymentMethod === 'mpesa') {
        window.localStorage.removeItem(mpesaStorageKey)
        window.localStorage.removeItem(cartStorageKey)
      }
      setCatalogProducts((current) => current.map((product) => {
        const sold = cart.find((item) => item.productId === product.id)
        return sold ? { ...product, stock: Math.max(0, product.stock - sold.quantity * (sold.baseUnitQuantity ?? 1)) } : product
      }))
      setCart([])
      window.localStorage.removeItem(cartStorageKey)
      window.localStorage.removeItem(checkoutStorageKey)

      // Show success toast with inventory update notification
      toast.success('Sale completed & inventory updated', {
        description: etims.status === 'ACCEPTED'
          ? `${cart.length} ${cart.length === 1 ? productTerms.singularLower : productTerms.pluralLower} · eTIMS accepted · Receipt #${receiptNo}`
          : ('message' in etims && etims.message) || `${cart.length} ${cart.length === 1 ? productTerms.singularLower : productTerms.pluralLower} · Receipt #${receiptNo}`,
      })
    } catch (err) {
      autoFinalizingRef.current = false
      if (paymentMethod === 'cash' && isConnectivityFailure(err)) {
        try {
          await saveCashCheckoutOffline(verified, checkoutIdempotencyKeyRef.current)
          return
        } catch (offlineError) {
          toast.error(offlineError instanceof Error ? offlineError.message : 'Could not save this offline sale')
          return
        }
      }
      toast.error(err instanceof Error ? err.message : 'Failed to process sale')
    } finally {
      setProcessing(false)
    }
  }

  useEffect(() => {
    processCheckoutRef.current = processCheckout
  })

  const confirmAgeVerification = useCallback(() => {
    setAgeVerified(true)
    setShowAgeVerification(false)

    // Confirmation deliberately continues the sale the cashier just initiated.
    // M-Pesa still waits for a successful payment confirmation before checkout.
    if (paymentMethod !== 'mpesa' || mpesaStatus === 'success') {
      void processCheckoutRef.current(true)
    }
  }, [mpesaStatus, paymentMethod])

  useEffect(() => {
    if (!showAgeVerification) return

    const handleAgeVerificationKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setShowAgeVerification(false)
        return
      }

      if (event.key === 'Enter') {
        event.preventDefault()
        confirmAgeVerification()
      }
    }

    window.addEventListener('keydown', handleAgeVerificationKeyDown)
    const frame = window.requestAnimationFrame(() => ageVerificationConfirmRef.current?.focus())

    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('keydown', handleAgeVerificationKeyDown)
    }
  }, [confirmAgeVerification, showAgeVerification])

  useEffect(() => {
    autoFinalizeRef.current = () => void processCheckout(ageVerified, true)
  })

  const handleCheckout = () => {
    if (!hasActiveShift) return toast.error('Start your shift before completing a sale')
    if (paymentMethod === 'mpesa' && mpesaStatus !== 'success') return toast.error('Send the M-Pesa prompt and wait for confirmation')
    if (requiresAgeVerification && !ageVerified) {
      setShowAgeVerification(true)
      return
    }
    void processCheckout()
  }

  const handleMpesaPrompt = async () => {
    if (requiresAgeVerification && !ageVerified) {
      setShowAgeVerification(true)
      return
    }
    if (!mpesaPhone.trim()) return toast.error('Enter the customer M-Pesa phone number')
    if (prescriptionRequired && !prescriptionReference.trim()) return toast.error('Enter the prescription reference')
    if (containsRestrictedMedicine && !canApproveRestricted) return toast.error('An authorized pharmacist or manager must complete this sale')
    if (!checkoutIdempotencyKeyRef.current || mpesaStatus === 'failed' || mpesaStatus === 'timeout') checkoutIdempotencyKeyRef.current = createIdempotencyKey()
    setMpesaStatus('initiating')
    setMpesaMessage('Sending the payment prompt…')
    setMpesaRef('')
    try {
      const response = await initiateMpesaPayment({
        phone: mpesaPhone, items: cart.map(({ productId, quantity, packageId }) => ({ productId, quantity, packageId })),
        discountAmount, idempotencyKey: checkoutIdempotencyKeyRef.current, ageVerified, customerId: selectedCustomer || undefined,
        pharmacy: prescriptionRequired || containsRestrictedMedicine ? { prescriptionReference: prescriptionReference.trim() || undefined, prescriberReference: prescriberReference.trim() || undefined, patientReference: patientReference.trim() || undefined, issuedAt: prescriptionIssuedAt ? new Date(prescriptionIssuedAt) : undefined, expiresAt: prescriptionExpiresAt ? new Date(prescriptionExpiresAt) : undefined, notes: pharmacyNotes.trim() || undefined } : undefined,
      })
      setMpesaRequestId(response.id)
      window.localStorage.setItem(mpesaStorageKey, JSON.stringify({ requestId: response.id, idempotencyKey: checkoutIdempotencyKeyRef.current, flow: 'stk' }))
      setMpesaStatus(response.status === 'CONFIRMED' ? 'success' : response.status === 'FAILED' ? 'failed' : 'pending')
      setMpesaMessage(response.message || 'Check the customer phone and enter the M-Pesa PIN.')
      if (response.status === 'success' && response.receiptNumber) setMpesaRef(response.receiptNumber)
    } catch (error) {
      setMpesaStatus('failed')
      setMpesaMessage(error instanceof Error ? error.message : 'Could not send the M-Pesa prompt')
      toast.error(error instanceof Error ? error.message : 'Could not send the M-Pesa prompt')
    }
  }

  const handlePaybillPayment = async () => {
    if (requiresAgeVerification && !ageVerified) {
      setShowAgeVerification(true)
      return
    }
    if (prescriptionRequired && !prescriptionReference.trim()) return toast.error('Enter the prescription reference')
    if (containsRestrictedMedicine && !canApproveRestricted) return toast.error('An authorized pharmacist or manager must complete this sale')
    if (!checkoutIdempotencyKeyRef.current || mpesaStatus === 'failed' || mpesaStatus === 'timeout') checkoutIdempotencyKeyRef.current = createIdempotencyKey()
    setMpesaStatus('initiating')
    setMpesaMessage('Preparing Till / PayBill payment details…')
    setMpesaRef('')
    try {
      const response = await initiateMpesaPaybillPayment({
        items: cart.map(({ productId, quantity, packageId }) => ({ productId, quantity, packageId })),
        discountAmount, idempotencyKey: checkoutIdempotencyKeyRef.current, ageVerified, customerId: selectedCustomer || undefined,
        pharmacy: prescriptionRequired || containsRestrictedMedicine ? { prescriptionReference: prescriptionReference.trim() || undefined, prescriberReference: prescriberReference.trim() || undefined, patientReference: patientReference.trim() || undefined, issuedAt: prescriptionIssuedAt ? new Date(prescriptionIssuedAt) : undefined, expiresAt: prescriptionExpiresAt ? new Date(prescriptionExpiresAt) : undefined, notes: pharmacyNotes.trim() || undefined } : undefined,
      })
      setMpesaRequestId(response.id)
      window.localStorage.setItem(mpesaStorageKey, JSON.stringify({ requestId: response.id, idempotencyKey: checkoutIdempotencyKeyRef.current, flow: 'paybill', accountReference: response.accountReference, shortcode: response.shortcode, accountType: response.accountType }))
      setMpesaStatus(response.status === 'CONFIRMED' ? 'success' : response.status === 'FAILED' ? 'failed' : 'pending')
      setMpesaMessage(response.message || 'Waiting for PayBill payment')
      setMpesaAccountReference(response.accountReference || '')
      setMpesaShortcode(response.shortcode)
      setMpesaAccountType(response.accountType)
      if (response.status === 'success' && response.receiptNumber) setMpesaRef(response.receiptNumber)
    } catch (error) {
      setMpesaStatus('failed')
      setMpesaMessage(error instanceof Error ? error.message : 'Could not prepare PayBill payment')
      toast.error(error instanceof Error ? error.message : 'Could not prepare PayBill payment')
    }
  }

  const handleNewSale = () => {
    setCart([])
    setDiscount(0)
    setMpesaRef('')
    setMpesaPhone('')
    setMpesaFlow('stk')
    setMpesaAccountReference('')
    setMpesaShortcode('')
    setMpesaAccountType('paybill')
    setMpesaRequestId('')
    setMpesaStatus('idle')
    setMpesaMessage('')
    setAmountPaid('')
    setSelectedCustomer('')
    setPrescriptionReference('')
    setPrescriberReference('')
    setPharmacyNotes('')
    setPaymentMethod('cash')
    setAgeVerified(false)
    setReceipt(null)
    setReceiptPrinted(false)
    setReceiptOptionsOpen(false)
    setSearch('')
    setCheckoutOpen(false)
    setCheckoutStep('customer')
    checkoutIdempotencyKeyRef.current = '' // Reset for new sale
    autoFinalizingRef.current = false
    window.localStorage.removeItem(cartStorageKey)
    window.localStorage.removeItem(checkoutStorageKey)
    window.localStorage.removeItem(mpesaStorageKey)
  }

  const voidCurrentSale = () => {
    if (cart.length === 0) return
    if (!window.confirm('Void the current order? All items and discounts in this order will be removed.')) return
    setCart([])
    setDiscount(0)
    setAmountPaid('')
    setMpesaRef('')
    setCheckoutOpen(false)
    setCheckoutStep('customer')
    checkoutIdempotencyKeyRef.current = ''
    window.localStorage.removeItem(cartStorageKey)
    window.localStorage.removeItem(checkoutStorageKey)
    toast.success('Current order voided')
  }

  const resetRegister = () => {
    if (cart.length > 0 && !window.confirm('Reset the register? The current order will be cleared.')) return
    handleNewSale()
    toast.success('Register reset')
  }

  const openHeldOrders = () => {
    if (!canHold) {
      setShowSalesHistory(true)
      return
    }
    setShowHeldSales(true)
    void refreshHeldSales()
  }

  const handlePrintReceipt = useCallback(() => {
    const paper = document.querySelector<HTMLElement>('.receipt-preview-origin .receipt-paper')
    if (!paper) {
      try {
        window.addEventListener('afterprint', () => {
          setReceiptPrinted(true)
          toast.success('Print request completed')
        }, { once: true })
        window.print()
      } catch {
        toast.error('Could not open the print dialog')
      }
      return
    }

    // Print preview otherwise uses the browser's A4/PDF default. Measure the
    // receipt at the chosen roll width so the page matches its real length.
    const originalWidth = paper.style.width
    const originalMaxWidth = paper.style.maxWidth
    paper.style.width = `${receiptPaperWidth}mm`
    paper.style.maxWidth = `${receiptPaperWidth}mm`
    const receiptHeightMm = Math.max(70, Math.ceil((paper.scrollHeight / 96) * 25.4) + 8)
    const printableWidthMm = receiptPaperWidth - 6
    const pageStyle = document.createElement('style')
    pageStyle.dataset.receiptPrintSize = 'true'
    pageStyle.textContent = `@media print { @page { size: ${receiptPaperWidth}mm ${receiptHeightMm}mm; margin: 0; } body:has(.receipt-preview-origin) .receipt-preview-origin { width: ${printableWidthMm}mm !important; } }`
    document.head.appendChild(pageStyle)

    const cleanup = () => {
      pageStyle.remove()
      paper.style.width = originalWidth
      paper.style.maxWidth = originalMaxWidth
    }
    window.addEventListener('afterprint', () => {
      cleanup()
      setReceiptPrinted(true)
      toast.success('Print request completed')
    }, { once: true })
    try {
      window.print()
    } catch {
      cleanup()
      toast.error('Could not open the print dialog')
    }
  }, [receiptPaperWidth])

  const handleDownloadReceipt = useCallback(async () => {
    if (!receipt) return
    try {
      const paper = document.querySelector<HTMLElement>('.receipt-preview-origin .receipt-paper')
      if (!paper) return toast.error('Receipt preview is unavailable')

      // Keep the exported paper width identical to the receipt preview.
      const originalWidth = paper.style.width
      const originalMaxWidth = paper.style.maxWidth
      paper.style.width = `${receiptPaperWidth}mm`
      paper.style.maxWidth = `${receiptPaperWidth}mm`
      if (document.fonts?.ready) await document.fonts.ready

      // Capture the rendered thermal paper itself so the download matches the
      // exact receipt design on screen. The sale is never re-created or mutated.
      try {
        const [{ jsPDF }, html2canvasModule] = await Promise.all([
          import('jspdf'),
          import('html2canvas'),
        ])
        const canvas = await html2canvasModule.default(paper, {
          backgroundColor: '#ffffff',
          scale: 2,
          useCORS: true,
          logging: false,
        })
        const paperWidthMm = receiptPaperWidth
        const paperHeightMm = (canvas.height / canvas.width) * paperWidthMm
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: [paperWidthMm, paperHeightMm],
          compress: true,
        })
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, paperWidthMm, paperHeightMm, undefined, 'FAST')
        pdf.save(`${receipt.receiptNo}.pdf`)
        toast.success('Receipt PDF downloaded')
      } finally {
        paper.style.width = originalWidth
        paper.style.maxWidth = originalMaxWidth
      }
    } catch {
      toast.error('Could not download receipt')
    }
  }, [receipt, receiptPaperWidth])

  const handleShareReceipt = useCallback(async () => {
    if (!receipt) return
    const provisional = receipt.offline?.status === 'PENDING'
      ? 'PROVISIONAL OFFLINE RECEIPT · synchronization pending · not an official or fiscal receipt · '
      : ''
    const text = `${provisional}Receipt ${receipt.receiptNo} · ${formatCurrency(receipt.total)} · ${receipt.paymentMethod}`
    try {
      if (navigator.share) {
        await navigator.share({ title: `Receipt ${receipt.receiptNo}`, text })
        return
      }
      await navigator.clipboard.writeText(text)
      toast.success('Receipt details copied')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      toast.error('Could not share receipt details')
    }
  }, [receipt])

  const holdSale = async () => {
    if (!canHold || cart.length === 0) return
    if (!isOnline) return toast.error('Reconnect to hold this sale on the shared register queue')
    const requestId = createIdempotencyKey()
    setHeldSaleActionId(requestId)
    try {
      const saved = await holdSaleOnServer({ idempotencyKey: requestId, items: cart, discountValue: discount, discountType, customerId: selectedCustomer || undefined })
      setHeldSales((previous) => [saved, ...previous.filter((item) => item.id !== saved.id)])
      setCart([])
      setDiscount(0)
      setSelectedCustomer('')
      setAmountPaid('')
      setMpesaRef('')
      setCheckoutOpen(false)
      checkoutIdempotencyKeyRef.current = ''
      window.localStorage.removeItem(cartStorageKey)
      window.localStorage.removeItem(checkoutStorageKey)
      toast.success('Sale held for this branch', { description: 'It can be resumed from another authorized register.' })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not hold this sale')
    } finally { setHeldSaleActionId(null) }
  }

  const resumeHeldSale = async (heldSale: HeldSale) => {
    if (!isOnline) return toast.error('Reconnect before resuming a shared held sale')
    setHeldSaleActionId(heldSale.id)
    try {
      const result = await resumeHeldSaleFromServer(heldSale.id)
      setCart(result.heldSale.cart)
      setDiscount(result.heldSale.discount)
      setDiscountType(result.heldSale.discountType)
      setSelectedCustomer(result.heldSale.customerId)
      setHeldSales((previous) => previous.filter((sale) => sale.id !== heldSale.id))
      setShowHeldSales(false)
      setCheckoutOpen(false)
      checkoutIdempotencyKeyRef.current = ''
      window.localStorage.removeItem(checkoutStorageKey)
      toast.success(result.priceChanged ? 'Held sale restored with current prices' : 'Held sale restored')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not resume this held sale')
      await refreshHeldSales()
    } finally { setHeldSaleActionId(null) }
  }

  const deleteHeldSale = async (heldSale: HeldSale) => {
    if (!isOnline) return toast.error('Reconnect before discarding a shared held sale')
    setHeldSaleActionId(heldSale.id)
    try {
      await discardHeldSale(heldSale.id)
      setHeldSales((previous) => previous.filter((sale) => sale.id !== heldSale.id))
      toast.success('Held sale discarded')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not discard this held sale')
    } finally { setHeldSaleActionId(null) }
  }

  const handleCreateCustomer = async () => {
    if (!newCustomerName.trim()) {
      toast.error('Customer name is required')
      return
    }

    setCreatingCustomer(true)
    try {
      const { id } = await createCustomer({
        name: newCustomerName,
        phone: newCustomerPhone || undefined,
        email: newCustomerEmail || undefined,
      })

      // Add new customer to list
      const newCust = {
        id,
        name: newCustomerName,
        phone: newCustomerPhone || null,
        email: newCustomerEmail || null,
        address: null,
        kraPin: null,
        customerType: 'individual',
        vatRegistered: false,
        loyaltyPoints: 0,
        userId: '',
        orgId: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      setAvailableCustomers([...availableCustomers, newCust])
      setSelectedCustomer(id)

      // Reset form
      setNewCustomerName('')
      setNewCustomerPhone('')
      setNewCustomerEmail('')
      setShowNewCustomer(false)

      toast.success('Customer created successfully')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create customer')
    } finally {
      setCreatingCustomer(false)
    }
  }

  const inputCls = ui.input

  // Show refund dialog if refund sale is set
  if (showRefundDialog && receipt && receipt.offline?.status !== 'PENDING') {
    const saleWithItems: Sale & { items: SaleItem[] } = {
      ...receipt,
      id: receipt.saleId,
      subtotal: receipt.subtotal.toString(),
      taxAmount: receipt.taxAmount.toString(),
      discountAmount: receipt.discountAmount.toString(),
      roundingAmount: receipt.roundingAmount.toString(),
      total: receipt.total.toString(),
      customerId: selectedCustomer || null,
      amountReceived: receipt.paymentMethod === 'cash' ? String(parseFloat(amountPaid || '0')) : null,
      change: receipt.change.toString(),
      mpesaRef: receipt.mpesaRef || null,
      idempotencyKey: receipt.idempotencyKey,
      ageVerified: receipt.ageVerified,
      ageVerifiedAt: receipt.ageVerified ? receipt.completedAt : null,
      ageVerifiedBy: null,
      branchId: null,
      posSessionId: null,
      origin: receipt.offline ? 'offline' : 'online',
      provisionalReceiptNo: receipt.offline?.provisionalReceiptNo ?? null,
      offlineCreatedAt: receipt.offline ? receipt.completedAt : null,
      syncedAt: receipt.offline?.status === 'SYNCED' ? new Date() : null,
      status: 'completed',
      userId: '',
      orgId: '',
      createdAt: receipt.completedAt,
      items: receipt.items.map(item => ({
        id: item.saleItemId,
        saleId: receipt.saleId,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        packageId: item.packageId ?? null,
        packageName: item.packageName ?? null,
        baseUnitQuantity: item.baseUnitQuantity ?? 1,
        unitPrice: item.unitPrice.toString(),
        totalPrice: item.totalPrice.toString(),
        unitCostAtSale: '0',
        totalCost: '0',
        userId: '',
        orgId: '',
      })),
    }

    return (
      <RefundDialog
        sale={saleWithItems}
        onClose={() => setShowRefundDialog(false)}
        onSuccess={(returnedItems) => {
          setCatalogProducts((current) => current.map((product) => {
            const returned = returnedItems.find((item) => item.productId === product.id)
            return returned ? { ...product, stock: product.stock + returned.quantity } : product
          }))
          setShowRefundDialog(false)
          handleNewSale()
          toast.success('Refund processed successfully')
        }}
      />
    )
  }

  // A completed sale stays in the register workspace. Cashiers should not have
  // to work through a consumer-style modal or a blurred copy of the POS.
  if (receipt) {
    const printableSale = {
      id: receipt.saleId,
      receiptNo: receipt.receiptNo,
      createdAt: receipt.completedAt,
      subtotal: receipt.subtotal.toFixed(2),
      taxAmount: receipt.taxAmount.toFixed(2),
      discountAmount: receipt.discountAmount.toFixed(2),
      roundingAmount: receipt.roundingAmount.toFixed(2),
      total: receipt.total.toFixed(2),
      paymentMethod: receipt.paymentMethod,
      mpesaRef: receipt.mpesaRef ?? null,
      items: receipt.items.map((item) => ({
        id: `${receipt.saleId}-${item.productId}`,
        productName: item.productName,
        productId: item.productId,
        quantity: item.quantity,
        totalPrice: item.totalPrice.toFixed(2),
      })),
      etims: receipt.etims?.showOnReceipt ? receipt.etims : null,
      offline: receipt.offline ?? null,
    }

    const paymentLabel = receipt.paymentMethod === 'mpesa' ? 'M-Pesa' : receipt.paymentMethod === 'card' ? 'Card' : 'Cash'
    const taxLabel = settings.taxEnabled && settings.taxRate > 0 ? `${settings.taxName} (${settings.taxRate}%)` : settings.taxName
    const discountDetail = receipt.discountType === 'percentage' && receipt.discountValue != null
      ? `${receipt.discountValue}% discount`
      : receipt.discountAmount > 0 ? 'Fixed amount discount' : null
    const discountValue = receipt.discountType === 'percentage' && receipt.discountValue != null
      ? `${receipt.discountValue}%`
      : receipt.discountValue != null ? formatCurrency(receipt.discountValue) : formatCurrency(receipt.discountAmount)

    return (
      <section aria-label="Completed sale receipt" className="pos-sale-complete flex min-h-[calc(100vh-8rem)] w-full items-center justify-center bg-[#f7f8fa] px-3 py-6 dark:bg-[#0e0f11] sm:px-6 sm:py-8">
        <div className="w-full max-w-5xl">
          <div className="mb-4 flex items-start justify-between gap-4 rounded-2xl border border-[#ead28a] bg-gradient-to-r from-[#fffdf7] via-[#fff9e5] to-[#fff1b8] px-4 py-3.5 shadow-[0_2px_8px_rgba(151,112,0,.08)] dark:border-[rgba(255,214,10,.22)] dark:from-[#15130c] dark:via-[#201b0d] dark:to-[#30270f] dark:shadow-[0_2px_8px_rgba(0,0,0,.18)] sm:px-5">
            <div className="flex min-w-0 items-start gap-3">
              <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border', receipt.offline?.status === 'PENDING' ? 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30' : 'border-[#b7ebc6] bg-[#ecfdf3] dark:border-[#1d6b3b] dark:bg-[#102417]')}>{receipt.offline?.status === 'PENDING' ? <CloudOff className="h-4 w-4 text-amber-700 dark:text-amber-300" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4 text-[#12b76a] dark:text-[#86efac]" aria-hidden="true" />}</span>
              <div>
                <p className="text-sm font-bold text-[#101828] dark:text-white">{receipt.offline?.status === 'PENDING' ? 'Offline cash sale saved' : receipt.offline?.status === 'SYNCED' ? 'Offline sale synchronized' : 'Sale completed'}</p>
                <p className="mt-0.5 text-xs text-[#667085] dark:text-[#c7b978]">{receipt.offline?.status === 'PENDING' ? `Provisional receipt ${receipt.receiptNo} · sync pending` : `Paid successfully · Receipt #${receipt.receiptNo}`}</p>
                {receipt.etims && receipt.etims.status !== 'NOT_REQUIRED' && <p className={`mt-1 text-xs font-semibold ${receipt.etims.status === 'ACCEPTED' ? 'text-emerald-700 dark:text-emerald-300' : receipt.etims.status === 'FAILED' ? 'text-rose-700 dark:text-rose-300' : 'text-amber-700 dark:text-amber-300'}`}>eTIMS: {receipt.etims.status === 'ACCEPTED' ? 'Accepted' : receipt.etims.status === 'FAILED' ? 'Action required' : 'Pending submission'}</p>}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-lg font-bold tracking-tight text-[#101828] dark:text-white">{formatCurrency(receipt.total)}</p>
              <p className="text-xs text-[#667085] dark:text-[#c7b978]">{formatDateTime(receipt.completedAt)}</p>
            </div>
          </div>

          <div className="grid overflow-hidden rounded-xl border border-[#dfe3ea] bg-white shadow-sm dark:border-white/10 dark:bg-[#171717] lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="flex min-h-[500px] items-center justify-center bg-[#f2f4f7] p-5 dark:bg-[#151619] sm:p-8">
              <div className="receipt-screen-preview w-fit max-w-full">
                <div className="receipt-preview-origin mx-auto w-full max-w-[80mm] overflow-hidden rounded-lg bg-white shadow-[0_8px_20px_rgba(16,24,40,.10)]" style={{ width: `${receiptPaperWidth}mm` }}>
                  <ReceiptTemplate sale={printableSale} businessName={settings.receiptBusinessName} businessPhone={settings.receiptPhone} businessAddress={settings.receiptAddress} receiptFooter={settings.receiptFooter} cashierName={receiptContext?.cashierName} customerName={receipt.customerName} layout="thermal" template={settings.receiptTemplate} logoUrl={settings.receiptLogoUrl} taxName={taxLabel} showPhone={settings.receiptShowPhone} showAddress={settings.receiptShowAddress} showCashier={settings.receiptShowCashier} showCustomer={settings.receiptShowCustomer} showPayment={settings.receiptShowPayment} showQrCode={settings.receiptShowQrCode} showItemSku={settings.receiptShowItemSku} />
                </div>
              </div>
            </div>

            <aside className="flex flex-col border-t border-[#e4e7ec] bg-white p-4 dark:border-white/10 dark:bg-[#171717] lg:border-l lg:border-t-0 sm:p-5">
              <div className="space-y-4">
                <div>
                  <p className={ui.label}>Payment</p>
                  <div className="rounded-lg border border-[#e4e7ec] bg-[#fbfbfc] p-3 dark:border-white/10 dark:bg-white/5">
                    <div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-sm font-semibold text-[#101828] dark:text-white"><WalletCards className="h-4 w-4 text-[#b77900]" />{paymentLabel}</span><span className="text-sm font-bold text-[#101828] dark:text-white">{formatCurrency(receipt.total)}</span></div>
                    {receipt.paymentMethod === 'cash' && receipt.amountReceived != null && <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#e4e7ec] pt-3 text-xs dark:border-white/10"><span className="text-[#667085] dark:text-[#a8a8a8]">Cash received</span><span className="text-right font-semibold text-[#101828] dark:text-white">{formatCurrency(receipt.amountReceived)}</span><span className={cn('font-semibold', receipt.change > 0 ? 'text-[#067647] dark:text-[#8de1aa]' : 'text-[#667085] dark:text-[#a8a8a8]')}>{receipt.change > 0 ? 'Change due' : 'Change'}</span><span className={cn('text-right font-semibold tabular-nums', receipt.change > 0 ? 'rounded-md bg-[#ecfdf3] px-2 py-1 text-base font-bold text-[#067647] dark:bg-emerald-950/45 dark:text-[#8de1aa]' : 'text-xs text-[#667085] dark:text-[#a8a8a8]')}>{formatCurrency(receipt.change)}</span></div>}
                    {receipt.mpesaRef && <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#e4e7ec] pt-3 text-xs dark:border-white/10"><span className="text-[#667085] dark:text-[#a8a8a8]">Reference</span><span className="font-semibold text-[#101828] dark:text-white">{receipt.mpesaRef}</span></div>}
                    {(receipt.taxAmount > 0 || receipt.discountAmount > 0) && <div className="mt-3 space-y-1.5 border-t border-[#e4e7ec] pt-3 text-xs dark:border-white/10">{receipt.taxAmount > 0 && <div className="flex justify-between gap-3"><span className="text-[#667085] dark:text-[#a8a8a8]">{taxLabel}</span><span className="font-semibold text-[#101828] dark:text-white">{formatCurrency(receipt.taxAmount)}</span></div>}{receipt.discountAmount > 0 && <><div className="flex justify-between gap-3"><span className="text-[#667085] dark:text-[#a8a8a8]">{discountDetail}</span><span className="font-semibold text-[#101828] dark:text-white">{discountValue}</span></div><div className="flex justify-between gap-3"><span className="text-[#067647] dark:text-[#8de1aa]">Amount saved</span><span className="font-semibold text-[#067647] dark:text-[#8de1aa]">−{formatCurrency(receipt.discountAmount)}</span></div></>}</div>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <ReceiptMeta mark={<UserRound className="h-3.5 w-3.5 text-[#667085] dark:text-[#a8a8a8]" />} label="Customer" value={receipt.customerName} />
                  {receiptContext?.cashierName && <ReceiptMeta mark={<BadgeCheck className="h-3.5 w-3.5 text-[#667085] dark:text-[#a8a8a8]" />} label="Cashier" value={receiptContext.cashierName} />}
                  {receiptContext?.registerName && <ReceiptMeta mark={<Monitor className="h-3.5 w-3.5 text-[#667085] dark:text-[#a8a8a8]" />} label="Register" value={receiptContext.registerName} />}
                  {receiptContext?.locationName && <ReceiptMeta mark={<MapPin className="h-3.5 w-3.5 text-[#667085] dark:text-[#a8a8a8]" />} label="Location" value={receiptContext.locationName} />}
                </div>
              </div>
              <div className="mt-5 space-y-2 border-t border-[#e4e7ec] pt-4 dark:border-white/10">
                {receipt.offline?.status === 'PENDING' && <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs text-amber-950 dark:border-amber-800 dark:bg-amber-950/25 dark:text-amber-100"><p className="font-bold">Official receipt and eTIMS pending</p><p className="mt-1 leading-4 opacity-80">Keep this provisional receipt. Pesaby will synchronize it when the register reconnects.</p>{isOnline && <button type="button" disabled={offlineSyncing} onClick={() => void synchronizeOfflineQueue()} className="mt-2 inline-flex items-center gap-1.5 font-bold underline underline-offset-2">{offlineSyncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}Synchronize now</button>}</div>}
                <button onClick={handleNewSale} style={{ backgroundColor: ui.primary, color: ui.primaryInk }} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-bold transition-opacity hover:opacity-90"><Plus className="h-4 w-4" />Start next sale</button>
                <div className="grid grid-cols-2 gap-2"><button onClick={handlePrintReceipt} className={cn(ui.subtleBtn, 'flex h-10 items-center justify-center gap-2')}><Printer className="h-4 w-4" />{receiptPrinted ? 'Reprint receipt' : 'Print receipt'}</button><button onClick={handleDownloadReceipt} className={cn(ui.subtleBtn, 'flex h-10 items-center justify-center gap-2')}><Download className="h-4 w-4" />Download</button></div>
                <div className="grid grid-cols-[1fr_auto] gap-2"><button onClick={() => void handleShareReceipt()} className={cn(ui.subtleBtn, 'flex h-10 items-center justify-center gap-2')}><Share2 className="h-4 w-4" />Share</button><div className="relative"><button aria-label="Receipt options" aria-expanded={receiptOptionsOpen} onClick={() => setReceiptOptionsOpen((open) => !open)} className={cn(ui.subtleBtn, 'flex h-10 w-10 items-center justify-center px-0')}><MoreHorizontal className="h-4 w-4" /></button>{receiptOptionsOpen && <div className="absolute bottom-12 right-0 z-10 w-40 rounded-lg border border-[#dfe3ea] bg-white p-1.5 shadow-lg dark:border-white/10 dark:bg-[#1c1c1c]"><p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#667085] dark:text-[#a8a8a8]">Paper width</p>{([80, 58] as const).map((width) => <button key={width} onClick={() => { setReceiptPaperWidth(width); setReceiptOptionsOpen(false) }} className={cn('flex w-full rounded-md px-2 py-1.5 text-left text-xs font-medium hover:bg-[#f9fafb] dark:hover:bg-white/5', receiptPaperWidth === width && 'bg-[#fff5cf] text-[#7a5200] dark:bg-[#3a2d0d] dark:text-[#ffd86a]')}>{width} mm</button>)}</div>}</div></div>
                <button onClick={handleNewSale} className="mt-1 flex w-full items-center justify-center gap-2 py-1 text-xs font-semibold text-[#667085] transition-colors hover:text-[#101828] dark:text-[#a8a8a8] dark:hover:text-white"><ArrowLeft className="h-3.5 w-3.5" />Back to POS</button>
              </div>
            </aside>
          </div>
        </div>
      </section>
    )
  }

  return (
    <div className={cn(
      'pos-terminal relative grid gap-4 bg-[#f7f8fa] dark:bg-[#0c0c0c] sm:gap-5 lg:grid-cols-[minmax(0,1fr)_460px] lg:items-stretch xl:grid-cols-[minmax(0,1fr)_520px]',
      standalone ? 'h-full min-h-0 lg:h-full lg:min-h-0' : 'min-h-[calc(100vh-10.5rem)] lg:h-[calc(100dvh-10.5rem)] lg:min-h-[520px]',
      showOfflineStatus && 'lg:grid-rows-[auto_minmax(0,1fr)]',
      checkoutOnly && 'w-full max-w-none bg-transparent lg:h-auto lg:grid-cols-1 lg:gap-6'
    )}>
      {showOfflineStatus && <div className={cn('flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-xs lg:col-span-2', !isOnline ? 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/25 dark:text-amber-100' : offlineQueueSummary.failed ? 'border-rose-300 bg-rose-50 text-rose-950 dark:border-rose-900 dark:bg-rose-950/25 dark:text-rose-100' : 'border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-900 dark:bg-sky-950/25 dark:text-sky-100')} role="status" aria-live="polite"><div className="flex items-start gap-2.5">{!isOnline ? <CloudOff className="mt-0.5 h-4 w-4 shrink-0" /> : offlineSyncing ? <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" /> : <RefreshCw className="mt-0.5 h-4 w-4 shrink-0" />}<div><p className="font-bold">{!isOnline ? 'Offline cash mode' : offlineQueueSummary.failed ? 'Offline sales need attention' : offlineSyncing ? 'Synchronizing offline sales' : 'Offline sales waiting to synchronize'}</p><p className="mt-0.5 opacity-80">{!isOnline ? 'Cash sales are saved on this register. M-Pesa, card and eTIMS remain unavailable until reconnection.' : `${offlineQueueSummary.pending} pending · ${offlineQueueSummary.failed} failed · ${offlineQueueSummary.synced} synchronized on this register`}</p>{offlineQueueSummary.failed > 0 && <details className="mt-1.5"><summary className="cursor-pointer font-semibold underline underline-offset-2">View sync errors</summary><ul className="mt-1 space-y-1">{offlineSales.filter((item) => item.status === 'FAILED').map((item) => <li key={item.id}><b>{item.provisionalReceiptNo}:</b> {item.lastError || 'Synchronization failed'}</li>)}</ul></details>}</div></div>{isOnline && <button type="button" disabled={offlineSyncing} onClick={() => void synchronizeOfflineQueue()} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-current/20 bg-background/70 px-3 font-bold disabled:opacity-50">{offlineSyncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}Retry synchronization</button>}</div>}
      {/* Left: Product catalog */}
      <section className={cn(ui.card, 'flex min-h-[520px] min-w-0 flex-col overflow-hidden lg:min-h-0', checkoutOnly && 'hidden')}>
        <div className="border-b border-[#eef0f3] px-5 py-3 dark:border-white/10 sm:px-6">
          <div className="mb-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-semibold tracking-tight text-[#101828] dark:text-white">{productTerms.title}</h2>
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#067647] dark:text-[#8de1aa]"><span className="h-1.5 w-1.5 rounded-full bg-[#12b76a]" />{filteredProducts.length} available</span>
            </div>
            <p className="hidden text-xs text-[#667085] dark:text-[#8b8b8b] sm:block">Tap to add</p>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98a2b3]" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={pharmacyMode ? 'Search medicine, generic name or barcode…' : 'Search by name, SKU or barcode…'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return
                const barcode = normalizeBarcode(search)
                if (barcode) { e.preventDefault(); handleBarcodeScan(barcode) }
              }}
              className={cn(inputCls, 'h-10 rounded-lg pl-9 pr-32')}
              autoFocus
            />
            <button type="button" onClick={() => setShowWirelessScanner(true)} className="absolute right-1.5 top-1/2 inline-flex h-7 -translate-y-1/2 items-center gap-1 rounded-md border border-[#e4e7ec] bg-white px-2 text-[11px] font-semibold text-[#344054] shadow-sm transition-colors hover:border-[#f9b21d] hover:bg-[#fff8e6] dark:border-white/15 dark:bg-[#1c1c1c] dark:text-white dark:hover:border-[#f9b21d]"><Smartphone className="h-3.5 w-3.5" /> Pair phone</button>
          </div>
          <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-[#667085] dark:text-[#8b8b8b]" role="status" aria-live="polite">
            <span className="h-1.5 w-1.5 rounded-full bg-[#12b76a]" />
            {scanMessage || 'Scanner ready'}
          </p>
        </div>

        {/* Category filter */}
        {availableCategories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto border-b border-[#eef0f3] px-4 py-3 dark:border-white/10 sm:px-5">
            <button
              onClick={() => setSelectedCategory('')}
              className={cn(
                'flex-shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors',
                !selectedCategory
                  ? 'border-[#f9b21d] bg-[#f9b21d] text-[#241d00] shadow-sm dark:border-[#f9b21d] dark:bg-[#f9b21d] dark:text-[#241d00]'
                  : 'border-[#dfe3e8] bg-white text-[#344054] hover:border-[#cfd4dc] hover:bg-[#f9fafb] dark:border-white/15 dark:bg-[#151515] dark:text-[#e4e7ec] dark:hover:border-white/25 dark:hover:bg-[#1c1c1c]'
              )}
            >
              All {productTerms.pluralLower}
            </button>
            {availableCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={cn(
                'flex-shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors',
                selectedCategory === category.id
                    ? 'border-[#f9b21d] bg-[#f9b21d] text-[#241d00] shadow-sm dark:border-[#f9b21d] dark:bg-[#f9b21d] dark:text-[#241d00]'
                    : 'border-[#dfe3e8] bg-white text-[#344054] hover:border-[#cfd4dc] hover:bg-[#f9fafb] dark:border-white/15 dark:bg-[#151515] dark:text-[#e4e7ec] dark:hover:border-white/25 dark:hover:bg-[#1c1c1c]'
                )}
              >
                {category.name}
              </button>
            ))}
          </div>
        )}

        {/* Product grid */}
        <div className="pos-scroll-region min-h-0 flex-1 overflow-y-auto bg-[#fbfbfc] p-3 dark:bg-[#0f0f0f] sm:p-4">
          {filteredProducts.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-center">
              <Package className="mb-3 h-9 w-9 text-[#d0d5dd]" strokeWidth={1.5} />
              <p className="text-sm font-medium text-[#344054]">
                {search ? `No ${productTerms.pluralLower} match your search` : `No active ${productTerms.pluralLower} with stock`}
              </p>
              <p className="mt-1 text-xs text-[#98a2b3]">
                {search ? 'Try a different search term' : pharmacyMode ? 'Create medicines, then receive stock with batch and expiry details' : `Add ${productTerms.pluralLower} to begin selling`}
              </p>
            </div>
          ) : (
            <div className={cn(
              'grid grid-cols-2 sm:grid-cols-3',
              standalone ? 'gap-2.5 lg:grid-cols-[repeat(auto-fill,minmax(172px,1fr))]' : 'gap-3.5 xl:grid-cols-4'
            )}>
              {filteredProducts.map((product) => {
                const inCartQuantity = cartQuantityByProductId.get(product.id)
                const outOfStock = product.stock === 0
                return (
                  <article
                    key={product.id}
                    onClick={() => addToCart(product)}
                    onKeyDown={(event) => {
                      if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return
                      event.preventDefault()
                      addToCart(product)
                    }}
                    role="button"
                    tabIndex={outOfStock ? -1 : 0}
                    aria-disabled={outOfStock}
                    aria-label={`Add ${product.name} to basket${inCartQuantity ? `, currently ${inCartQuantity}` : ''}`}
                    className={cn(
                      'pos-product-card group relative flex flex-col overflow-hidden rounded-lg border bg-white text-left shadow-[0_1px_2px_rgba(16,24,40,.03)] transition-colors duration-100 motion-reduce:transition-none after:pointer-events-none after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#f2b705] after:opacity-0',
                      standalone ? 'min-h-[184px]' : 'min-h-[224px]',
                      'disabled:cursor-not-allowed disabled:opacity-50',
                      outOfStock
                        ? 'cursor-not-allowed opacity-65'
                        : 'cursor-pointer hover:border-[#cfd4dc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f9b21d]/45 focus-visible:ring-offset-2 dark:hover:border-white/20 dark:hover:bg-[#181818]',
                      'dark:bg-[#161616]',
                      inCartQuantity
                        ? 'border-[#f9b21d] bg-[#fff8e6] ring-1 ring-[#f9b21d]/55 after:opacity-100 dark:border-[#f9b21d] dark:bg-[#2a2111] dark:ring-[#f9b21d]/35'
                        : 'border-[#e4e7ec] dark:border-white/10'
                    )}
                  >
                    {/* Stock badge */}
                    {product.stock <= product.minStock && product.stock > 0 && (
                      <div className="absolute left-2 top-2 z-10 rounded-full bg-[#fffaeb] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#b54708] ring-1 ring-inset ring-[#fedf89]">Low</div>
                    )}
                    {outOfStock && (
                      <div className="absolute left-2 top-2 z-10 rounded-full bg-[#fef3f2] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#b42318] ring-1 ring-inset ring-[#fecdca]">Sold out</div>
                    )}

                    {/* Product image or icon */}
                    {product.imageUrl ? (
                      <span className={cn('relative block w-full overflow-hidden bg-[#f5f6f8] dark:bg-[#1f1f1f]', standalone ? 'h-[86px]' : 'h-[112px]')}>
                        <Image
                          src={product.imageUrl}
                          alt={product.name}
                          fill
                          sizes="(min-width: 1280px) 240px, (min-width: 640px) 30vw, 50vw"
                          quality={60}
                          className="object-contain p-1.5"
                        />
                      </span>
                    ) : (
                      <div className={cn('flex w-full items-center justify-center bg-[#f5f6f8] text-[#98a2b3] dark:bg-[#1f1f1f]', standalone ? 'h-[86px]' : 'h-[112px]')}>
                        <Package className="h-7 w-7" strokeWidth={1.5} />
                      </div>
                    )}
                    <div className={cn('flex flex-1 flex-col', standalone ? 'px-3 pb-3 pt-2.5' : 'px-3.5 pb-3.5 pt-3')}>
                      <p className={cn('mb-0.5 line-clamp-2 font-semibold leading-snug text-[#101828] dark:text-white', standalone ? 'text-[13px]' : 'text-sm')}>{product.name}</p>
                      {product.pharmacy && <p className="line-clamp-1 text-[10px] text-[#667085] dark:text-[#a8a8a8]">{[product.pharmacy.genericName, product.pharmacy.strength, product.pharmacy.dosageForm, product.pharmacy.packSize].filter(Boolean).join(' · ')}</p>}
                      {product.pharmacy && (product.pharmacy.prescriptionRequired || product.pharmacy.restrictedItem) && <div className="mt-1 flex flex-wrap gap-1">{product.pharmacy.prescriptionRequired && <span className="rounded border px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide">Prescription</span>}{product.pharmacy.restrictedItem && <span className="rounded border border-amber-300 bg-amber-50 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">Restricted</span>}</div>}
                      {(product.volume || product.unit) && (
                        <p className="text-[11px] text-[#667085] dark:text-[#8b8b8b]">
                          {product.volume ? `${product.volume} ${product.volumeUnit || ''}` : ''}{product.volume && product.unit ? ' · ' : ''}{product.unit}
                        </p>
                      )}
                      {product.packages.length > 0 && <div className="mt-2 flex flex-wrap gap-1" onClick={(event) => event.stopPropagation()}>{product.packages.map((item) => <button key={item.id} type="button" disabled={product.stock < item.baseUnitQuantity} onClick={() => addToCart(product, item)} className="rounded-md border border-[#dfe3ea] bg-[#f9fafb] px-1.5 py-1 text-[9px] font-bold text-[#344054] hover:border-[#f9b21d] disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-[#e4e7ec]" title={`${item.baseUnitQuantity} base units · ${formatCurrency(item.sellingPrice)}`}>{item.name}</button>)}</div>}
                      <div className="mt-auto flex items-end justify-between gap-2 pt-2">
                        <p className={cn('font-bold tabular-nums text-[#101828] dark:text-white', standalone ? 'text-[13px]' : 'text-sm')}>{formatCurrency(product.sellingPrice)}</p>
                        {inCartQuantity ? (
                          <div
                            className="relative z-20 flex h-8 shrink-0 items-center overflow-hidden rounded-lg border border-[#101828] bg-white dark:border-white/20 dark:bg-[#1c1c1c]"
                            onClick={(event) => event.stopPropagation()}
                            title={`${product.stock} ${product.unit} in stock`}
                          >
                            <button
                              type="button"
                              onClick={() => updateQty(product.id, -1)}
                              className="flex h-full w-7 items-center justify-center text-[#101828] transition-colors hover:bg-[#f2f4f7] focus-visible:outline-none dark:text-[#f1f1f1] dark:hover:bg-[#302d28]"
                              aria-label={`Reduce ${product.name} quantity`}
                              title="Reduce quantity"
                            >
                              <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
                            </button>
                            <span className="min-w-6 border-x border-[#101828]/15 px-1 text-center text-xs font-bold tabular-nums text-[#101828] dark:border-[#f2b705] dark:bg-[#f2b705] dark:text-[#241d00]" aria-live="polite">
                              {inCartQuantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQty(product.id, 1)}
                              disabled={inCartQuantity >= product.stock}
                              className="flex h-full w-7 items-center justify-center text-[#101828] transition-colors hover:bg-[#f2f4f7] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-35 dark:text-[#f1f1f1] dark:hover:bg-[#302d28]"
                              aria-label={`Increase ${product.name} quantity`}
                              title={inCartQuantity >= product.stock ? 'Maximum available stock reached' : 'Increase quantity'}
                            >
                              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                            </button>
                          </div>
                        ) : (
                          <p className={cn('text-[10px] font-medium', outOfStock ? 'text-[#d92d20]' : 'text-[#667085] dark:text-[#8b8b8b]')}>{product.stock} {product.unit}</p>
                        )}
                      </div>
                    </div>

                    {/* Cart badge */}
                    {inCartQuantity && (
                      <div className="absolute right-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-[#f9b21d] px-1.5 text-xs font-extrabold text-[#241d00] shadow-sm">
                        {inCartQuantity}
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* Right: Cart + Payment */}
      <aside className={cn(ui.card, 'flex min-h-[520px] w-full flex-col overflow-hidden lg:max-h-full', !checkoutOpen && 'lg:h-fit lg:min-h-0 lg:self-start', checkoutOpen && !checkoutOnly && 'lg:h-fit lg:min-h-0 lg:self-start lg:max-h-none lg:overflow-visible', checkoutOnly && 'min-h-0 w-full max-w-none gap-6 overflow-visible border-0 bg-transparent shadow-none lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(480px,.85fr)] lg:items-start lg:max-h-none')}>
        {/* Cart header with quick actions */}
        <div className={cn('border-b border-[#eef0f3] bg-white p-4 dark:border-white/10 dark:bg-[#161616]', checkoutOnly && 'hidden', checkoutOpen && !checkoutOnly && 'hidden')}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#fff5d6] text-[#a47700] dark:bg-[#3a3016] dark:text-[#ffd166]">
                <ShoppingCart className="h-4 w-4" />
              </span>
              <div>
                <span className="block text-[17px] font-semibold tracking-tight text-[#7a5b00] dark:text-[#ffd166]">Basket</span>
                <span className="block text-[13px] font-medium text-[#475467] dark:text-[#b5bac5]">{cart.length ? `${cart.length} item${cart.length === 1 ? '' : 's'} · Ready to checkout` : 'Add items to start a sale'}</span>
              </div>
            </div>
            {checkoutOpen ? (
              <button onClick={() => setCheckoutOpen(false)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#344054] transition-colors hover:bg-[#f2f4f7] dark:text-[#c4c4c4] dark:hover:bg-white/10">
                ← Edit basket
              </button>
            ) : cart.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('Clear all items from cart?')) setCart([])
                }}
                className="rounded-md px-2 py-1 text-[11px] font-semibold text-[#98a2b3] transition-colors hover:bg-[#fef3f2] hover:text-[#b42318] dark:hover:bg-red-950/30"
              >
                Clear sale
              </button>
            )}
          </div>

          {!checkoutOpen && (
            <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-[#eef0f3] bg-[#fbfcfe] p-2 dark:border-white/10 dark:bg-[#141414]">
                <button onClick={() => setShowSalesHistory(true)} className="flex items-center justify-center gap-2 rounded-lg border border-[#e4e7ec] bg-white px-2.5 py-2.5 text-xs font-semibold text-[#344054] transition-colors hover:border-[#cbd5e1] hover:bg-[#f8fafc] dark:border-white/10 dark:bg-[#1a1a1a] dark:text-[#e4e7ec] dark:hover:bg-[#222222]">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#f2f4f7] text-[#475467] dark:bg-white/10 dark:text-[#d0d5dd]"><History className="h-3.5 w-3.5" /></span>
                  History
                </button>
                <button onClick={() => setShowReceiptReprint(true)} className="flex items-center justify-center gap-2 rounded-lg border border-[#e4e7ec] bg-white px-2.5 py-2.5 text-xs font-semibold text-[#344054] transition-colors hover:border-[#cbd5e1] hover:bg-[#f8fafc] dark:border-white/10 dark:bg-[#1a1a1a] dark:text-[#e4e7ec] dark:hover:bg-[#222222]">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#f2f4f7] text-[#475467] dark:bg-white/10 dark:text-[#d0d5dd]"><Printer className="h-3.5 w-3.5" /></span>
                  Reprint
                </button>
              {canHold && cart.length > 0 && (
                <>
                  <button onClick={() => void holdSale()} disabled={Boolean(heldSaleActionId) || !isOnline} title={!isOnline ? 'Reconnect to save held sales to the branch' : undefined} className="flex items-center justify-center gap-2 rounded-lg border border-[#e4e7ec] bg-white px-2.5 py-2.5 text-xs font-semibold text-[#344054] transition-colors hover:border-[#e6c66f] hover:bg-[#fffdf5] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-[#e4e7ec] dark:hover:bg-[#252116]"><span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#fff3d1] text-[#9a6700] dark:bg-[#3a3016] dark:text-[#ffd166]">{heldSaleActionId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PauseCircle className="h-3.5 w-3.5" />}</span>Hold sale</button>
                  <button onClick={() => { setShowHeldSales(true); void refreshHeldSales() }} className="flex items-center justify-center gap-2 rounded-lg border border-[#e4e7ec] bg-white px-2.5 py-2.5 text-xs font-semibold text-[#344054] transition-colors hover:border-[#a9d7ba] hover:bg-[#f7fdf8] dark:border-white/10 dark:bg-[#1a1a1a] dark:text-[#e4e7ec] dark:hover:bg-[#16261b]">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#e7f7ed] text-[#18794e] dark:bg-[#173c27] dark:text-[#9fe1b9]"><ArchiveRestore className="h-3.5 w-3.5" /></span>
                    Held sales{heldSales.length ? ` (${heldSales.length})` : ''}
                  </button>
                </>
              )}
              {canHold && cart.length === 0 && heldSales.length > 0 && (
                <button onClick={() => { setShowHeldSales(true); void refreshHeldSales() }} className="col-span-2 flex items-center justify-center gap-2 rounded-lg border border-[#e4e7ec] bg-white px-2.5 py-2.5 text-xs font-semibold text-[#344054] transition-colors hover:border-[#a9d7ba] hover:bg-[#f7fdf8] dark:border-white/10 dark:bg-[#1a1a1a] dark:text-[#e4e7ec] dark:hover:bg-[#16261b]">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#e7f7ed] text-[#18794e] dark:bg-[#173c27] dark:text-[#9fe1b9]"><ArchiveRestore className="h-3.5 w-3.5" /></span>
                  Resume held sale ({heldSales.length})
                </button>
              )}
            </div>
          )}
        </div>

        {/* Cart items */}
        <div className={cn('min-h-[180px] flex-1 overflow-y-auto', checkoutOpen && !checkoutOnly && 'hidden', checkoutOnly && cn(ui.card, 'flex min-h-0 flex-col self-start overflow-hidden lg:col-start-1 lg:row-start-1'))}>
          {checkoutOnly && (
            <div className="flex items-center justify-between border-b border-[#eef0f3] px-6 py-5 dark:border-white/10">
              <div>
                <h2 className="text-base font-semibold tracking-tight text-[#101828] dark:text-white">Order summary</h2>
                <p className="mt-0.5 text-xs text-[#667085] dark:text-[#8b8b8b]">{cart.length} item{cart.length === 1 ? '' : 's'} ready for payment</p>
              </div>
              <button type="button" onClick={() => router.push('/dashboard/pos')} className="rounded-lg px-3 py-2 text-sm font-semibold text-[#344054] transition-colors hover:bg-[#f2f4f7] dark:text-[#c4c4c4] dark:hover:bg-white/10">
                Edit basket
              </button>
            </div>
          )}
          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-4 py-12 text-center">
              <ShoppingCart className="mb-3 h-10 w-10 text-[#d0d5dd]" strokeWidth={1.5} />
              <p className="text-sm font-semibold text-[#101828] dark:text-white">Basket is empty</p>
              <p className="mt-1 max-w-[220px] text-xs leading-5 text-[#98a2b3]">Select {productTerms.pluralLower} from the catalogue to build this sale.</p>
            </div>
          ) : (
            <ul className="divide-y divide-[#eef0f3] dark:divide-white/10">
              {cart.map((item) => (
                <li key={item.productId} className="group grid min-h-[64px] grid-cols-[36px_minmax(0,1fr)_minmax(190px,auto)] items-center gap-3 px-4 py-2 transition-colors duration-75 hover:bg-[#fbfbfc] dark:bg-[#161616] dark:hover:bg-[#202020]">
                  {productsById.get(item.productId)?.imageUrl ? (
                    <Image src={productsById.get(item.productId)?.imageUrl ?? ''} alt="" width={36} height={36} quality={50} className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f2f4f7] text-[#667085] dark:bg-white/10 dark:text-[#c4c4c4]">
                      <Package className="h-4 w-4" />
                    </div>
                  )}
                  {/* Item info */}
                  <div className="min-w-0 flex-1">
                    <p className="mb-0.5 truncate text-[13px] font-semibold leading-snug text-[#101828] dark:text-white">{item.productName}</p>
                    <p className="text-xs font-medium text-[#667085] dark:text-[#aeb4c0]">{formatCurrency(item.unitPrice)} · {productsById.get(item.productId)?.unit || 'unit'}</p>
                  </div>

                  {/* Quantity, total & remove */}
                  <div className="flex items-center justify-end gap-2">
                    <div className="flex h-7 shrink-0 items-center overflow-hidden rounded-lg border border-[#e4e7ec] bg-white dark:border-white/15 dark:bg-[#1d1d1d]">
                      <button
                        onClick={() => updateQty(item.productId, -1)}
                        className="flex h-full w-7 items-center justify-center text-[#667085] transition-colors duration-75 hover:bg-[#f2f4f7] hover:text-[#101828] focus-visible:outline-none dark:text-[#c4c4c4] dark:hover:bg-white/10"
                        title="Decrease quantity"
                        aria-label={`Reduce ${item.productName} quantity`}
                      >
                        <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
                      </button>
                      <span className="flex h-full min-w-7 items-center justify-center border-x border-[#e4e7ec] px-1 text-center text-xs font-bold tabular-nums text-[#101828] dark:border-white/10 dark:text-white" aria-live="polite">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQty(item.productId, 1)}
                        disabled={item.quantity >= (productsById.get(item.productId)?.stock ?? item.quantity)}
                        className="flex h-full w-7 items-center justify-center text-[#667085] transition-colors duration-75 hover:bg-[#f2f4f7] hover:text-[#101828] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-35 dark:text-[#c4c4c4] dark:hover:bg-white/10"
                        title={item.quantity >= (productsById.get(item.productId)?.stock ?? item.quantity) ? 'Maximum available stock reached' : 'Increase quantity'}
                        aria-label={`Increase ${item.productName} quantity`}
                      >
                        <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                      </button>
                    </div>
                    <span className="min-w-[88px] text-right text-sm font-bold tabular-nums text-[#101828] dark:text-[#f4f4f5]">{formatCurrency(item.totalPrice)}</span>
                    <button
                      onClick={() => removeFromCart(item.productId)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#d92d20] transition-colors hover:bg-[#fef3f2] hover:text-[#b42318] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f9b21d]/50 dark:text-[#f97066] dark:hover:bg-red-950/30 dark:hover:text-[#ff8a80]"
                      title="Remove item"
                      aria-label={`Remove ${item.productName} from basket`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {checkoutOnly && cart.length > 0 && (
            <div className="border-t border-[#eef0f3] bg-[#fbfbfc] px-6 py-5 dark:border-white/10 dark:bg-[#111111]">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[#667085] dark:text-[#8b8b8b]">Items subtotal</span>
                <span className="text-xl font-bold tracking-tight tabular-nums text-[#101828] dark:text-white">{formatCurrency(subtotal)}</span>
              </div>
              <p className="mt-2 text-sm text-[#667085] dark:text-[#8b8b8b]">You can adjust quantities before completing payment.</p>
            </div>
          )}
        </div>

        {/* Payment panel */}
        {cart.length > 0 && !checkoutOpen && (
          <div className={cn('border-t border-[#eef0f3] bg-white p-3.5 dark:border-white/10 dark:bg-[#151515]', checkoutOnly && 'md:col-start-2 md:row-start-2 md:border-l')}>
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="text-sm font-medium text-[#667085] dark:text-[#8b8b8b]">Basket total</span>
              <span className="text-xl font-bold tracking-tight tabular-nums text-[#101828] dark:text-[#f8f8f8]">{formatCurrency(subtotal)}</span>
            </div>
            <button
              onClick={openCheckout}
              disabled={!hasActiveShift}
              title={!hasActiveShift ? 'Start a shift before taking payment' : undefined}
              style={hasActiveShift ? { backgroundColor: ui.primary, color: ui.primaryInk } : undefined}
              className={cn(
                'flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3.5 text-sm font-bold transition-opacity',
                hasActiveShift ? 'hover:opacity-90' : 'cursor-not-allowed bg-[#f2f4f7] text-[#98a2b3] dark:bg-white/5 dark:text-[#666]'
              )}
            >
              {hasActiveShift ? 'Continue to checkout' : 'Start shift to take payment'}
            </button>
            <p className="mt-2 text-center text-[10px] text-[#98a2b3]">Review customer details and order total next.</p>
          </div>
        )}

        {cart.length > 0 && checkoutOpen && (
          <div className={cn('min-h-0 flex-none space-y-4 overflow-y-auto border-t border-[#eef0f3] bg-[#fbfbfc] p-4 dark:border-white/10 dark:bg-[#111111] lg:max-h-[calc(100vh-16rem)]', !checkoutOnly && 'max-h-none !overflow-visible lg:max-h-none', checkoutOnly && cn(ui.card, 'self-start p-6 lg:col-start-2 lg:row-start-1 lg:max-h-none'))}>
            {checkoutOnly && (
              <div className="border-b border-[#eef0f3] pb-5 dark:border-white/10">
                <button onClick={() => router.push('/dashboard/pos')} className="text-sm font-semibold text-[#344054] transition-colors hover:text-[#101828] dark:text-[#c4c4c4] dark:hover:text-white">
                  ← Back to POS
                </button>
                <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: ui.primaryHover }}>Payment</p>
                <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-[#101828] dark:text-white">Complete this sale</h2>
                <p className="mt-2 text-sm leading-6 text-[#667085] dark:text-[#8b8b8b]">Choose a payment method and complete the sale.</p>
              </div>
            )}
            {/* Customer */}
            {checkoutStep === 'customer' && !checkoutOnly && <button type="button" onClick={() => setCheckoutOpen(false)} className="inline-flex items-center gap-1 self-start rounded-lg px-1 py-1 text-xs font-semibold text-[#667085] transition-colors hover:text-[#101828] dark:text-[#a3a3a3] dark:hover:text-white">← Back to basket</button>}
            {checkoutStep === 'customer' && <div className="rounded-xl border border-[#e4e9ef] bg-white p-4 dark:border-white/10 dark:bg-[#171717]">
              <div className="mb-2 flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#667085] dark:text-[#b5bac5]"><span className="flex h-6 w-6 items-center justify-center rounded-md border border-[#f1d56f] bg-[#fff7d6] text-[#9a6700] dark:border-[#5e461c] dark:bg-[#3a3016] dark:text-[#ffd166]"><ContactRound className="h-3.5 w-3.5" strokeWidth={2.25} /></span> Customer</label>
                <button onClick={() => setShowNewCustomer(!showNewCustomer)} disabled={mpesaLocksBasket || !isOnline} title={!isOnline ? 'Reconnect to create a customer' : undefined} className="rounded-md px-1.5 py-1 text-[11px] font-bold text-[#a47700] transition-colors hover:bg-[#fff8d6] disabled:cursor-not-allowed disabled:opacity-50 dark:text-[#ffd166] dark:hover:bg-[#3a3016]">
                  {showNewCustomer ? 'Cancel' : '+ New customer'}
                </button>
              </div>
              {showNewCustomer ? (
                <div className="space-y-2 rounded-xl bg-[#fffaf0] p-2.5 dark:bg-[rgba(255,214,10,.06)]">
                  <input type="text" placeholder="Full name" value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} className={cn(inputCls, 'h-10 text-sm')} disabled={creatingCustomer} />
                  <input type="tel" placeholder="Phone (optional)" value={newCustomerPhone} onChange={(e) => setNewCustomerPhone(e.target.value)} className={cn(inputCls, 'h-10 text-sm')} disabled={creatingCustomer} />
                  <input type="email" placeholder="Email (optional)" value={newCustomerEmail} onChange={(e) => setNewCustomerEmail(e.target.value)} className={cn(inputCls, 'h-10 text-sm')} disabled={creatingCustomer} />
                  <button
                    onClick={handleCreateCustomer}
                    disabled={creatingCustomer || !newCustomerName.trim()}
                    style={{ backgroundColor: ui.primary, color: ui.primaryInk }}
                    className="w-full rounded-lg px-2 py-2 text-xs font-bold transition-opacity hover:opacity-90 disabled:opacity-40"
                  >
                    {creatingCustomer ? 'Creating…' : 'Save customer'}
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <button type="button" disabled={mpesaLocksBasket} onClick={() => setCustomerMenuOpen((open) => !open)} aria-haspopup="listbox" aria-expanded={customerMenuOpen} className={cn(inputCls, 'flex h-11 items-center justify-between text-left text-[13px] font-semibold focus:border-[#f2b705] focus:ring-[#f2b705]/10 disabled:cursor-not-allowed dark:bg-[#161616]')}>
                    <span className="truncate">{selectedCustomer ? `${availableCustomers.find((customer) => customer.id === selectedCustomer)?.name ?? 'Customer'}${availableCustomers.find((customer) => customer.id === selectedCustomer)?.phone ? ` (${availableCustomers.find((customer) => customer.id === selectedCustomer)?.phone})` : ''}` : 'Walk-in customer'}</span>
                    <ChevronDown className={cn('h-4 w-4 shrink-0 text-[#667085] transition-transform dark:text-[#aeb4c0]', customerMenuOpen && 'rotate-180')} />
                  </button>
                  {customerMenuOpen && !mpesaLocksBasket && (
                    <div role="listbox" className="absolute inset-x-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-lg border border-[#e4e7ec] bg-white p-1 shadow-[0_10px_24px_rgba(16,24,40,0.14)] dark:border-white/10 dark:bg-[#1b1b1b]">
                      <button type="button" role="option" aria-selected={!selectedCustomer} onClick={() => { setSelectedCustomer(''); setCustomerMenuOpen(false) }} className={cn('flex w-full items-center rounded-md px-3 py-2 text-left text-[13px] transition-colors hover:bg-[#fff8df] dark:hover:bg-[#302812]', !selectedCustomer ? 'bg-[#fff8df] font-semibold text-[#7a5b00] dark:bg-[#302812] dark:text-[#ffd166]' : 'text-[#344054] dark:text-[#e4e7ec]')}>Walk-in customer</button>
                      {availableCustomers.map((customer) => {
                        const label = `${customer.name}${customer.phone ? ` (${customer.phone})` : ''}`
                        return <button key={customer.id} type="button" role="option" aria-selected={selectedCustomer === customer.id} onClick={() => { setSelectedCustomer(customer.id); setCustomerMenuOpen(false) }} className={cn('flex w-full items-center rounded-md px-3 py-2 text-left text-[13px] transition-colors hover:bg-[#fff8df] dark:hover:bg-[#302812]', selectedCustomer === customer.id ? 'bg-[#fff8df] font-semibold text-[#7a5b00] dark:bg-[#302812] dark:text-[#ffd166]' : 'text-[#344054] dark:text-[#e4e7ec]')}>{label}</button>
                      })}
                    </div>
                  )}
                </div>
              )}

            </div>}

            {/* Discount */}
            {checkoutStep === 'customer' && canDiscount && <div className="rounded-xl border border-[#e4e9ef] bg-white p-4 dark:border-white/10 dark:bg-[#171717]">
              <label className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.1em] text-[#667085] dark:text-[#b5bac5]"><span className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#f1d56f] bg-[#fff7d6] text-[#9a6700] dark:border-[#5e461c] dark:bg-[#3a3016] dark:text-[#ffd166]"><BadgePercent className="h-4 w-4" strokeWidth={2.25} /></span> Discount</label>
              <div className="flex gap-2">
                <div className="relative w-32 shrink-0">
                  <button type="button" disabled={mpesaLocksBasket} onClick={() => setDiscountMenuOpen((open) => !open)} aria-haspopup="listbox" aria-expanded={discountMenuOpen} className={cn(inputCls, 'flex h-11 w-full items-center justify-between text-left text-[13px] font-semibold focus:border-[#f2b705] focus:ring-[#f2b705]/10 disabled:cursor-not-allowed dark:bg-[#161616]')}>
                    <span>{discountType === 'fixed' ? 'KES amount' : 'Percentage'}</span>
                    <ChevronDown className={cn('h-4 w-4 text-[#667085] transition-transform dark:text-[#aeb4c0]', discountMenuOpen && 'rotate-180')} />
                  </button>
                  {discountMenuOpen && !mpesaLocksBasket && (
                    <div role="listbox" className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-[#e4e7ec] bg-white p-1 shadow-[0_10px_24px_rgba(16,24,40,0.14)] dark:border-white/10 dark:bg-[#1b1b1b]">
                      {(['fixed', 'percentage'] as const).map((type) => (
                        <button key={type} type="button" role="option" aria-selected={discountType === type} onClick={() => { setDiscountType(type); setDiscount(0); setDiscountMenuOpen(false) }} className={cn('flex w-full items-center rounded-md px-3 py-2 text-left text-[13px] transition-colors hover:bg-[#fff8df] dark:hover:bg-[#302812]', discountType === type ? 'bg-[#fff8df] font-semibold text-[#7a5b00] dark:bg-[#302812] dark:text-[#ffd166]' : 'text-[#344054] dark:text-[#e4e7ec]')}>{type === 'fixed' ? 'KES amount' : 'Percentage'}</button>
                      ))}
                    </div>
                  )}
                </div>
                <input type="number" min="0" max={discountType === 'percentage' ? 100 : subtotal + taxAmount} placeholder={discountType === 'percentage' ? '0–100' : 'Enter amount'} value={discount || ''} disabled={mpesaLocksBasket} onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)} className={cn(inputCls, 'h-11 flex-1 border-[#e4e7ec] bg-[#fbfbfc] text-[13px] focus:border-[#f2b705] focus:ring-[#f2b705]/10 dark:bg-[#161616]')} />
              </div>
            </div>}

            {/* Order summary */}
            {checkoutStep === 'customer' && <div className="overflow-hidden rounded-xl border border-[#e4e7ec] bg-white text-[#101828] dark:border-white/10 dark:bg-[#171717] dark:text-white">
              <div className="flex items-center justify-between border-b border-[#edf0f4] px-3.5 py-2.5 dark:border-white/10"><span className="text-[10px] font-extrabold uppercase tracking-[0.13em] text-[#a47700] dark:text-[#ffd60a]">Order summary</span><span className="rounded-full bg-[#fff3be] px-2 py-0.5 text-[10px] font-extrabold text-[#5f4600] dark:bg-[#f2b705] dark:text-[#241d00]">{cart.length} item{cart.length === 1 ? '' : 's'}</span></div>
              <div className="space-y-1.5 px-4 pb-4 pt-3.5 text-[13px]">
              <div className="flex justify-between text-[#667085] dark:text-[#b9c4d6]">
                <span>Subtotal</span>
                <span className="tabular-nums font-semibold text-[#101828] dark:text-white">{formatCurrency(subtotal)}</span>
              </div>
              {settings.taxEnabled && settings.showTaxOnReceipt && (
                <div className="flex justify-between text-[#667085] dark:text-[#b9c4d6]">
                  <span>{settings.taxName || 'Tax'} ({settings.taxRate.toFixed(1)}%)</span>
                  <span className="tabular-nums font-semibold text-[#101828] dark:text-white">{formatCurrency(taxAmount)}</span>
                </div>
              )}
              {discountAmount > 0 && (
                <div className="flex justify-between text-[#168337] dark:text-[#73e29a]">
                  <span>Discount {discountType === 'percentage' ? `(${discount.toFixed(1)}%)` : ''}</span>
                  <span className="tabular-nums font-medium">−{formatCurrency(discountAmount)}</span>
                </div>
              )}
              {roundingAmount !== 0 && (
                <div className="flex justify-between text-[#667085] dark:text-[#b9c4d6]">
                  <span>M-Pesa rounding</span>
                  <span className="tabular-nums font-semibold text-[#101828] dark:text-white">{roundingAmount > 0 ? '+' : '−'}{formatCurrency(Math.abs(roundingAmount))}</span>
                </div>
              )}
              <div className="mt-3 flex items-baseline justify-between border-t border-[#edf0f4] pt-3 dark:border-white/15">
                <span className="text-sm font-bold text-[#101828] dark:text-white">Total due</span>
                <span className="text-xl font-extrabold tabular-nums text-[#101828] dark:text-white">{formatCurrency(total)}</span>
              </div>
              </div>
            </div>}

            {checkoutStep === 'customer' && (
              <div className="rounded-xl border border-[#e4e7ec] bg-white p-3.5 dark:border-white/10 dark:bg-[#171717]">
                <button
                  type="button"
                  onClick={() => setCheckoutStep('payment')}
                  style={{ backgroundColor: ui.primary, color: ui.primaryInk }}
                  className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3.5 text-base font-bold transition-opacity hover:opacity-90"
                >
                  Continue to payment <span aria-hidden="true">→</span>
                </button>
                <p className="mt-2 text-center text-xs text-[#667085] dark:text-[#aeb4c0]">Review the order, then choose how the customer will pay.</p>
              </div>
            )}

            {checkoutStep === 'payment' && <>
            <button
              type="button"
              onClick={() => setCheckoutStep('customer')}
              className="inline-flex items-center gap-1 rounded-lg px-1 py-1 text-xs font-semibold text-[#667085] transition-colors hover:text-[#101828] dark:text-[#a3a3a3] dark:hover:text-white"
            >
              ← Back to customer and order details
            </button>
            {(prescriptionRequired || containsRestrictedMedicine) && <div className="rounded-xl border border-amber-300 bg-amber-50/60 p-3.5 dark:border-amber-900 dark:bg-amber-950/20">
              <div className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" /><div><p className="text-xs font-bold text-amber-950 dark:text-amber-100">Pharmacy sale record</p><p className="mt-0.5 text-[11px] text-amber-800 dark:text-amber-300">Record the supplied reference only. Pesaby does not provide clinical advice.</p></div></div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2"><div><label className={ui.label}>Prescription reference {prescriptionRequired && <span className="text-red-600">*</span>}</label><input value={prescriptionReference} onChange={(event) => setPrescriptionReference(event.target.value)} maxLength={120} placeholder="Prescription or dispensing reference" className={cn(inputCls, 'h-10')} /></div><div><label className={ui.label}>Prescriber/reference details</label><input value={prescriberReference} onChange={(event) => setPrescriberReference(event.target.value)} maxLength={160} placeholder="Prescriber name or registration reference" className={cn(inputCls, 'h-10')} /></div><div><label className={ui.label}>Patient/reference</label><input value={patientReference} onChange={(event) => setPatientReference(event.target.value)} maxLength={160} placeholder="Patient or file reference" className={cn(inputCls, 'h-10')} /></div><div className="grid grid-cols-2 gap-2"><div><label className={ui.label}>Issued</label><input type="date" value={prescriptionIssuedAt} onChange={(event) => setPrescriptionIssuedAt(event.target.value)} className={cn(inputCls, 'h-10')} /></div><div><label className={ui.label}>Expires</label><input type="date" value={prescriptionExpiresAt} min={new Date().toISOString().slice(0, 10)} onChange={(event) => setPrescriptionExpiresAt(event.target.value)} className={cn(inputCls, 'h-10')} /></div></div></div>
              <div className="mt-2"><label className={ui.label}>Workflow note</label><input value={pharmacyNotes} onChange={(event) => setPharmacyNotes(event.target.value)} maxLength={500} placeholder="Optional audit note" className={cn(inputCls, 'h-10')} /></div>
              {containsRestrictedMedicine && <p className={cn('mt-2 text-[11px] font-semibold', canApproveRestricted ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300')}>{canApproveRestricted ? 'Restricted-item approval will be recorded under the current authorized user.' : 'This user cannot approve restricted-item sales. Ask an authorized pharmacist or manager.'}</p>}
            </div>}
            {/* Payment method */}
            <div className="rounded-2xl border border-[#e4e9ef] bg-white p-3.5 shadow-[0_3px_12px_rgba(16,24,40,0.03)] dark:border-white/10 dark:bg-[#171717]">
              <div className="mb-2 flex items-center justify-between">
                <label className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#667085] dark:text-[#9d9d9d]">Payment method</label>
                <span className="rounded-full bg-[#fff3be] px-2 py-0.5 text-[10px] font-bold text-[#7a5a00] dark:bg-[rgba(255,214,10,.12)] dark:text-[#ffd60a]">F3–F5 to switch</span>
              </div>
              <div className="grid grid-cols-3 gap-2" role="group" aria-label="Payment method">
                {([
                  { key: 'cash', label: 'Cash', shortcut: 'F3' },
                  { key: 'mpesa', label: 'M-Pesa', shortcut: 'F4' },
                  { key: 'card', label: 'Card', shortcut: 'F5' },
                ] as const)
                  .filter(({ key }) => settings.paymentMethods.includes(key))
                  .map(({ key, label, shortcut }) => (
                    <button
                      key={key}
                      onClick={() => setPaymentMethod(key)}
                      disabled={(!isOnline && key !== 'cash') || (mpesaLocksBasket && paymentMethod !== key)}
                      aria-pressed={paymentMethod === key}
                      aria-label={`${label} payment (${shortcut})`}
                      title={!isOnline && key !== 'cash' ? `${label} requires an internet connection` : `${label} (${shortcut})`}
                      style={key === 'mpesa' ? { backgroundColor: '#11ad2d' } : undefined}
                      className={cn(
                        'group relative flex h-[88px] items-center justify-center rounded-xl border-2 bg-white px-3 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#1c1c1c]',
                        (key === 'cash' || key === 'mpesa' || key === 'card') && '!border-transparent !bg-transparent px-0 hover:!border-transparent hover:!bg-transparent dark:!bg-transparent',
                        paymentMethod === key
                          ? key === 'mpesa'
                            ? '!border-transparent !bg-transparent text-white'
                            : '!border-transparent !bg-transparent text-[#5f4600]'
                          : key === 'mpesa'
                            ? 'text-white'
                            : key === 'card'
                              ? 'text-white'
                              : 'text-[#5f4600]'
                      )}
                    >
                      <PaymentBrand method={key} />
                      {paymentMethod === key && <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[#101828] shadow-sm"><CheckCircle2 className="h-3.5 w-3.5" /></span>}
                      <span className="sr-only">{label}</span>
                    </button>
                  ))}
              </div>
            </div>

            {paymentMethod === 'cash' && (
              <div className="overflow-hidden rounded-xl border border-[#f0d66d] bg-white shadow-sm dark:border-[rgba(255,214,10,.28)] dark:bg-[#171717]">
                <div className="flex items-center justify-between gap-3 border-b border-[#f0d66d] bg-[#fff3be] px-3.5 py-3 dark:border-[rgba(255,214,10,.2)] dark:bg-[rgba(255,214,10,.12)]">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#a47700] shadow-sm dark:bg-[#1b1b1b]"><Banknote className="h-4 w-4" /></span>
                      <div>
                        <p className="text-sm font-bold tracking-tight text-[#241d00] dark:text-[#ffd60a]">Cash payment</p>
                        <p className="mt-0.5 text-[11px] font-medium text-[#6f5600] dark:text-[#d9c05a]">Enter the tendered amount</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-[#6f5600] dark:text-[#d9c05a]">Total due</span>
                      <strong className="mt-0.5 block text-lg font-extrabold tabular-nums text-[#241d00] dark:text-white">{formatCurrency(total)}</strong>
                    </div>
                  </div>

                <div className="space-y-3.5 p-3.5">
                  <div>
                    <div className="mb-1.5 flex items-center justify-between"><label className="text-xs font-bold text-[#344054] dark:text-white">Cash received</label><span className="text-[10px] font-medium text-[#667085] dark:text-[#a3a3a3]">Amount tendered</span></div>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs font-bold text-[#a47700]">KSh</span>
                      <input
                        type="number"
                        min={total}
                        step="0.01"
                        placeholder={formatCurrency(total).replace('KES', '').trim()}
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(e.target.value)}
                        className={cn(inputCls, 'h-11 border-[#d0d5dd] bg-white pl-12 text-base font-bold tabular-nums focus:border-[#e0a800] focus:ring-[#f2b705]/15 dark:bg-[#111113]')}
                      />
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#667085] dark:text-[#a3a3a3]">Quick tender</p>
                    <div className="flex flex-wrap gap-1.5">
                      {[total, ...[1000, 2000, 5000, 10000, 20000, 50000].filter((amount) => amount >= total)].filter((amount, index, values) => values.indexOf(amount) === index).slice(0, 5).map((amount) => (
                        <button key={amount} type="button" onClick={() => setAmountPaid(String(amount))} className={cn('rounded-lg border px-2.5 py-2 text-xs font-bold transition-colors', amount === total ? 'border-[#e0a800] bg-[#fff3be] text-[#5f4600] hover:bg-[#ffec91] dark:bg-[rgba(255,214,10,.15)] dark:text-[#ffd60a]' : 'border-[#e4e7ec] bg-white text-[#475467] hover:border-[#f2b705] hover:bg-[#fffdf2] dark:border-white/10 dark:bg-transparent dark:text-[#d0d5dd]')}>
                          {amount === total ? `Exact · ${formatCurrency(total)}` : formatCurrency(amount)}
                        </button>
                      ))}
                    </div>
                  </div>
                  {parseFloat(amountPaid || '0') >= total ? (
                    <div className="flex items-center justify-between rounded-lg border border-[#9addb0] bg-[#effcf2] px-3 py-2.5 text-[#145c2a] dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
                      <span className="flex items-center gap-1.5 text-xs font-bold"><CheckCircle2 className="h-4 w-4" /> Change due</span>
                      <strong className="text-base tabular-nums">{formatCurrency(change)}</strong>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 rounded-lg bg-[#f9fafb] px-3 py-2.5 text-[11px] font-medium text-[#667085] dark:bg-white/5 dark:text-[#a3a3a3]"><Zap className="h-3.5 w-3.5 text-[#a47700]" /> Choose the exact tender or enter the amount received.</div>
                  )}
                </div>
              </div>
            )}

            {paymentMethod === 'mpesa' && (
              <div className="overflow-hidden rounded-xl border border-[#b9e6c2] border-t-2 border-t-[#11ad2d] bg-white shadow-sm dark:border-emerald-900 dark:border-t-[#11ad2d] dark:bg-[#171717]">
                <div className="flex items-center justify-between gap-4 border-b border-[#e5efe7] px-3.5 py-3 dark:border-emerald-900/60">
                  <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#d6ecda] bg-[#f5fcf6] dark:border-emerald-900 dark:bg-emerald-950/30">
                        <Image src="/payment-logos/mpesa.svg" alt="M-Pesa" width={52} height={22} className="h-4 w-auto" />
                      </span>
                      <div>
                        <p className="text-sm font-bold tracking-tight text-[#183625] dark:text-emerald-100">M-Pesa payment</p>
                        <p className="mt-0.5 text-[11px] text-[#66806c] dark:text-emerald-300">Confirmed automatically by Safaricom</p>
                      </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-[#69816f] dark:text-emerald-400">Amount due</span>
                    <strong className="mt-0.5 block text-base font-extrabold tabular-nums text-[#183625] dark:text-white">{formatCurrency(total)}</strong>
                  </div>
                </div>

                <div className="space-y-3 p-3.5">
                  <div>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#66806c] dark:text-emerald-300">Payment option</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => { if (!mpesaLocksBasket) setMpesaFlow('stk') }} disabled={mpesaLocksBasket && mpesaFlow !== 'stk'} className={cn('flex min-h-[62px] items-center gap-2.5 rounded-lg border px-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50', mpesaFlow === 'stk' ? 'border-[#11ad2d] bg-[#effcf1] dark:bg-emerald-950/30' : 'border-[#e4ece6] bg-white hover:border-[#85d993] hover:bg-[#f8fdf8] dark:border-white/10 dark:bg-transparent')}><span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-md', mpesaFlow === 'stk' ? 'bg-[#11ad2d] text-white' : 'bg-[#eff7f0] text-[#168337] dark:bg-emerald-950/40')}><Smartphone className="h-3.5 w-3.5" /></span><span><span className="block text-xs font-bold text-[#183625] dark:text-emerald-100">Send to phone</span><span className="mt-0.5 block text-[10px] text-[#6b7c71]">STK prompt</span></span></button>
                      <button type="button" onClick={() => { if (!mpesaLocksBasket) setMpesaFlow('paybill') }} disabled={mpesaLocksBasket && mpesaFlow !== 'paybill'} className={cn('flex min-h-[62px] items-center gap-2.5 rounded-lg border px-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50', mpesaFlow === 'paybill' ? 'border-[#11ad2d] bg-[#effcf1] dark:bg-emerald-950/30' : 'border-[#e4ece6] bg-white hover:border-[#85d993] hover:bg-[#f8fdf8] dark:border-white/10 dark:bg-transparent')}><span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-md', mpesaFlow === 'paybill' ? 'bg-[#11ad2d] text-white' : 'bg-[#eff7f0] text-[#168337] dark:bg-emerald-950/40')}><Building2 className="h-3.5 w-3.5" /></span><span><span className="block text-xs font-bold text-[#183625] dark:text-emerald-100">Till / PayBill</span><span className="mt-0.5 block text-[10px] text-[#6b7c71]">Pay manually</span></span></button>
                    </div>
                  </div>
                {mpesaFlow === 'stk' ? (
                  <div className="rounded-lg border border-[#e5efe7] bg-[#fafdfb] p-3 dark:border-emerald-900/60 dark:bg-emerald-950/20">
                    <label className="mb-1.5 block text-xs font-bold text-[#183625] dark:text-emerald-200">Customer M-Pesa number</label>
                    <div className="flex gap-2">
                      <input
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="e.g. 0712 345 678"
                        value={mpesaPhone}
                        onChange={(event) => setMpesaPhone(event.target.value)}
                        disabled={mpesaStatus === 'initiating' || mpesaStatus === 'pending' || mpesaStatus === 'success'}
                        className={cn(inputCls, 'h-11 flex-1 border-[#c9e9ce] bg-white focus:border-[#11ad2d] focus:ring-[#11ad2d]/10 dark:bg-[#171717]')}
                      />
                      <button
                        type="button"
                        onClick={handleMpesaPrompt}
                        disabled={!isOnline || mpesaStatus === 'initiating' || mpesaStatus === 'pending' || mpesaStatus === 'success' || (requiresAgeVerification && !ageVerified)}
                        className="inline-flex min-w-[138px] items-center justify-center gap-2 rounded-lg bg-[#11ad2d] px-3 text-xs font-bold text-white transition-colors hover:bg-[#079c35] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {(mpesaStatus === 'initiating' || mpesaStatus === 'pending') && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        {mpesaStatus === 'pending' ? 'Waiting…' : mpesaStatus === 'initiating' ? 'Sending…' : mpesaStatus === 'failed' || mpesaStatus === 'timeout' ? 'Try again' : mpesaStatus === 'success' ? 'Paid' : `Charge ${formatCurrency(total)} via M-Pesa`}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 rounded-lg border border-[#e5efe7] bg-[#fafdfb] p-3 dark:border-emerald-900/60 dark:bg-emerald-950/20">
                    {!mpesaAccountReference || mpesaStatus === 'failed' || mpesaStatus === 'timeout' ? (
                      <button
                        type="button"
                        onClick={handlePaybillPayment}
                        disabled={!isOnline || mpesaStatus === 'initiating' || mpesaStatus === 'pending' || mpesaStatus === 'success' || (requiresAgeVerification && !ageVerified)}
                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#11ad2d] px-3 text-xs font-bold text-white transition-colors hover:bg-[#079c35] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {mpesaStatus === 'initiating' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        {mpesaStatus === 'initiating' ? 'Preparing payment details…' : 'Generate payment details'}
                      </button>
                    ) : (
                      <div className={cn('grid gap-2', mpesaAccountType === 'paybill' ? 'grid-cols-2' : 'grid-cols-1')}>
                        <div className="rounded-lg border border-[#c9e9ce] bg-white p-3 dark:border-emerald-900 dark:bg-[#171717]">
                          <span className="block text-[9px] font-bold uppercase tracking-wider text-[#69816f]">{mpesaAccountType === 'till' ? 'Till number' : 'PayBill number'}</span>
                          <strong className="mt-1 block text-lg tabular-nums text-[#183625] dark:text-white">{mpesaShortcode}</strong>
                        </div>
                        {mpesaAccountType === 'paybill' && <div className="rounded-lg border border-[#c9e9ce] bg-white p-3 dark:border-emerald-900 dark:bg-[#171717]">
                          <span className="block text-[9px] font-bold uppercase tracking-wider text-[#69816f]">Account reference</span>
                          <strong className="mt-1 block text-lg tracking-wide text-[#183625] dark:text-white">{mpesaAccountReference}</strong>
                        </div>}
                        <p className="col-span-2 flex items-center gap-1.5 text-[11px] leading-4 text-[#43784f] dark:text-emerald-400">
                          <Zap className="h-3.5 w-3.5 shrink-0 text-[#11ad2d]" /> Pay exactly <strong>{formatCurrency(total)}</strong>; this screen confirms automatically.
                        </p>
                      </div>
                    )}
                  </div>
                )}
                {requiresAgeVerification && !ageVerified && (
                  <p className="flex items-center gap-1.5 text-[11px] font-medium text-[#b54708]">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Complete the age check before sending the payment prompt
                  </p>
                )}
                {!isOnline && (
                  <p className="flex items-center gap-1.5 rounded-lg border border-[#fedf89] bg-[#fffaeb] px-3 py-2.5 text-[11px] font-medium text-[#93370d]">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> M-Pesa confirmation unavailable. Reconnect, retry, or choose another payment method.
                  </p>
                )}
                {mpesaStatus !== 'idle' && (
                  <div
                    className={cn(
                      'flex items-start gap-2 rounded-lg border px-3 py-2.5 text-[11px] font-medium',
                      mpesaStatus === 'success' ? 'border-[#bbf0d0] bg-[#effcf1] text-[#0c4a26] dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300' :
                      mpesaStatus === 'failed' || mpesaStatus === 'timeout' ? 'border-[#fecdca] bg-[#fef3f2] text-[#b42318] dark:border-red-900 dark:bg-red-950/30 dark:text-red-300' :
                      'border-[#bdebc6] bg-[#f2fcf4] text-[#246e36] dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300'
                    )}
                    role="status"
                    aria-live="polite"
                  >
                    {mpesaStatus === 'success' ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : mpesaStatus === 'failed' || mpesaStatus === 'timeout' ? <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin" />}
                    <span>{mpesaStatus === 'success' ? `Payment received · ${mpesaRef}` : mpesaMessage}</span>
                  </div>
                )}
              </div>
              </div>
            )}

            {paymentMethod === 'card' && (
              <div className={cn(ui.card, 'space-y-3 p-3.5')}>
                <div className="flex gap-2 rounded-lg bg-[#fffaeb] p-2.5 ring-1 ring-inset ring-[#fedf89]">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#b54708]" />
                  <p className="text-xs font-medium text-[#93370d]">Confirm approval on the card terminal before completing this sale.</p>
                </div>
                <div>
                  <label className={ui.label}>Approval / terminal reference <span className="text-[#d92d20]">*</span></label>
                  <input
                    type="text"
                    placeholder="Enter terminal approval reference"
                    value={mpesaRef}
                    onChange={(event) => setMpesaRef(event.target.value.toUpperCase())}
                    className={cn(inputCls, 'h-10')}
                  />
                </div>
              </div>
            )}

            {requiresAgeVerification && (
              <button
                type="button"
                onClick={() => setShowAgeVerification(true)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-xs font-medium transition-colors',
                  ageVerified
                    ? 'border-[#bbf0d0] bg-[#effbf3] text-[#0c4a26] dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300'
                    : 'border-[#fedf89] bg-[#fffaeb] text-[#93370d] hover:bg-[#fef3d6] dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300'
                )}
              >
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span>{ageVerified ? 'Age check recorded for this sale' : 'Age check required before charging'}</span>
              </button>
            )}

            {paymentMethod !== 'mpesa' && <button
              onClick={handleCheckout}
              disabled={processing || cart.length === 0 || !hasActiveShift}
              className={cn(
                'flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold shadow-[0_4px_12px_rgba(16,24,40,.16)] transition-colors',
                processing || cart.length === 0 || !hasActiveShift
                  ? 'cursor-not-allowed !bg-[#e4e7ec] !text-[#667085] shadow-none dark:!bg-white/10 dark:!text-[#8b8b8b]'
                  : 'hover:opacity-90'
              )}
              style={processing || cart.length === 0 || !hasActiveShift ? undefined : { backgroundColor: ui.primary, color: ui.primaryInk }}
            >
              {processing ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  {!hasActiveShift ? 'Start shift to take payment' : `Complete sale · ${formatCurrency(total)}`}
                </>
              )}
            </button>}
            </>}
          </div>
        )}
      </aside>

      {standalone && !checkoutOnly && (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e2e5e9] bg-white/95 px-2 py-1.5 shadow-[0_-5px_18px_rgba(16,24,40,.06)] backdrop-blur-md dark:border-white/10 dark:bg-[#111]/95" aria-label="POS register actions">
          <div className="pos-action-scroll mx-auto flex max-w-4xl items-center justify-center gap-1.5 overflow-x-auto">
            <button type="button" onClick={() => void holdSale()} disabled={!canHold || cart.length === 0 || Boolean(heldSaleActionId)} className="inline-flex h-9 min-w-[82px] shrink-0 items-center justify-center gap-1.5 rounded-md bg-[#e95513] px-3 text-xs font-bold text-white transition hover:bg-[#cf4510] disabled:cursor-not-allowed disabled:opacity-40"><PauseCircle className="h-3.5 w-3.5" />Hold</button>
            <button type="button" onClick={voidCurrentSale} disabled={cart.length === 0} className="inline-flex h-9 min-w-[82px] shrink-0 items-center justify-center gap-1.5 rounded-md bg-[#2563eb] px-3 text-xs font-bold text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-40"><Trash2 className="h-3.5 w-3.5" />Void</button>
            <button type="button" onClick={openCheckout} disabled={cart.length === 0 || !hasActiveShift} className="inline-flex h-9 min-w-[94px] shrink-0 items-center justify-center gap-1.5 rounded-md bg-[#08a9c7] px-3 text-xs font-bold text-white transition hover:bg-[#078ca6] disabled:cursor-not-allowed disabled:opacity-40"><WalletCards className="h-3.5 w-3.5" />Payment</button>
            <button type="button" onClick={openHeldOrders} className="inline-flex h-9 min-w-[108px] shrink-0 items-center justify-center gap-1.5 rounded-md bg-[#082f49] px-3 text-xs font-bold text-white transition hover:bg-[#0c4a6e]"><ArchiveRestore className="h-3.5 w-3.5" />View Orders</button>
            <button type="button" onClick={resetRegister} className="inline-flex h-9 min-w-[82px] shrink-0 items-center justify-center gap-1.5 rounded-md bg-[#4938ca] px-3 text-xs font-bold text-white transition hover:bg-[#3929ad]"><RefreshCw className="h-3.5 w-3.5" />Reset</button>
            <button type="button" onClick={() => setShowSalesHistory(true)} className="inline-flex h-9 min-w-[106px] shrink-0 items-center justify-center gap-1.5 rounded-md bg-[#dc2626] px-3 text-xs font-bold text-white transition hover:bg-[#b91c1c]"><History className="h-3.5 w-3.5" />Transaction</button>
          </div>
        </nav>
      )}

      {showAgeVerification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c111d]/50 p-4" role="dialog" aria-modal="true" aria-labelledby="age-check-title">
          <div className="w-full max-w-md rounded-2xl border border-[#e4e7ec] bg-white p-6 shadow-[0_20px_60px_rgba(16,24,40,.28)] dark:border-white/10 dark:bg-[#1c1c1e]">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#fffaeb] text-[#93370d] dark:bg-amber-950/30 dark:text-amber-300">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <h2 id="age-check-title" className="mt-4 text-lg font-bold text-[#101828] dark:text-white">Verify customer age</h2>
            <p className="mt-2 text-sm leading-6 text-[#667085] dark:text-[#8b8b8b]">Check a valid photo ID where required and confirm the customer meets the legal drinking age before completing this sale.</p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setShowAgeVerification(false)} className="min-h-10 rounded-lg border border-[#d0d5dd] px-4 text-sm font-semibold text-[#344054] transition-colors hover:bg-[#f9fafb] dark:border-white/10 dark:text-[#c4c4c4] dark:hover:bg-white/5">
                Cancel
              </button>
              <button
                ref={ageVerificationConfirmRef}
                type="button"
                onClick={confirmAgeVerification}
                style={{ backgroundColor: ui.primary, color: ui.primaryInk }}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition-opacity hover:opacity-90"
              >
                <ShieldCheck className="h-4 w-4" />Age verified — continue
              </button>
            </div>
          </div>
        </div>
      )}

      {showHeldSales && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c111d]/50 p-4" role="dialog" aria-modal="true" aria-labelledby="held-sales-title">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[#e4e7ec] bg-white shadow-[0_20px_60px_rgba(16,24,40,.28)]">
            <div className="flex items-center justify-between border-b border-[#e4e7ec] px-5 py-4">
              <div>
                <h2 id="held-sales-title" className="text-sm font-bold text-[#101828]">Held sales</h2>
                <p className="mt-0.5 text-xs text-[#98a2b3]">Shared securely with authorized registers at this branch</p>
              </div>
              <button type="button" onClick={() => setShowHeldSales(false)} className="rounded-lg p-1.5 text-[#667085] hover:bg-[#f2f4f7]" aria-label="Close held sales">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[55vh] overflow-y-auto p-3">
              {heldSalesLoading ? (
                <p className="flex items-center justify-center gap-2 py-8 text-sm text-[#98a2b3]"><Loader2 className="h-4 w-4 animate-spin" />Loading held sales…</p>
              ) : heldSales.length === 0 ? (
                <p className="py-8 text-center text-sm text-[#98a2b3]">No held sales</p>
              ) : (
                <div className="space-y-2">
                  {heldSales.map((heldSale) => (
                    <div key={heldSale.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#e4e7ec] p-3">
                      <div>
                        <p className="text-sm font-semibold text-[#101828]">{heldSale.cart.length} item{heldSale.cart.length === 1 ? '' : 's'} · {formatCurrency(heldSale.cart.reduce((sum, item) => sum + item.totalPrice, 0))}</p>
                        <p className="mt-1 text-xs text-[#98a2b3]">Held by {heldSale.cashierName} · {new Date(heldSale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" disabled={heldSaleActionId === heldSale.id} onClick={() => void deleteHeldSale(heldSale)} className="rounded-lg border border-[#d0d5dd] px-2.5 py-2 text-xs font-semibold text-[#667085] transition-colors hover:bg-[#f9fafb] disabled:opacity-50">
                          Discard
                        </button>
                        <button
                          type="button"
                          disabled={heldSaleActionId === heldSale.id}
                          onClick={() => void resumeHeldSale(heldSale)}
                          style={{ backgroundColor: ui.primary, color: ui.primaryInk }}
                          className="rounded-lg px-3 py-2 text-xs font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                          Resume
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sales History Modal */}
      {showSalesHistory && (
        <SalesHistoryModal
          onClose={() => setShowSalesHistory(false)}
          onSelectSale={canRefund ? (sale) => {
            setRefundSale(sale)
            setShowSalesHistory(false)
          } : undefined}
        />
      )}

      {/* Receipt Reprint Modal */}
      {showReceiptReprint && (
        <ReceiptReprint
          onClose={() => setShowReceiptReprint(false)}
          settings={settings}
          onRefund={canRefund ? (sale) => {
            setRefundSale(sale)
            setShowReceiptReprint(false)
          } : undefined}
        />
      )}

      {/* Refund Dialog (from sales history or receipt reprint) */}
      {canRefund && refundSale && (
        <RefundDialog
          sale={refundSale}
          onClose={() => setRefundSale(null)}
          onSuccess={(returnedItems) => {
            setCatalogProducts((current) => current.map((product) => {
              const returned = returnedItems.find((item) => item.productId === product.id)
              return returned ? { ...product, stock: product.stock + returned.quantity } : product
            }))
            setRefundSale(null)
            toast.success('Refund processed successfully')
          }}
        />
      )}
      <WirelessScannerPairing
        open={showWirelessScanner}
        onClose={() => setShowWirelessScanner(false)}
        onBarcode={handleBarcodeScan}
      />
    </div>
  )
}
