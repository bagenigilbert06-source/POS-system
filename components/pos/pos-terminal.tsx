'use client'

import { useState, useCallback, useRef, useEffect, useMemo, useDeferredValue, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { createSale, type CartItem } from '@/app/actions/sales'
import { getMpesaPaymentStatus, initiateMpesaPaybillPayment, initiateMpesaPayment } from '@/app/actions/mpesa'
import { createCustomer } from '@/app/actions/customers'
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
} from 'lucide-react'
import type { Product, Customer, Sale, SaleItem } from '@/lib/db/schema'
import { toast } from 'sonner'
import { calculateMpesaAmount } from '@/lib/mpesa/amount'

const RefundDialog = dynamic(() => import('./refund-dialog').then((module) => module.RefundDialog), { ssr: false })
const ReceiptReprint = dynamic(() => import('./receipt-reprint').then((module) => module.ReceiptReprint), { ssr: false })
const SalesHistoryModal = dynamic(() => import('./sales-history-modal').then((module) => module.SalesHistoryModal), { ssr: false })
const ReceiptTemplate = dynamic(() => import('@/components/receipt/receipt-template').then((module) => module.ReceiptTemplate), { ssr: false })
const WirelessScannerPairing = dynamic(() => import('@/components/barcode/wireless-scanner-pairing').then((module) => module.WirelessScannerPairing), { ssr: false })

