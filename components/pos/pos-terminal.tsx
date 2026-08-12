'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createSale, type CartItem } from '@/app/actions/sales'
import { getMpesaPaymentStatus, initiateMpesaPaybillPayment, initiateMpesaPayment } from '@/app/actions/mpesa'
import { createCustomer } from '@/app/actions/customers'
import { formatCurrency, normalizeBarcode } from '@/lib/utils'
import { cn } from '@/lib/utils'
import {
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Loader2,
  CheckCircle2,
  Smartphone,
  Banknote,
  CreditCard,
  X,
  Package,
  Printer,
  History,
  RotateCcw,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import type { Product, Customer, Sale, SaleItem } from '@/lib/db/schema'
import { toast } from 'sonner'
import { RefundDialog } from './refund-dialog'
import { ReceiptReprint } from './receipt-reprint'
import { SalesHistoryModal } from './sales-history-modal'
import { ReceiptTemplate } from '@/components/receipt/receipt-template'
import { calculateMpesaAmount } from '@/lib/mpesa/amount'

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

function PaymentBrand({ method }: { method: 'cash' | 'mpesa' | 'card' }) {
  if (method === 'cash') return <Banknote className="h-4 w-4" aria-hidden="true" />
  if (method === 'mpesa') return <Image src="/payment-logos/mpesa.svg" alt="M-Pesa" width={62} height={28} className="h-5 w-auto object-contain" />
  return <span className="flex items-center gap-1"><Image src="/payment-logos/visa.svg" alt="Visa" width={32} height={18} className="h-4 w-auto object-contain" /><Image src="/payment-logos/mastercard.svg" alt="Mastercard" width={32} height={18} className="h-4 w-auto object-contain" /></span>
}

export function POSTerminal({ products, categories, customers, settings, requiresAgeVerification = false, startCheckout = false, checkoutOnly = false, hasActiveShift = false, canDiscount = false, canRefund = false, canHold = false }: POSTerminalProps) {
  const router = useRouter()
  const [catalogProducts, setCatalogProducts] = useState(products)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const saved = window.localStorage.getItem('pos-active-cart')
      return saved ? JSON.parse(saved) as CartItem[] : []
    } catch {
      return []
    }
  })
  const [discount, setDiscount] = useState(0)
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa' | 'card'>('cash')
  const [mpesaRef, setMpesaRef] = useState('')
  const [mpesaPhone, setMpesaPhone] = useState('')
  const [mpesaFlow, setMpesaFlow] = useState<'stk' | 'paybill'>('stk')
  const [mpesaAccountReference, setMpesaAccountReference] = useState('')
  const [mpesaShortcode, setMpesaShortcode] = useState('')
  const [mpesaRequestId, setMpesaRequestId] = useState('')
  const [mpesaStatus, setMpesaStatus] = useState<MpesaStatus>('idle')
  const [mpesaMessage, setMpesaMessage] = useState('')
  const [amountPaid, setAmountPaid] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<string>('')
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
  const [heldSales, setHeldSales] = useState<HeldSale[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const saved = window.localStorage.getItem('pos-held-sales')
      return saved ? JSON.parse(saved) as HeldSale[] : []
    } catch {
      return []
    }
  })
  const [refundSale, setRefundSale] = useState<(Sale & { items: SaleItem[] }) | null>(null)
  const [ageVerified, setAgeVerified] = useState(false)
  const [showAgeVerification, setShowAgeVerification] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(startCheckout)
  const [scanMessage, setScanMessage] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const barcodeBufferRef = useRef<string>('')
  const barcodeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastScanRef = useRef<{ barcode: string; at: number } | null>(null)
  const checkoutIdempotencyKeyRef = useRef<string>('')
  const mpesaLocksBasket = paymentMethod === 'mpesa' && ['initiating', 'pending', 'success'].includes(mpesaStatus)

  useEffect(() => {
    window.localStorage.setItem('pos-active-cart', JSON.stringify(cart))
  }, [cart])

  useEffect(() => {
    window.localStorage.setItem('pos-held-sales', JSON.stringify(heldSales))
  }, [heldSales])

  useEffect(() => {
    if (!mpesaRequestId || mpesaStatus !== 'pending') return
    let cancelled = false
    const poll = async () => {
      try {
        const result = await getMpesaPaymentStatus(mpesaRequestId)
        if (cancelled) return
        const nextStatus = result.status as MpesaStatus
        setMpesaStatus(nextStatus)
        setMpesaMessage(result.message || '')
        if (nextStatus === 'success' && result.receiptNumber) {
          setMpesaRef(result.receiptNumber)
          toast.success('M-Pesa payment received', { description: `Receipt ${result.receiptNumber}` })
        }
      } catch (error) {
        if (!cancelled) setMpesaMessage(error instanceof Error ? error.message : 'Could not check M-Pesa status')
      }
    }
    void poll()
    const timer = window.setInterval(() => void poll(), 2_000)
    return () => { cancelled = true; window.clearInterval(timer) }
  }, [mpesaRequestId, mpesaStatus])

  // Checkout is already mounted in this terminal. Measure the local transition in
  // development without making a network request part of the cashier's Pay action.
  const openCheckout = useCallback(() => {
    if (!hasActiveShift) {
      toast.error('Start your shift before taking payment')
      return
    }
    performance.mark('pos-pay-click')
    setCheckoutOpen(true)
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
      if (checkoutOpen && !receipt) {
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
  }, [cart.length, checkoutOpen, receipt, settings.paymentMethods, openCheckout, paymentMethod, mpesaStatus])

  const addToCart = useCallback((product: Product) => {
    if (paymentMethod === 'mpesa' && ['initiating', 'pending', 'success'].includes(mpesaStatus)) {
      toast.error('Finish the current M-Pesa payment before changing the basket')
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

  const SCANNER_INACTIVITY_MS = 450
  
  const availableCategories = categories.filter((category) => catalogProducts.some((product) => product.categoryId === category.id))
  
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
        
        // Find product by barcode
        const product = catalogProducts.find(p => normalizeBarcode(p.barcode ?? '') === barcode && p.isActive)
        if (product) {
          addToCart(product)
          setSearch('')
          setScanMessage(`${product.name} added — quantity updated.`)
        } else {
          toast.error(`No product found for barcode ${barcode}.`)
          setScanMessage(`No product found for barcode ${barcode}.`)
        }
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
  }, [catalogProducts, receipt, processing, checkoutOpen, addToCart])

  const productsById = useMemo(() => new Map(catalogProducts.map((product) => [product.id, product])), [catalogProducts])

  const filteredProducts = useMemo(() => catalogProducts.filter(
    (p) =>
      p.isActive &&
      p.stock > 0 &&
      (!selectedCategory || p.categoryId === selectedCategory) &&
      (!search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.sku ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (p.barcode ?? '').toLowerCase().includes(search.toLowerCase()))
  ), [catalogProducts, search, selectedCategory])

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

  const processCheckout = async (verified = ageVerified) => {
    if (!hasActiveShift) return toast.error('Start your shift before completing a sale')
    if (cart.length === 0) return toast.error('Cart is empty')
    if (paymentMethod === 'mpesa' && (mpesaStatus !== 'success' || !mpesaRequestId || !mpesaRef)) return toast.error('Wait for M-Pesa payment confirmation')
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
      })
      setCatalogProducts((current) => current.map((product) => {
        const sold = cart.find((item) => item.productId === product.id)
        return sold ? { ...product, stock: Math.max(0, product.stock - sold.quantity) } : product
      }))
      
      // Show success toast with inventory update notification
      toast.success('Sale completed & inventory updated', {
        description: `${cart.length} product(s) - Receipt #${receiptNo}`,
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to process sale')
    } finally {
      setProcessing(false)
    }
  }

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
        discountAmount, idempotencyKey: checkoutIdempotencyKeyRef.current, ageVerified,
      })
      setMpesaRequestId(response.id)
      setMpesaStatus(response.status as MpesaStatus)
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
    setMpesaMessage('Preparing a unique PayBill reference…')
    setMpesaRef('')
    try {
      const response = await initiateMpesaPaybillPayment({
        items: cart.map(({ productId, quantity }) => ({ productId, quantity })),
        discountAmount, idempotencyKey: checkoutIdempotencyKeyRef.current, ageVerified,
      })
      setMpesaRequestId(response.id)
      setMpesaStatus(response.status as MpesaStatus)
      setMpesaMessage(response.message || 'Waiting for PayBill payment')
      setMpesaAccountReference(response.accountReference || '')
      setMpesaShortcode(response.shortcode)
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
    setMpesaRequestId('')
    setMpesaStatus('idle')
    setMpesaMessage('')
    setAmountPaid('')
    setSelectedCustomer('')
    setPaymentMethod('cash')
    setAgeVerified(false)
    setReceipt(null)
    setSearch('')
    setCheckoutOpen(false)
    checkoutIdempotencyKeyRef.current = '' // Reset for new sale
    window.localStorage.removeItem('pos-active-cart')
  }

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

  const inputCls = 'w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors'

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
        userId: '',
        orgId: '',
      })),
    }

    return (
      <>
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
      </>
    )
  }

  // Receipt overlay
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

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
        <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,.22)]">
          <div className="max-h-[72vh] overflow-y-auto bg-white px-4 py-6 sm:px-8">
            <ReceiptTemplate
              sale={printableSale}
              businessName={settings.receiptBusinessName}
              businessPhone={settings.receiptPhone}
              businessAddress={settings.receiptAddress}
              receiptFooter={settings.receiptFooter}
              layout={settings.receiptLayout}
              template={settings.receiptTemplate}
              logoUrl={settings.receiptLogoUrl}
              taxName={settings.taxName}
              showPhone={settings.receiptShowPhone}
              showAddress={settings.receiptShowAddress}
              showCashier={settings.receiptShowCashier}
              showCustomer={settings.receiptShowCustomer}
              showPayment={settings.receiptShowPayment}
              showQrCode={settings.receiptShowQrCode}
              showItemSku={settings.receiptShowItemSku}
            />
          </div>

          {/* Actions */}
          <div className="receipt-actions flex flex-wrap gap-2 border-t border-zinc-200 bg-white p-4">
            <button
              onClick={() => window.print()}
              className="flex min-w-[100px] flex-1 items-center justify-center gap-2 rounded-lg border border-zinc-300 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
            {canRefund && <button
              onClick={() => setShowRefundDialog(true)}
              className="flex min-w-[100px] flex-1 items-center justify-center gap-2 rounded-lg border border-red-300 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
            >
              <RotateCcw className="h-4 w-4" />
              Refund
            </button>}
            <button
              onClick={handleNewSale}
              className="flex min-w-[100px] flex-1 items-center justify-center gap-2 rounded-lg bg-[#e42527] py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#c91f21]"
            >
              <Plus className="h-4 w-4" />
              Next Sale
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('pos-terminal relative grid min-h-[calc(100vh-10.5rem)] gap-5 bg-[#f8f9fb] p-1 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_420px] xl:grid-cols-[minmax(0,1fr)_460px] lg:items-stretch', checkoutOnly && 'w-full max-w-none bg-transparent lg:grid-cols-1 lg:gap-6')}>
      {/* Left: Product catalog */}
      <section className={cn('flex min-h-[520px] min-w-0 flex-col overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-[0_8px_28px_rgba(16,24,40,.04)]', checkoutOnly && 'hidden')}>
        <div className="border-b border-[#eef0f3] px-5 py-5 sm:px-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-[var(--dashboard-text)]">Products</h2>
              </div>
              <p className="mt-1 text-sm text-[var(--dashboard-muted)]">Select an item to add it to the sale.</p>
            </div>
            <span className="rounded-md border border-[#f1d66a] bg-[#fff7d6] px-2 py-1 text-xs font-semibold text-[#9a6700] dark:border-[rgba(255,214,10,0.2)] dark:bg-[rgba(255,214,10,0.1)] dark:text-[#ffd60a]">{filteredProducts.length} available</span>
          </div>
          <div className="relative">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search by name, SKU or barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              const barcode = normalizeBarcode(search)
              const match = catalogProducts.find((product) => product.isActive && normalizeBarcode(product.barcode ?? '') === barcode)
              if (match) { e.preventDefault(); addToCart(match); setSearch(''); setScanMessage(`${match.name} added — quantity updated.`) }
            }}
            className={cn(inputCls, 'h-12 rounded-xl border-[#e1e5eb] bg-[#f8f9fb] pr-10 shadow-none placeholder:text-[#98a2b3] dark:bg-[#171717]')}
            autoFocus
          />
          <p className="mt-2 text-xs text-muted-foreground" role="status" aria-live="polite">{scanMessage || 'Scanner ready · focus the POS screen and scan a barcode.'}</p>
          </div>
        </div>
        
        {/* Category filter */}
        {availableCategories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto border-b border-[var(--dashboard-border)] px-4 py-3 sm:px-5">
            <button
              onClick={() => setSelectedCategory('')}
              className={cn(
                'flex-shrink-0 rounded-md border px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors',
                !selectedCategory
                  ? 'border-[#f1d66a] bg-[#fff7d6] text-[#9a6700] dark:border-[rgba(255,214,10,0.2)] dark:bg-[rgba(255,214,10,0.1)] dark:text-[#ffd60a]'
                  : 'border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] text-[var(--dashboard-muted)] hover:bg-[#f7f8fa] dark:hover:bg-white/5'
              )}
            >
              All products
            </button>
            {availableCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={cn(
                  'flex-shrink-0 rounded-md border px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors',
                  selectedCategory === category.id
                    ? 'border-[#f1d66a] bg-[#fff7d6] text-[#9a6700] dark:border-[rgba(255,214,10,0.2)] dark:bg-[rgba(255,214,10,0.1)] dark:text-[#ffd60a]'
                    : 'border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] text-[var(--dashboard-muted)] hover:bg-[#f7f8fa] dark:hover:bg-white/5'
                )}
              >
                {category.name}
              </button>
            ))}
          </div>
        )}

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto bg-[#fafbfc] p-4 dark:bg-[#101010] sm:p-6">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <Package className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground font-medium">
                {search ? 'No products match your search' : 'No active products with stock'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {search ? 'Try a different search term' : 'Add products to begin selling'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {filteredProducts.map((product) => {
                const inCart = cart.find((i) => i.productId === product.id)
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
                    aria-label={`Add ${product.name} to basket${inCart ? `, currently ${inCart.quantity}` : ''}`}
                    className={cn(
                      'group relative flex min-h-[210px] flex-col overflow-hidden rounded-xl border border-[#e7e9ee] bg-white text-left transition-colors duration-75',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      'hover:border-[#d7b640] hover:bg-[#fffef9] focus-visible:border-[#d7b640] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f1d66a]/50 dark:hover:bg-[#211e12]',
                      inCart
                        ? 'border-[#e1b900] bg-[#fffdf2] ring-2 ring-[#f1d66a]/50 dark:border-[rgba(255,214,10,0.2)] dark:bg-[rgba(255,214,10,0.1)] dark:ring-[rgba(255,214,10,0.2)]'
                        : ''
                    )}
                  >
                    {/* Stock badge */}
                    {product.stock <= product.minStock && product.stock > 0 && (
                      <div className="absolute right-2 top-2 z-10 rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">Low</div>
                    )}
                    {outOfStock && (
                      <div className="absolute right-2 top-2 z-10 rounded bg-red-50 px-1.5 py-0.5 text-[9px] font-bold text-red-800">OOS</div>
                    )}
                    
                    {/* Product image or icon */}
                    {product.imageUrl ? (
                      <span className="relative block h-[104px] w-full bg-[#f5f6f8]">
                        <Image
                          src={product.imageUrl}
                          alt={product.name}
                          fill
                          sizes="(min-width: 1280px) 240px, (min-width: 640px) 30vw, 50vw"
                          unoptimized
                          className="object-cover"
                        />
                      </span>
                    ) : (
                      <div className="flex h-[104px] w-full items-center justify-center bg-[#f5f6f8] text-[#98a2b3] dark:bg-[#252525] dark:text-[#a7a7a7]">
                        <Package className="h-8 w-8" strokeWidth={1.5} />
                      </div>
                    )}
                    <div className="flex flex-1 flex-col px-3 pb-3 pt-2.5">
                      <p className="mb-1 line-clamp-2 text-sm font-semibold leading-snug text-[var(--dashboard-text)]">{product.name}</p>
                      {(product.volume || product.unit) && <p className="text-[11px] text-[#8a94a6]">{product.volume ? `${product.volume} ${product.volumeUnit || ''}` : ''}{product.volume && product.unit ? ' · ' : ''}{product.unit}</p>}
                      <div className="mt-auto flex items-end justify-between gap-2 pt-2">
                        <p className="text-sm font-bold text-[var(--dashboard-text)]">{formatCurrency(product.sellingPrice)}</p>
                        {inCart ? (
                          <div
                            className="relative z-20 flex h-8 shrink-0 items-center overflow-hidden rounded-lg border border-[#e4c64d] bg-[#fff9dc] shadow-sm dark:border-[rgba(255,214,10,0.28)] dark:bg-[#2b2716]"
                            onClick={(event) => event.stopPropagation()}
                            title={`${product.stock} ${product.unit} in stock`}
                          >
                            <button
                              type="button"
                              onClick={() => updateQty(product.id, -1)}
                              className="flex h-full w-8 items-center justify-center text-[#715a00] transition-colors hover:bg-[#fff0a8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#d7b640] dark:text-[#ffe45b] dark:hover:bg-white/10"
                              aria-label={`Reduce ${product.name} quantity`}
                              title="Reduce quantity"
                            >
                              <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
                            </button>
                            <span className="min-w-7 border-x border-[#ead676] px-1 text-center text-xs font-bold tabular-nums text-[#312700] dark:border-[rgba(255,214,10,0.2)] dark:text-[#fff4b0]" aria-live="polite">
                              {inCart.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQty(product.id, 1)}
                              disabled={inCart.quantity >= product.stock}
                              className="flex h-full w-8 items-center justify-center text-[#715a00] transition-colors hover:bg-[#fff0a8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#d7b640] disabled:cursor-not-allowed disabled:opacity-35 dark:text-[#ffe45b] dark:hover:bg-white/10"
                              aria-label={`Increase ${product.name} quantity`}
                              title={inCart.quantity >= product.stock ? 'Maximum available stock reached' : 'Increase quantity'}
                            >
                              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                            </button>
                          </div>
                        ) : (
                          <p className={cn('text-[10px]', outOfStock ? 'font-medium text-red-600' : 'text-[#8a94a6]')}>{product.stock} {product.unit}</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Cart badge */}
                    {inCart && (
                      <div className="absolute right-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-[#ffd60a] px-1.5 text-xs font-bold text-[#111113] shadow-sm">
                        {inCart.quantity}
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
      <aside className={cn('flex min-h-[520px] w-full flex-col overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-[0_8px_28px_rgba(16,24,40,.05)] lg:sticky lg:top-5 lg:max-h-[calc(100vh-7rem)]', checkoutOnly && 'min-h-0 w-full max-w-none gap-6 overflow-visible border-0 bg-transparent shadow-none lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(500px,.85fr)] lg:items-start lg:static lg:max-h-none')}>
        {/* Cart header with quick actions */}
        <div className={cn('border-b border-[#eef0f3] bg-white p-5 dark:bg-[#191817]', checkoutOnly && 'hidden')}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fff3bf] text-[#8a6500] dark:bg-[rgba(255,214,10,0.1)] dark:text-[#ffd60a]"><ShoppingCart className="h-4 w-4" /></span>
              <div><span className="block text-sm font-bold text-[var(--dashboard-text)]">{checkoutOpen ? 'Checkout' : 'Your basket'}</span><span className="block text-[11px] text-[var(--dashboard-muted)]">{cart.length ? `${cart.length} item${cart.length === 1 ? '' : 's'} in this sale` : 'Start a new sale'}</span></div>
            </div>
            {checkoutOpen ? (
              <button onClick={() => setCheckoutOpen(false)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10">
                ← Edit basket
              </button>
            ) : cart.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('Clear all items from cart?')) setCart([])
                }}
                className="text-xs font-medium text-muted-foreground hover:text-destructive transition-colors"
              >
                Clear
              </button>
            )}
          </div>
          
          {!checkoutOpen && <div className="mt-4 space-y-2">
            <div className="flex gap-2">
              <button
                onClick={() => setShowSalesHistory(true)}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border border-input hover:bg-accent/50 transition-colors text-xs font-medium"
              >
                <History className="h-3 w-3" />
                History
              </button>
              <button
                onClick={() => setShowReceiptReprint(true)}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border border-input hover:bg-accent/50 transition-colors text-xs font-medium"
              >
                <Printer className="h-3 w-3" />
                Reprint
              </button>
            </div>
            {canHold && cart.length > 0 && (
              <div className="flex gap-2">
                <button onClick={holdSale} className="flex-1 rounded-lg border border-input py-1.5 text-xs font-medium transition-colors hover:bg-accent/50">
                  Hold sale
                </button>
                <button onClick={() => setShowHeldSales(true)} className="flex-1 rounded-lg border border-input py-1.5 text-xs font-medium transition-colors hover:bg-accent/50">
                  Held sales{heldSales.length ? ` (${heldSales.length})` : ''}
                </button>
              </div>
            )}
            {canHold && cart.length === 0 && heldSales.length > 0 && (
              <button onClick={() => setShowHeldSales(true)} className="w-full rounded-lg border border-input py-1.5 text-xs font-medium transition-colors hover:bg-accent/50">
                Resume held sale ({heldSales.length})
              </button>
            )}
          </div>}
        </div>

        {/* Cart items */}
        <div className={cn('min-h-[220px] flex-1 overflow-y-auto', checkoutOpen && !checkoutOnly && 'max-h-[252px] flex-none border-b border-[#eef0f3]', checkoutOnly && 'flex min-h-0 flex-col self-start overflow-hidden rounded-2xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] shadow-[0_12px_36px_rgba(0,0,0,.12)] lg:col-start-1 lg:row-start-1')}>
          {checkoutOnly && <div className="flex items-center justify-between border-b border-[var(--dashboard-border)] px-6 py-5"><div><h2 className="text-lg font-bold tracking-tight text-[var(--dashboard-text)]">Order summary</h2><p className="mt-1 text-sm text-[var(--dashboard-muted)]">{cart.length} item{cart.length === 1 ? '' : 's'} ready for payment</p></div><button type="button" onClick={() => router.push('/dashboard/pos')} className="rounded-lg px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/10">Edit basket</button></div>}
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12 px-4">
              <ShoppingCart className="mb-3 h-11 w-11 text-[#d9dde5] dark:text-[#3a3a3a]" />
              <p className="text-sm font-semibold text-[var(--dashboard-text)]">Your basket is empty</p>
              <p className="mt-1 max-w-[220px] text-xs leading-5 text-[var(--dashboard-muted)]">Select products from the catalog to build this sale.</p>
            </div>
          ) : (
            <ul className="divide-y">
              {cart.map((item) => (
                <li key={item.productId} className="group flex min-h-[76px] items-center gap-3 px-3 py-3 transition-colors duration-75 hover:bg-[#fafbfc] dark:hover:bg-white/5">
                  {productsById.get(item.productId)?.imageUrl ? <Image src={productsById.get(item.productId)?.imageUrl ?? ''} alt="" width={44} height={44} unoptimized className="h-11 w-11 shrink-0 rounded-lg object-cover" /> : <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#fff8d6] text-[#8a6500]"><Package className="h-4 w-4" /></div>}
                  {/* Item info */}
                  <div className="flex-1 min-w-0">
                    <p className="mb-0.5 truncate text-xs font-semibold leading-snug text-[var(--dashboard-text)]">{item.productName}</p>
                    <p className="text-[10px] text-muted-foreground">{formatCurrency(item.unitPrice)} · {productsById.get(item.productId)?.unit || 'unit'}</p>
                  </div>
                  
                  {/* Quantity controls */}
                  <div className="flex h-9 shrink-0 items-center self-center overflow-hidden rounded-lg border border-[#dde1e7] bg-[#f8f9fb] shadow-sm dark:border-white/10 dark:bg-white/5">
                    <button
                      onClick={() => updateQty(item.productId, -1)}
                      className="flex h-full w-8 items-center justify-center text-muted-foreground transition-colors duration-75 hover:bg-[#eceff3] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40 dark:hover:bg-white/10"
                      title="Decrease quantity"
                      aria-label={`Reduce ${item.productName} quantity`}
                    >
                      <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </button>
                    <span className="flex h-full min-w-8 items-center justify-center border-x border-[#dde1e7] bg-white px-1 text-center text-xs font-bold tabular-nums dark:border-white/10 dark:bg-transparent" aria-live="polite">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQty(item.productId, 1)}
                      disabled={item.quantity >= (productsById.get(item.productId)?.stock ?? item.quantity)}
                      className="flex h-full w-8 items-center justify-center text-muted-foreground transition-colors duration-75 hover:bg-[#eceff3] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-35 dark:hover:bg-white/10"
                      title={item.quantity >= (productsById.get(item.productId)?.stock ?? item.quantity) ? 'Maximum available stock reached' : 'Increase quantity'}
                      aria-label={`Increase ${item.productName} quantity`}
                    >
                      <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </button>
                  </div>
                  
                  {/* Total & remove */}
                  <div className="flex min-w-[72px] flex-col items-end justify-between self-stretch">
                    <span className="text-xs font-bold tabular-nums text-[var(--dashboard-text)]">{formatCurrency(item.totalPrice)}</span>
                    <button
                      onClick={() => removeFromCart(item.productId)}
                      className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground transition-colors hover:text-destructive focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/30"
                      title="Remove item"
                      aria-label={`Remove ${item.productName} from basket`}
                    >
                      <Trash2 className="h-3 w-3" /> Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {checkoutOnly && cart.length > 0 && <div className="border-t border-[var(--dashboard-border)] bg-[#fafbfc] px-6 py-5 dark:bg-[#111111]"><div className="flex items-center justify-between"><span className="text-sm font-medium text-[var(--dashboard-muted)]">Items subtotal</span><span className="text-xl font-bold tracking-tight tabular-nums text-[var(--dashboard-text)]">{formatCurrency(subtotal)}</span></div><p className="mt-2 text-sm text-[var(--dashboard-muted)]">You can adjust quantities before completing payment.</p></div>}
        </div>

        {/* Payment panel */}
        {cart.length > 0 && !checkoutOpen && (
          <div className={cn('border-t bg-white p-4 dark:bg-[#191919]', checkoutOnly && 'md:col-start-2 md:row-start-2 md:border-l')}>
            <div className="mb-4 flex items-center justify-between text-sm">
              <span className="font-medium text-muted-foreground">Basket total</span>
              <span className="text-xl font-bold tabular-nums text-[var(--dashboard-text)]">{formatCurrency(subtotal)}</span>
            </div>
            <button onClick={openCheckout} disabled={!hasActiveShift} title={!hasActiveShift ? 'Start a shift before taking payment' : undefined} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#ffd60a] px-4 py-3 text-sm font-bold text-[#111113] transition-colors hover:bg-[#ffdf3a] disabled:cursor-not-allowed disabled:opacity-60">
              {hasActiveShift ? `Pay ${formatCurrency(subtotal)}` : 'Start shift to take payment'}
            </button>
          </div>
        )}

        {cart.length > 0 && checkoutOpen && (
          <div className={cn('min-h-0 flex-1 overflow-y-auto border-t border-[#eef0f3] bg-[#fafbfc] p-4 space-y-4 dark:bg-[#151515]', checkoutOnly && 'self-start rounded-2xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] p-6 shadow-[0_12px_36px_rgba(0,0,0,.12)] lg:col-start-2 lg:row-start-1')}>
            {checkoutOnly && <div className="border-b border-[var(--dashboard-border)] pb-5"><button onClick={() => router.push('/dashboard/pos')} className="text-sm font-semibold text-primary transition-colors hover:text-primary/80">← Back to POS</button><p className="mt-5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#ffd60a]">Payment</p><h2 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-[var(--dashboard-text)]">Complete this sale</h2><p className="mt-2 text-sm leading-6 text-[var(--dashboard-muted)]">Confirm the customer, total, and payment method.</p></div>}
            {/* Customer select */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-muted-foreground">Customer</label>
                <button
                  onClick={() => setShowNewCustomer(!showNewCustomer)}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  {showNewCustomer ? 'Cancel' : '+New'}
                </button>
              </div>
              {showNewCustomer ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Full name"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    className={cn(inputCls, 'text-xs h-8')}
                    disabled={creatingCustomer}
                  />
                  <input
                    type="tel"
                    placeholder="Phone (optional)"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    className={cn(inputCls, 'text-xs h-8')}
                    disabled={creatingCustomer}
                  />
                  <input
                    type="email"
                    placeholder="Email (optional)"
                    value={newCustomerEmail}
                    onChange={(e) => setNewCustomerEmail(e.target.value)}
                    className={cn(inputCls, 'text-xs h-8')}
                    disabled={creatingCustomer}
                  />
                  <button
                    onClick={handleCreateCustomer}
                    disabled={creatingCustomer || !newCustomerName.trim()}
                    className="w-full py-1.5 px-2 rounded text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {creatingCustomer ? 'Creating...' : 'Save Customer'}
                  </button>
                </div>
              ) : (
                <select
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className={cn(inputCls, 'text-sm')}
                >
                  <option value="">Walk-in Customer</option>
                  {availableCustomers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}{c.phone ? ` (${c.phone})` : ''}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Sale adjustments */}
            {(settings.taxEnabled || canDiscount) && <div className="space-y-2">
              {settings.taxEnabled && (
                <div className="flex items-center justify-between rounded-lg border border-[#dde3eb] bg-white px-3 py-2 text-xs dark:bg-[#1b1b1b]">
                  <span className="font-medium text-[var(--dashboard-text)]">{settings.taxName || 'Tax'} ({settings.taxRate.toFixed(1)}%)</span>
                  <span className="text-[var(--dashboard-muted)]">Included as configured</span>
                </div>
              )}
              {canDiscount && <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Discount</label>
                <div className="flex gap-2">
                  <select
                    value={discountType}
                    disabled={mpesaLocksBasket}
                    onChange={(e) => {
                      setDiscountType(e.target.value as 'fixed' | 'percentage')
                      setDiscount(0)
                    }}
                    className={cn(inputCls, 'h-9 w-28 text-xs')}
                  >
                    <option value="fixed">KES amount</option>
                    <option value="percentage">Percentage</option>
                  </select>
                  <input
                    type="number"
                    min="0"
                    max={discountType === 'percentage' ? 100 : subtotal + taxAmount}
                    placeholder={discountType === 'percentage' ? '0–100' : 'Enter amount'}
                    value={discount || ''}
                    disabled={mpesaLocksBasket}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    className={cn(inputCls, 'h-9 flex-1 text-xs')}
                  />
                </div>
              </div>}
            </div>}

            {/* Totals */}
            <div className="space-y-1.5 rounded-xl border border-[#dfe4eb] bg-white p-3 text-xs shadow-sm dark:bg-[#1b1b1b]">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="tabular-nums font-medium">{formatCurrency(subtotal)}</span>
              </div>
              {settings.taxEnabled && settings.showTaxOnReceipt && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{settings.taxName || 'Tax'} ({(settings.taxRate).toFixed(1)}%)</span>
                  <span className="tabular-nums font-medium text-amber-600">{formatCurrency(taxAmount)}</span>
                </div>
              )}
              {discountAmount > 0 && (
                <div className="flex justify-between">
                  <span>Discount {discountType === 'percentage' ? `(${discount.toFixed(1)}%)` : ''}</span>
                  <span className="tabular-nums">-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              {roundingAmount !== 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>M-Pesa rounding</span>
                  <span className="tabular-nums font-medium">{roundingAmount > 0 ? '+' : '−'}{formatCurrency(Math.abs(roundingAmount))}</span>
                </div>
              )}
              <div className="mt-2 flex justify-between border-t border-[#e8ebef] pt-2.5 text-sm font-bold dark:border-white/10">
                <span>Total due</span>
                <span className="tabular-nums text-base text-[#d92d20] dark:text-[#ff6b61]">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Payment method */}
            <div>
              <div className="mb-2 flex items-center justify-between"><label className="text-xs font-semibold text-[var(--dashboard-text)]">Payment method</label><span className="text-[10px] text-[var(--dashboard-muted)]">Use F3–F5 for a faster sale</span></div>
              <div className="grid gap-2 sm:grid-cols-3">
              {([
                { key: 'cash', label: 'Cash', description: 'Pay at the counter', shortcut: 'F3' },
                { key: 'mpesa', label: 'M-Pesa', description: 'Mobile money', shortcut: 'F4' },
                { key: 'card', label: 'Card', description: 'Visa or Mastercard', shortcut: 'F5' },
              ] as const)
                .filter(({ key }) => settings.paymentMethods.includes(key))
                .map(({ key, label, description, shortcut }) => (
                <button
                  key={key}
                  onClick={() => setPaymentMethod(key)}
                  disabled={mpesaLocksBasket && paymentMethod !== key}
                  aria-pressed={paymentMethod === key}
                  className={cn(
                    'group flex min-h-[92px] flex-col items-start justify-between rounded-xl border bg-white p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#1b1b1b]',
                    paymentMethod === key
                      ? key === 'mpesa'
                        ? 'border-[#24a148] bg-[#f1fbf4] text-[#176b31] ring-1 ring-[#24a148]/20 dark:bg-[#122318]'
                        : 'border-[#f1d66a] bg-[#fff7d6] text-[#9a6700] ring-1 ring-[#f1d66a] dark:border-[rgba(255,214,10,0.2)] dark:bg-[rgba(255,214,10,0.1)] dark:text-[#ffd60a] dark:ring-[rgba(255,214,10,0.2)]'
                      : 'border-[var(--dashboard-border)] text-[var(--dashboard-muted)] hover:border-[#cbd2dc] hover:bg-[#fafbfc] dark:hover:bg-white/5'
                  )}
                >
                  <span className="flex w-full items-center justify-between">
                    <span className={cn('flex h-8 min-w-8 items-center justify-center rounded-lg px-1.5', key === 'mpesa' ? 'bg-[#e1f5e6] text-[#24a148]' : key === 'card' ? 'bg-[#eef3ff] text-[#3157a6]' : 'bg-[#fff1c2] text-[#946d00]')}><PaymentBrand method={key} /></span>
                    <span className={cn('h-4 w-4 rounded-full border-2', paymentMethod === key ? 'border-current bg-current ring-2 ring-white ring-inset' : 'border-[#b8c0cc')} />
                  </span>
                  <span><span className="block text-sm font-bold text-[var(--dashboard-text)]">{label} <kbd className="ml-1 rounded border px-1 py-0.5 text-[9px] font-medium text-[var(--dashboard-muted)]">{shortcut}</kbd></span><span className="mt-0.5 block text-[11px] text-[var(--dashboard-muted)]">{description}</span></span>
                </button>
              ))}
              </div>
            </div>

            {paymentMethod === 'cash' && (
              <div className="rounded-xl border border-[#dfe4eb] bg-white p-3 dark:bg-[#1b1b1b]">
                <label className="mb-1.5 block text-xs font-semibold text-[var(--dashboard-text)]">Cash received (KES)</label>
                <input
                  type="number"
                  min={total}
                  step="0.01"
                  placeholder={formatCurrency(total).replace('KES', '').trim()}
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  className={inputCls}
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[total, ...[1000, 2000, 5000, 10000, 20000, 50000].filter((amount) => amount >= total)].filter((amount, index, values) => values.indexOf(amount) === index).slice(0, 5).map((amount) => (
                    <button key={amount} type="button" onClick={() => setAmountPaid(String(amount))} className="rounded-md border bg-background px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted">{amount === total ? 'Exact' : formatCurrency(amount)}</button>
                  ))}
                </div>
                {parseFloat(amountPaid || '0') >= total && (
                  <p className="mt-2 flex items-center justify-between rounded-lg bg-emerald-50 px-2.5 py-2 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                    <span>Change due</span><span className="tabular-nums">{formatCurrency(change)}</span>
                  </p>
                )}
              </div>
            )}

            {paymentMethod === 'mpesa' && (
              <div className="space-y-3 rounded-xl border border-[#b8e1c4] bg-[#f5fcf7] p-3 dark:border-emerald-900 dark:bg-emerald-950/20">
                <div className="flex items-start gap-2.5">
                  <span className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-[#dff5e5]"><Image src="/payment-logos/mpesa.svg" alt="" width={54} height={22} className="h-4 w-auto" /></span>
                  <div><p className="text-xs font-bold text-[#176b31] dark:text-emerald-300">Collect M-Pesa payment</p><p className="mt-0.5 text-[11px] leading-4 text-[#39734a] dark:text-emerald-400">The sale completes only after Safaricom confirms payment.</p></div>
                </div>
                <div className="grid grid-cols-2 rounded-lg bg-[#e7f6eb] p-1 dark:bg-emerald-950/40">
                  <button type="button" onClick={() => { if (!mpesaLocksBasket) setMpesaFlow('stk') }} disabled={mpesaLocksBasket && mpesaFlow !== 'stk'} className={cn('rounded-md px-2 py-1.5 text-[11px] font-semibold transition-colors', mpesaFlow === 'stk' ? 'bg-white text-[#176b31] shadow-sm dark:bg-[#1d3022] dark:text-emerald-300' : 'text-[#39734a] disabled:opacity-50')}>Send phone prompt</button>
                  <button type="button" onClick={() => { if (!mpesaLocksBasket) setMpesaFlow('paybill') }} disabled={mpesaLocksBasket && mpesaFlow !== 'paybill'} className={cn('rounded-md px-2 py-1.5 text-[11px] font-semibold transition-colors', mpesaFlow === 'paybill' ? 'bg-white text-[#176b31] shadow-sm dark:bg-[#1d3022] dark:text-emerald-300' : 'text-[#39734a] disabled:opacity-50')}>Customer uses PayBill</button>
                </div>
                {mpesaFlow === 'stk' ? <div>
                  <label className="mb-1.5 block text-xs font-semibold text-[var(--dashboard-text)]">Customer phone number</label>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="e.g. 0712 345 678"
                      value={mpesaPhone}
                      onChange={(event) => setMpesaPhone(event.target.value)}
                      disabled={mpesaStatus === 'initiating' || mpesaStatus === 'pending' || mpesaStatus === 'success'}
                      className={cn(inputCls, 'h-10 flex-1 bg-white dark:bg-[#171717]')}
                    />
                    <button
                      type="button"
                      onClick={handleMpesaPrompt}
                      disabled={mpesaStatus === 'initiating' || mpesaStatus === 'pending' || mpesaStatus === 'success' || (requiresAgeVerification && !ageVerified)}
                      className="inline-flex min-w-[112px] items-center justify-center gap-2 rounded-lg bg-[#24a148] px-3 text-xs font-bold text-white transition-colors hover:bg-[#1d863c] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {(mpesaStatus === 'initiating' || mpesaStatus === 'pending') && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      {mpesaStatus === 'pending' ? 'Waiting…' : mpesaStatus === 'initiating' ? 'Sending…' : mpesaStatus === 'failed' || mpesaStatus === 'timeout' ? 'Try again' : mpesaStatus === 'success' ? 'Paid' : 'Send prompt'}
                    </button>
                  </div>
                </div> : <div className="space-y-2">
                  {!mpesaAccountReference || mpesaStatus === 'failed' || mpesaStatus === 'timeout' ? <button
                    type="button"
                    onClick={handlePaybillPayment}
                    disabled={mpesaStatus === 'initiating' || mpesaStatus === 'pending' || mpesaStatus === 'success' || (requiresAgeVerification && !ageVerified)}
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#24a148] px-3 text-xs font-bold text-white transition-colors hover:bg-[#1d863c] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {mpesaStatus === 'initiating' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {mpesaStatus === 'initiating' ? 'Preparing PayBill…' : 'Generate payment details'}
                  </button> : <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-emerald-200 bg-white p-2.5 dark:border-emerald-900 dark:bg-[#171717]"><span className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground">PayBill</span><strong className="mt-1 block text-base tabular-nums text-[var(--dashboard-text)]">{mpesaShortcode}</strong></div>
                    <div className="rounded-lg border border-emerald-200 bg-white p-2.5 dark:border-emerald-900 dark:bg-[#171717]"><span className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Account number</span><strong className="mt-1 block text-base tracking-wide text-[var(--dashboard-text)]">{mpesaAccountReference}</strong></div>
                    <p className="col-span-2 text-[11px] leading-4 text-[#39734a] dark:text-emerald-400">Ask the customer to pay exactly <strong>{formatCurrency(total)}</strong>. This screen updates automatically after confirmation.</p>
                  </div>}
                </div>}
                {requiresAgeVerification && !ageVerified && <p className="text-[11px] font-medium text-amber-700 dark:text-amber-300">Complete the age check before sending the payment prompt.</p>}
                {mpesaStatus !== 'idle' && <div className={cn(
                  'flex items-start gap-2 rounded-lg border px-2.5 py-2 text-[11px] font-medium',
                  mpesaStatus === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300' :
                  mpesaStatus === 'failed' || mpesaStatus === 'timeout' ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300' :
                  'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300'
                )} role="status" aria-live="polite">
                  {mpesaStatus === 'success' ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : mpesaStatus === 'failed' || mpesaStatus === 'timeout' ? <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin" />}
                  <span>{mpesaStatus === 'success' ? `Payment confirmed · ${mpesaRef}` : mpesaMessage}</span>
                </div>}
              </div>
            )}

            {paymentMethod === 'card' && (
              <div className="space-y-2">
                <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
                  <p className="text-xs font-medium text-amber-800">Confirm approval on the card terminal before completing this sale.</p>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Approval / terminal reference <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter terminal approval reference"
                    value={mpesaRef}
                    onChange={(event) => setMpesaRef(event.target.value.toUpperCase())}
                    className={inputCls}
                  />
                </div>
              </div>
            )}

            {requiresAgeVerification && (
              <button
                type="button"
                onClick={() => setShowAgeVerification(true)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-medium',
                  ageVerified
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300'
                    : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300'
                )}
              >
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span>{ageVerified ? 'Age check recorded for this sale' : 'Age check required before charging'}</span>
              </button>
            )}

            <button
              onClick={handleCheckout}
              disabled={processing || cart.length === 0 || !hasActiveShift || (paymentMethod === 'mpesa' && mpesaStatus !== 'success')}
              className={cn(
                'sticky bottom-0 flex w-full items-center justify-center gap-2 rounded-xl border border-transparent py-3.5 text-sm font-bold shadow-[0_8px_18px_rgba(0,0,0,.12)]',
                'bg-primary text-primary-foreground hover:bg-primary/90',
                'disabled:opacity-60 disabled:cursor-not-allowed transition-colors'
              )}
            >
              {processing ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  {!hasActiveShift ? 'Start shift to take payment' : paymentMethod === 'mpesa' && mpesaStatus !== 'success' ? 'Waiting for M-Pesa payment' : `Complete sale · ${formatCurrency(total)}`}
                </>
              )}
            </button>
          </div>
        )}
      </aside>

      {showAgeVerification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-labelledby="age-check-title">
          <div className="w-full max-w-md rounded-xl border border-[#e3dfd2] bg-white p-6 shadow-2xl dark:border-[#343434] dark:bg-[#1c1c1e]">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#fff8d6] text-[#5f4b00] dark:bg-[#292513] dark:text-[#ffdf45]"><ShieldCheck className="h-5 w-5" /></span>
            <h2 id="age-check-title" className="mt-4 text-lg font-bold text-[var(--dashboard-text)]">Verify customer age</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--dashboard-muted)]">Check a valid photo ID where required and confirm the customer meets the legal drinking age before completing this sale.</p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setShowAgeVerification(false)} className="min-h-10 rounded-lg border border-[var(--dashboard-border)] px-4 text-sm font-semibold text-[var(--dashboard-text)] hover:bg-[#f7f8fa] dark:hover:bg-white/5">Cancel</button>
              <button type="button" onClick={() => { setAgeVerified(true); setShowAgeVerification(false); if (paymentMethod !== 'mpesa' || mpesaStatus === 'success') void processCheckout(true) }} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#ffda32] px-4 text-sm font-bold text-[#050a1f] hover:bg-[#f0c900]"><ShieldCheck className="h-4 w-4" />Age verified — continue</button>
            </div>
          </div>
        </div>
      )}

      {showHeldSales && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-labelledby="held-sales-title">
          <div className="w-full max-w-md overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4"><div><h2 id="held-sales-title" className="font-bold">Held sales</h2><p className="mt-1 text-xs text-muted-foreground">Stored on this POS browser until resumed or cleared.</p></div><button type="button" onClick={() => setShowHeldSales(false)} className="rounded p-1 hover:bg-muted" aria-label="Close held sales"><X className="h-4 w-4" /></button></div>
            <div className="max-h-[55vh] overflow-y-auto p-3">
              {heldSales.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No held sales.</p> : <div className="space-y-2">{heldSales.map((heldSale) => <div key={heldSale.id} className="flex items-center justify-between gap-3 rounded-lg border p-3"><div><p className="text-sm font-semibold">{heldSale.cart.length} item{heldSale.cart.length === 1 ? '' : 's'} · {formatCurrency(heldSale.cart.reduce((sum, item) => sum + item.totalPrice, 0))}</p><p className="mt-1 text-xs text-muted-foreground">Held {new Date(heldSale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p></div><div className="flex gap-2"><button type="button" onClick={() => setHeldSales((previous) => previous.filter((sale) => sale.id !== heldSale.id))} className="rounded-md border px-2 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted">Discard</button><button type="button" onClick={() => resumeHeldSale(heldSale)} className="rounded-md bg-[#ffd60a] px-3 py-2 text-xs font-bold text-[#111113] hover:bg-[#ffdf3a]">Resume</button></div></div>)}</div>}
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
    </div>
  )
}