interface POSTerminalProps {
  products: Product[]
  categories: Array<{ id: string; name: string }>
  requiresAgeVerification?: boolean
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
  receiptContext?: {
    cashierName?: string
    registerName?: string | null
    locationName?: string | null
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
}

interface HeldSale {
  id: string
  cart: CartItem[]
  discount: number
  discountType: 'fixed' | 'percentage'
  customerId: string
  createdAt: string
}

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

export function POSTerminal({ products, categories, customers, settings, requiresAgeVerification = false, startCheckout = false, checkoutOnly = false, hasActiveShift = false, canDiscount = false, canRefund = false, canHold = false, receiptContext }: POSTerminalProps) {
  const router = useRouter()
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
  const [heldSalesHydrated, setHeldSalesHydrated] = useState(false)
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
      const saved = window.localStorage.getItem('pos-active-cart')
      if (saved) setCart(JSON.parse(saved) as CartItem[])
    } catch { /* ignore malformed local state */ }
    setCartHydrated(true)
  }, [])

  useEffect(() => {
    if (!cartHydrated) return
    window.localStorage.setItem('pos-active-cart', JSON.stringify(cart))
  }, [cart, cartHydrated])

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('pos-held-sales')
      if (saved) setHeldSales(JSON.parse(saved) as HeldSale[])
    } catch { /* ignore malformed local state */ }
    setHeldSalesHydrated(true)
  }, [])

  useEffect(() => {
    if (!heldSalesHydrated) return
    window.localStorage.setItem('pos-held-sales', JSON.stringify(heldSales))
  }, [heldSales, heldSalesHydrated])

  useEffect(() => {
    setIsOnline(navigator.onLine)
  }, [])

  useEffect(() => {
    if (!cartHydrated) return
    try {
      const saved = JSON.parse(window.localStorage.getItem('pos-active-mpesa') || 'null') as { requestId?: string; idempotencyKey?: string; flow?: 'stk' | 'paybill'; accountReference?: string; shortcode?: string; accountType?: 'paybill' | 'till' } | null
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
    } catch { window.localStorage.removeItem('pos-active-mpesa') }
    // Restore once; subsequent basket updates must not restart an old request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartHydrated])

  useEffect(() => {
    const online = () => setIsOnline(true)
    const offline = () => setIsOnline(false)
    window.addEventListener('online', online)
    window.addEventListener('offline', offline)
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offline) }
  }, [])

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
        if (nextStatus === 'failed' || nextStatus === 'timeout') window.localStorage.removeItem('pos-active-mpesa')
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
  }, [mpesaRequestId, mpesaStatus, isOnline])

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
        if (paymentShortcut && settings.paymentMethods.includes(paymentShortcut) && (!lockedToMpesa || paymentShortcut === 'mpesa')) {
          event.preventDefault()
          setPaymentMethod(paymentShortcut)
        }
      }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [cart.length, checkoutOpen, checkoutStep, receipt, settings.paymentMethods, openCheckout, paymentMethod, mpesaStatus])

  const addToCart = useCallback((product: Product) => {
    if (paymentMethod === 'mpesa' && ['initiating', 'pending', 'success'].includes(mpesaStatus)) {
      toast.error('Finish the current M-Pesa payment before changing the basket')
      return
    }
    if (product.stock <= 0) {
      toast.error(`${product.name} is out of stock`)
      return
    }
    setCart((previousCart) => {
      const existing = previousCart.find((item) => item.productId === product.id)
      const price = parseFloat(product.sellingPrice)
      if (existing) {
        if (existing.quantity >= product.stock) {
          toast.error(`Only ${product.stock} ${product.unit} in stock`)
          return previousCart
        }
        return previousCart.map((item) => item.productId === product.id
          ? { ...item, quantity: item.quantity + 1, totalPrice: (item.quantity + 1) * price }
          : item)
      }
      return [...previousCart, { productId: product.id, productName: product.name, quantity: 1, unitPrice: price, totalPrice: price }]
    })
  }, [paymentMethod, mpesaStatus])

  const handleBarcodeScan = useCallback((rawBarcode: string) => {
    const barcode = normalizeBarcode(rawBarcode)
    if (!barcode) return false
    const matches = catalogProducts.filter((product) => normalizeBarcode(product.barcode ?? '') === barcode && product.isActive)
    if (matches.length === 0) {
      setScanMessage(`No product found for barcode ${barcode}. Add the barcode to the product first.`)
      toast.error(`No product found for barcode ${barcode}`, {
        description: 'Register the item once, then future scans will add it to the basket.',
        action: { label: 'Register product', onClick: () => router.push(`/dashboard/products/new?barcode=${encodeURIComponent(barcode)}`) },
      })
      return false
    }
    if (matches.length > 1) {
      setScanMessage(`Barcode ${barcode} is assigned to more than one product. Correct the product records before selling.`)
      toast.error('Duplicate barcode detected. Ask a manager to correct the products.')
      return false
    }
    const product = matches[0]
    if (product.stock <= 0) {
      setScanMessage(`${product.name} is out of stock.`)
      toast.error(`${product.name} is out of stock`)
      return false
    }
    addToCart(product)
    setSearch('')
    setSelectedCategory('')
    setScanMessage(`${product.name} added to basket.`)
    return true
  }, [addToCart, catalogProducts, router])

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
  const deferredSearch = useDeferredValue(search.trim().toLocaleLowerCase())

  const filteredProducts = useMemo(() => catalogProducts.filter(
    (p) =>
      p.isActive &&
      p.stock > 0 &&
      (!selectedCategory || p.categoryId === selectedCategory) &&
      (!deferredSearch ||
        p.name.toLocaleLowerCase().includes(deferredSearch) ||
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
          if (product && newQty > product.stock) {
            toast.error(`Only ${product.stock} in stock`)
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

  const processCheckout = async (verified = ageVerified, serverAlreadyConfirmed = false) => {
    if (!hasActiveShift) return toast.error('Start your shift before completing a sale')
    if (cart.length === 0) return toast.error('Cart is empty')
    if (paymentMethod === 'mpesa' && ((!serverAlreadyConfirmed && mpesaStatus !== 'success') || !mpesaRequestId || !mpesaRef)) return toast.error('Wait for M-Pesa payment confirmation')
    if (paymentMethod === 'card' && !mpesaRef) return toast.error('Enter the card approval or terminal reference')
    if (paymentMethod === 'cash' && parseFloat(amountPaid || '0') < total) {
      return toast.error('Amount paid is less than total')
    }

    // Check for low stock items
    const lowStockItems = cart.filter(item => {
      const product = catalogProducts.find(p => p.id === item.productId)
      return product && (product.stock - item.quantity) < product.minStock
    })

    if (lowStockItems.length > 0) {
      toast.warning(`${lowStockItems.length} item(s) will go below minimum stock level after this sale`)
    }

    setProcessing(true)

    // Generate idempotency key on first attempt
    if (!checkoutIdempotencyKeyRef.current) {
      checkoutIdempotencyKeyRef.current = createIdempotencyKey()
    }

    try {
      const { saleId, receiptNo, tax, rounding: returnedRounding, total: returnedTotal, items: savedItems } = await createSale({
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
      })
      if (paymentMethod === 'mpesa') {
        window.localStorage.removeItem('pos-active-mpesa')
        window.localStorage.removeItem('pos-active-cart')
      }
      setCatalogProducts((current) => current.map((product) => {
        const sold = cart.find((item) => item.productId === product.id)
        return sold ? { ...product, stock: Math.max(0, product.stock - sold.quantity) } : product
      }))

      // Show success toast with inventory update notification
      toast.success('Sale completed & inventory updated', {
        description: `${cart.length} product(s) - Receipt #${receiptNo}`,
      })
    } catch (err) {
      autoFinalizingRef.current = false
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
    if (!checkoutIdempotencyKeyRef.current || mpesaStatus === 'failed' || mpesaStatus === 'timeout') checkoutIdempotencyKeyRef.current = createIdempotencyKey()
    setMpesaStatus('initiating')
    setMpesaMessage('Sending the payment prompt…')
    setMpesaRef('')
    try {
      const response = await initiateMpesaPayment({
        phone: mpesaPhone, items: cart.map(({ productId, quantity }) => ({ productId, quantity })),
        discountAmount, idempotencyKey: checkoutIdempotencyKeyRef.current, ageVerified, customerId: selectedCustomer || undefined,
      })
      setMpesaRequestId(response.id)
      window.localStorage.setItem('pos-active-mpesa', JSON.stringify({ requestId: response.id, idempotencyKey: checkoutIdempotencyKeyRef.current, flow: 'stk' }))
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
    if (!checkoutIdempotencyKeyRef.current || mpesaStatus === 'failed' || mpesaStatus === 'timeout') checkoutIdempotencyKeyRef.current = createIdempotencyKey()
    setMpesaStatus('initiating')
    setMpesaMessage('Preparing Till / PayBill payment details…')
    setMpesaRef('')
    try {
      const response = await initiateMpesaPaybillPayment({
        items: cart.map(({ productId, quantity }) => ({ productId, quantity })),
        discountAmount, idempotencyKey: checkoutIdempotencyKeyRef.current, ageVerified, customerId: selectedCustomer || undefined,
      })
      setMpesaRequestId(response.id)
      window.localStorage.setItem('pos-active-mpesa', JSON.stringify({ requestId: response.id, idempotencyKey: checkoutIdempotencyKeyRef.current, flow: 'paybill', accountReference: response.accountReference, shortcode: response.shortcode, accountType: response.accountType }))
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
    window.localStorage.removeItem('pos-active-cart')
    window.localStorage.removeItem('pos-active-mpesa')
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

      // Capture the rendered thermal paper itself so the download matches the
      // exact receipt design on screen. The sale is never re-created or mutated.
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
    } catch {
      toast.error('Could not download receipt')
    }
  }, [receipt, receiptPaperWidth])

  const handleShareReceipt = useCallback(async () => {
    if (!receipt) return
    const text = `Receipt ${receipt.receiptNo} · ${formatCurrency(receipt.total)} · ${receipt.paymentMethod}`
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

  const holdSale = () => {
    if (!canHold || cart.length === 0) return
    setHeldSales((previous) => [{
      id: createIdempotencyKey(),
      cart,
      discount,
      discountType,
      customerId: selectedCustomer,
      createdAt: new Date().toISOString(),
    }, ...previous].slice(0, 20))
    setCart([])
    setDiscount(0)
    setSelectedCustomer('')
    setAmountPaid('')
    setMpesaRef('')
    setCheckoutOpen(false)
    toast.success('Sale held. You can resume it from Held sales.')
  }

  const resumeHeldSale = (heldSale: HeldSale) => {
    setCart(heldSale.cart)
    setDiscount(heldSale.discount)
    setDiscountType(heldSale.discountType)
    setSelectedCustomer(heldSale.customerId)
    setHeldSales((previous) => previous.filter((sale) => sale.id !== heldSale.id))
    setShowHeldSales(false)
    setCheckoutOpen(false)
    toast.success('Held sale restored')
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
  if (showRefundDialog && receipt) {
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
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#b7ebc6] bg-[#ecfdf3] dark:border-[#1d6b3b] dark:bg-[#102417]"><CheckCircle2 className="h-4 w-4 text-[#12b76a] dark:text-[#86efac]" aria-hidden="true" /></span>
              <div>
                <p className="text-sm font-bold text-[#101828] dark:text-white">Sale completed</p>
                <p className="mt-0.5 text-xs text-[#667085] dark:text-[#c7b978]">Paid successfully · Receipt #{receipt.receiptNo}</p>
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
                <div className="receipt-preview-origin mx-auto w-full max-w-[80mm] overflow-hidden rounded-lg bg-white shadow-[0_8px_20px_rgba(16,24,40,.10)]">
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
    <div className={cn('pos-terminal relative grid min-h-[calc(100vh-10.5rem)] gap-4 bg-[#f7f8fa] dark:bg-[#0c0c0c] sm:gap-5 lg:h-[calc(100dvh-10.5rem)] lg:min-h-[520px] lg:grid-cols-[minmax(0,1fr)_460px] lg:items-stretch xl:grid-cols-[minmax(0,1fr)_520px]', checkoutOnly && 'w-full max-w-none bg-transparent lg:h-auto lg:grid-cols-1 lg:gap-6')}>
      {/* Left: Product catalog */}
      <section className={cn(ui.card, 'flex min-h-[520px] min-w-0 flex-col overflow-hidden lg:min-h-0', checkoutOnly && 'hidden')}>
        <div className="border-b border-[#eef0f3] px-5 py-3 dark:border-white/10 sm:px-6">
          <div className="mb-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-semibold tracking-tight text-[#101828] dark:text-white">Catalog</h2>
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#067647] dark:text-[#8de1aa]"><span className="h-1.5 w-1.5 rounded-full bg-[#12b76a]" />{filteredProducts.length} available</span>
            </div>
            <p className="hidden text-xs text-[#667085] dark:text-[#8b8b8b] sm:block">Tap to add</p>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98a2b3]" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by name, SKU or barcode…"
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
              All products
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
        <div className="pos-scroll-region min-h-0 flex-1 overflow-y-auto bg-[#fbfbfc] p-4 dark:bg-[#0f0f0f] sm:p-5">
          {filteredProducts.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-center">
              <Package className="mb-3 h-9 w-9 text-[#d0d5dd]" strokeWidth={1.5} />
              <p className="text-sm font-medium text-[#344054]">
                {search ? 'No products match your search' : 'No active products with stock'}
              </p>
              <p className="mt-1 text-xs text-[#98a2b3]">
                {search ? 'Try a different search term' : 'Add products to begin selling'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-4">
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
                      'pos-product-card group relative flex min-h-[224px] flex-col overflow-hidden rounded-xl border bg-white text-left shadow-[0_1px_2px_rgba(16,24,40,.03)] transition-colors duration-100 motion-reduce:transition-none after:pointer-events-none after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#f9b21d] after:opacity-0',
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
                      <span className="relative block h-[112px] w-full overflow-hidden bg-[#f2f4f7] dark:bg-[#1f1f1f]">
                        <Image
                          src={product.imageUrl}
                          alt={product.name}
                          fill
                          sizes="(min-width: 1280px) 240px, (min-width: 640px) 30vw, 50vw"
                          quality={60}
                          className="object-cover"
                        />
                      </span>
                    ) : (
                      <div className="flex h-[112px] w-full items-center justify-center bg-[#f2f4f7] text-[#98a2b3] dark:bg-[#1f1f1f]">
                        <Package className="h-7 w-7" strokeWidth={1.5} />
                      </div>
                    )}
                    <div className="flex flex-1 flex-col px-3.5 pb-3.5 pt-3">
                      <p className="mb-0.5 line-clamp-2 text-sm font-semibold leading-snug text-[#101828] dark:text-white">{product.name}</p>
                      {(product.volume || product.unit) && (
                        <p className="text-[11px] text-[#667085] dark:text-[#8b8b8b]">
                          {product.volume ? `${product.volume} ${product.volumeUnit || ''}` : ''}{product.volume && product.unit ? ' · ' : ''}{product.unit}
                        </p>
                      )}
                      <div className="mt-auto flex items-end justify-between gap-2 pt-2">
                        <p className="text-sm font-bold tabular-nums text-[#101828] dark:text-white">{formatCurrency(product.sellingPrice)}</p>
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
                  <button onClick={holdSale} className="flex items-center justify-center gap-2 rounded-lg border border-[#e4e7ec] bg-white px-2.5 py-2.5 text-xs font-semibold text-[#344054] transition-colors hover:border-[#e6c66f] hover:bg-[#fffdf5] dark:border-white/10 dark:bg-[#1a1a1a] dark:text-[#e4e7ec] dark:hover:bg-[#252116]"><span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#fff3d1] text-[#9a6700] dark:bg-[#3a3016] dark:text-[#ffd166]"><PauseCircle className="h-3.5 w-3.5" /></span>Hold sale</button>
                  <button onClick={() => setShowHeldSales(true)} className="flex items-center justify-center gap-2 rounded-lg border border-[#e4e7ec] bg-white px-2.5 py-2.5 text-xs font-semibold text-[#344054] transition-colors hover:border-[#a9d7ba] hover:bg-[#f7fdf8] dark:border-white/10 dark:bg-[#1a1a1a] dark:text-[#e4e7ec] dark:hover:bg-[#16261b]">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#e7f7ed] text-[#18794e] dark:bg-[#173c27] dark:text-[#9fe1b9]"><ArchiveRestore className="h-3.5 w-3.5" /></span>
                    Held sales{heldSales.length ? ` (${heldSales.length})` : ''}
                  </button>
                </>
              )}
              {canHold && cart.length === 0 && heldSales.length > 0 && (
                <button onClick={() => setShowHeldSales(true)} className="col-span-2 flex items-center justify-center gap-2 rounded-lg border border-[#e4e7ec] bg-white px-2.5 py-2.5 text-xs font-semibold text-[#344054] transition-colors hover:border-[#a9d7ba] hover:bg-[#f7fdf8] dark:border-white/10 dark:bg-[#1a1a1a] dark:text-[#e4e7ec] dark:hover:bg-[#16261b]">
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
              <p className="mt-1 max-w-[220px] text-xs leading-5 text-[#98a2b3]">Select products from the catalog to build this sale.</p>
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
                <button onClick={() => setShowNewCustomer(!showNewCustomer)} disabled={mpesaLocksBasket} className="rounded-md px-1.5 py-1 text-[11px] font-bold text-[#a47700] transition-colors hover:bg-[#fff8d6] disabled:cursor-not-allowed disabled:opacity-50 dark:text-[#ffd166] dark:hover:bg-[#3a3016]">
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
                      disabled={mpesaLocksBasket && paymentMethod !== key}
                      aria-pressed={paymentMethod === key}
                      aria-label={`${label} payment (${shortcut})`}
                      title={`${label} (${shortcut})`}
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
                <p className="mt-0.5 text-xs text-[#98a2b3]">Stored on this POS browser until resumed or cleared</p>
              </div>
              <button type="button" onClick={() => setShowHeldSales(false)} className="rounded-lg p-1.5 text-[#667085] hover:bg-[#f2f4f7]" aria-label="Close held sales">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[55vh] overflow-y-auto p-3">
              {heldSales.length === 0 ? (
                <p className="py-8 text-center text-sm text-[#98a2b3]">No held sales</p>
              ) : (
                <div className="space-y-2">
                  {heldSales.map((heldSale) => (
                    <div key={heldSale.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#e4e7ec] p-3">
                      <div>
                        <p className="text-sm font-semibold text-[#101828]">{heldSale.cart.length} item{heldSale.cart.length === 1 ? '' : 's'} · {formatCurrency(heldSale.cart.reduce((sum, item) => sum + item.totalPrice, 0))}</p>
                        <p className="mt-1 text-xs text-[#98a2b3]">Held {new Date(heldSale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setHeldSales((previous) => previous.filter((sale) => sale.id !== heldSale.id))} className="rounded-lg border border-[#d0d5dd] px-2.5 py-2 text-xs font-semibold text-[#667085] transition-colors hover:bg-[#f9fafb]">
                          Discard
                        </button>
                        <button
                          type="button"
                          onClick={() => resumeHeldSale(heldSale)}
                          style={{ backgroundColor: ui.primary, color: ui.primaryInk }}
                          className="rounded-lg px-3 py-2 text-xs font-bold transition-opacity hover:opacity-90"
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
