'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Image from 'next/image'
import { createSale, type CartItem } from '@/app/actions/sales'
import { createCustomer } from '@/app/actions/customers'
import { formatCurrency, normalizeBarcode } from '@/lib/utils'
import { cn } from '@/lib/utils'
import {
  Search,
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
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import type { Product, Customer, Sale, SaleItem } from '@/lib/db/schema'
import { toast } from 'sonner'
import { RefundDialog } from './refund-dialog'
import { ReceiptReprint } from './receipt-reprint'
import { SalesHistoryModal } from './sales-history-modal'

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
}

interface ReceiptData {
  saleId: string
  receiptNo: string
  items: CartItem[]
  subtotal: number
  taxAmount: number
  discountAmount: number
  total: number
  paymentMethod: string
  mpesaRef?: string
  change: number
  idempotencyKey: string
  ageVerified: boolean
  completedAt: Date
}

function createIdempotencyKey() {
  return crypto.randomUUID()
}

export function POSTerminal({ products, categories, customers, settings, requiresAgeVerification = false }: POSTerminalProps) {
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
  const [amountPaid, setAmountPaid] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<string>('')
  const [processing, setProcessing] = useState(false)
  const [receipt, setReceipt] = useState<ReceiptData | null>(null)
  const [applyTax, setApplyTax] = useState(settings.taxEnabled)
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [newCustomerEmail, setNewCustomerEmail] = useState('')
  const [creatingCustomer, setCreatingCustomer] = useState(false)
  const [availableCustomers, setAvailableCustomers] = useState(customers || [])
  const [showRefundDialog, setShowRefundDialog] = useState(false)
  const [showReceiptReprint, setShowReceiptReprint] = useState(false)
  const [showSalesHistory, setShowSalesHistory] = useState(false)
  const [refundSale, setRefundSale] = useState<(Sale & { items: SaleItem[] }) | null>(null)
  const [ageVerified, setAgeVerified] = useState(false)
  const [showAgeVerification, setShowAgeVerification] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [scanMessage, setScanMessage] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const barcodeBufferRef = useRef<string>('')
  const barcodeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastScanRef = useRef<{ barcode: string; at: number } | null>(null)
  const checkoutIdempotencyKeyRef = useRef<string>('')

  useEffect(() => {
    window.localStorage.setItem('pos-active-cart', JSON.stringify(cart))
  }, [cart])

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && checkoutOpen) {
        setCheckoutOpen(false)
        return
      }
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && cart.length > 0 && !receipt) {
        event.preventDefault()
        setCheckoutOpen(true)
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [cart.length, checkoutOpen, receipt])

  const addToCart = useCallback((product: Product) => {
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
  }, [])

  const SCANNER_INACTIVITY_MS = 450
  
  const availableCategories = categories.filter((category) => products.some((product) => product.categoryId === category.id))
  
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
        const product = products.find(p => normalizeBarcode(p.barcode ?? '') === barcode && p.isActive)
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
  }, [products, receipt, processing, checkoutOpen, addToCart])

  const filteredProducts = products.filter(
    (p) =>
      p.isActive &&
      p.stock > 0 &&
      (!selectedCategory || p.categoryId === selectedCategory) &&
      (!search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.sku ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (p.barcode ?? '').toLowerCase().includes(search.toLowerCase()))
  )

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.productId !== productId) return i
          const newQty = i.quantity + delta
          if (newQty <= 0) return null
          const product = products.find((p) => p.id === productId)
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
    setCart((prev) => prev.filter((i) => i.productId !== productId))
  }

  const subtotal = cart.reduce((sum, i) => sum + i.totalPrice, 0)
  const TAX_RATE = settings.taxEnabled ? settings.taxRate / 100 : 0
  const taxAmount = applyTax && settings.taxEnabled ? subtotal * TAX_RATE : 0
  
  // Calculate discount based on type
  let discountAmount = 0
  if (discountType === 'percentage') {
    discountAmount = Math.min((discount / 100) * (subtotal + taxAmount), subtotal + taxAmount)
  } else {
    discountAmount = Math.min(discount, subtotal + taxAmount)
  }
  
  const total = subtotal + taxAmount - discountAmount
  const change = paymentMethod === 'cash' ? Math.max(0, parseFloat(amountPaid || '0') - total) : 0

  const processCheckout = async (verified = ageVerified) => {
    if (cart.length === 0) return toast.error('Cart is empty')
    if (paymentMethod === 'mpesa' && !mpesaRef) return toast.error('Enter M-Pesa reference number')
    if (paymentMethod === 'cash' && parseFloat(amountPaid || '0') < total) {
      return toast.error('Amount paid is less than total')
    }

    // Check for low stock items
    const lowStockItems = cart.filter(item => {
      const product = products.find(p => p.id === item.productId)
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
      const { saleId, receiptNo, tax, total: returnedTotal } = await createSale({
        customerId: selectedCustomer || undefined,
        items: cart,
        subtotal,
        discountAmount,
        total,
        paymentMethod,
        mpesaRef: mpesaRef || undefined,
        amountReceived: paymentMethod === 'cash' ? parseFloat(amountPaid || '0') : undefined,
        idempotencyKey: checkoutIdempotencyKeyRef.current,
        ageVerified: requiresAgeVerification ? verified : undefined,
      })
      setReceipt({
        saleId,
        receiptNo,
        items: cart,
        subtotal,
        taxAmount: tax || taxAmount,
        discountAmount,
        total: returnedTotal || total,
        paymentMethod,
        mpesaRef: mpesaRef || undefined,
        change: paymentMethod === 'cash' ? (parseFloat(amountPaid || '0') - (returnedTotal || total)) : 0,
        idempotencyKey: checkoutIdempotencyKeyRef.current,
        ageVerified: requiresAgeVerification ? verified : false,
        completedAt: new Date(),
      })
      
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
    if (requiresAgeVerification && !ageVerified) {
      setShowAgeVerification(true)
      return
    }
    void processCheckout()
  }

  const handleNewSale = () => {
    setCart([])
    setDiscount(0)
    setMpesaRef('')
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
        id: `${receipt.receiptNo}-${item.productId}`,
        saleId: receipt.saleId,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toString(),
        totalPrice: item.totalPrice.toString(),
        userId: '',
        orgId: '',
        createdAt: receipt.completedAt,
        updatedAt: receipt.completedAt,
      })),
    }

    return (
      <>
        <RefundDialog
          sale={saleWithItems}
          onClose={() => setShowRefundDialog(false)}
          onSuccess={() => {
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
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-xl rounded-xl bg-white shadow-2xl overflow-hidden">
          {/* Success header */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-b p-4 text-center">
            <p className="text-sm font-semibold text-foreground">{settings.receiptBusinessName}</p>
            {settings.receiptPhone && <p className="text-xs text-muted-foreground">{settings.receiptPhone}</p>}
            {settings.receiptAddress && <p className="text-xs text-muted-foreground">{settings.receiptAddress}</p>}
            <div className="mx-auto mb-2 mt-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Sale Complete</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Receipt #{receipt.receiptNo}</p>
          </div>

          {/* Receipt content */}
          <div className="max-h-[50vh] overflow-y-auto p-6">
            {/* Items */}
            <div className="mb-4 space-y-2 border-b pb-4">
              {receipt.items.map((item) => (
                <div key={item.productId} className="flex justify-between text-sm">
                  <div className="flex-1">
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(item.unitPrice)} × {item.quantity}</p>
                  </div>
                  <p className="font-semibold tabular-nums">{formatCurrency(item.totalPrice)}</p>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="space-y-2 rounded-lg bg-muted/40 p-3 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatCurrency(receipt.subtotal)}</span>
              </div>
              {receipt.taxAmount > 0 && settings.showTaxOnReceipt && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{settings.taxName || 'Tax'}</span>
                  <span className="tabular-nums">{formatCurrency(receipt.taxAmount)}</span>
                </div>
              )}
              {receipt.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Discount</span>
                  <span className="tabular-nums">-{formatCurrency(receipt.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold border-t pt-2">
                <span>Total Amount</span>
                <span className="tabular-nums text-primary">{formatCurrency(receipt.total)}</span>
              </div>
            </div>

            {/* Payment info */}
            <div className="mt-4 rounded-lg border p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment Method</span>
                <span className="font-semibold capitalize">{receipt.paymentMethod}</span>
              </div>
              {receipt.mpesaRef && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">M-Pesa Reference</span>
                  <span className="font-mono">{receipt.mpesaRef}</span>
                </div>
              )}
              {receipt.change > 0 && (
                <div className="flex justify-between font-medium text-emerald-600">
                  <span>Change Due</span>
                  <span className="tabular-nums">{formatCurrency(receipt.change)}</span>
                </div>
              )}
            </div>
            
            {/* Receipt footer */}
            {settings.receiptFooter && (
              <div className="mt-4 pt-4 border-t text-center">
                <p className="text-xs text-muted-foreground">{settings.receiptFooter}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="border-t bg-muted/30 p-4 flex gap-2 flex-wrap">
            <button
              onClick={() => window.print()}
              className="flex-1 min-w-[100px] flex items-center justify-center gap-2 py-2.5 rounded-lg border border-input hover:bg-muted transition-colors text-sm font-medium"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
            <button
              onClick={() => setShowRefundDialog(true)}
              className="flex-1 min-w-[100px] flex items-center justify-center gap-2 py-2.5 rounded-lg border border-destructive text-destructive hover:bg-destructive/10 transition-colors text-sm font-medium"
            >
              <RotateCcw className="h-4 w-4" />
              Refund
            </button>
            <button
              onClick={handleNewSale}
              className="flex-1 min-w-[100px] flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-bold"
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
    <div className="grid min-h-[calc(100vh-10.5rem)] gap-5 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-stretch">
      {/* Left: Product catalog */}
      <section className="flex min-h-[520px] min-w-0 flex-col overflow-hidden rounded-xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] shadow-[0_1px_3px_rgba(16,24,40,.05)]">
        <div className="border-b border-[var(--dashboard-border)] px-4 py-4 sm:px-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[var(--dashboard-text)]">Shop products</h2>
                <Sparkles className="h-4 w-4 text-[#e6b800]" />
              </div>
              <p className="mt-0.5 text-xs text-[var(--dashboard-muted)]">Tap a product to add it to this sale.</p>
            </div>
            <span className="rounded-md bg-[#fff8d6] px-2 py-1 text-xs font-semibold text-[#5f4b00] dark:bg-[#292513] dark:text-[#ffdf45]">{filteredProducts.length} available</span>
          </div>
          <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search by name, SKU or barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              const barcode = normalizeBarcode(search)
              const match = products.find((product) => product.isActive && normalizeBarcode(product.barcode ?? '') === barcode)
              if (match) { e.preventDefault(); addToCart(match); setSearch(''); setScanMessage(`${match.name} added — quantity updated.`) }
            }}
            className={cn(inputCls, 'h-11 border-[#d9dde5] bg-white pl-10 dark:bg-[#171717]')}
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
                  ? 'border-[#e6c31d] bg-[#ffda32] text-[#050a1f]'
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
                    ? 'border-[#e6c31d] bg-[#ffda32] text-[#050a1f]'
                    : 'border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] text-[var(--dashboard-muted)] hover:bg-[#f7f8fa] dark:hover:bg-white/5'
                )}
              >
                {category.name}
              </button>
            ))}
          </div>
        )}

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto bg-[#fafaf8] p-4 dark:bg-[#101010] sm:p-5">
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
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    disabled={outOfStock}
                    className={cn(
                      'group relative flex min-h-[240px] flex-col overflow-hidden rounded-xl border border-[#e5e7eb] bg-white text-left shadow-[0_1px_2px_rgba(16,24,40,.03)] transition-all duration-200 dark:border-[#303030] dark:bg-[#191919]',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      'hover:border-[#d5bd42] dark:hover:bg-[#211e12]',
                      inCart
                        ? 'border-[#d5bd42] bg-[#fff8d6] ring-1 ring-[#e6c31d]/30 dark:bg-[#292513]'
                        : ''
                    )}
                  >
                    {/* Stock badge */}
                    {product.stock <= product.minStock && product.stock > 0 && (
                      <div className="absolute top-1 right-1 text-[8px] font-bold rounded px-1.5 py-0.5 bg-amber-100 text-amber-800">Low</div>
                    )}
                    {outOfStock && (
                      <div className="absolute top-1 right-1 text-[8px] font-bold rounded px-1 py-0.5 bg-red-100 text-red-800">OOS</div>
                    )}
                    
                    {/* Product image or icon */}
                    {product.imageUrl ? (
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        width={320}
                        height={128}
                        unoptimized
                        className="h-32 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-32 w-full items-center justify-center bg-gradient-to-br from-[#fff7d3] via-[#f7f8fa] to-[#e9edf5] text-[#667085] dark:from-[#292513] dark:via-[#252525] dark:to-[#1b1b1b] dark:text-[#a7a7a7]">
                        <Package className="h-9 w-9" />
                      </div>
                    )}
                    <div className="flex flex-1 flex-col p-3.5">
                      <p className="mb-1 text-sm font-semibold leading-tight line-clamp-2 text-[var(--dashboard-text)]">{product.name}</p>
                      {(product.volume || product.unit) && <p className="text-[11px] text-muted-foreground">{product.volume ? `${product.volume} ${product.volumeUnit || ''}` : ''}{product.volume && product.unit ? ' · ' : ''}{product.unit}</p>}
                      {product.sku && <p className="text-[10px] text-muted-foreground">{product.sku}</p>}
                      <div className="mt-auto flex items-end justify-between gap-2 pt-3">
                        <p className="text-base font-bold text-[var(--dashboard-text)]">{formatCurrency(product.sellingPrice)}</p>
                        <p className={cn('text-[10px]', outOfStock ? 'text-red-600 font-medium' : 'text-muted-foreground')}>{product.stock} {product.unit}</p>
                      </div>
                    </div>
                    
                    {/* Cart badge */}
                    {inCart && (
                      <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#ffda32] text-xs font-bold text-[#050a1f] shadow-sm">
                        {inCart.quantity}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* Right: Cart + Payment */}
      <aside className="flex min-h-[520px] w-full flex-col overflow-y-auto rounded-xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] shadow-[0_1px_3px_rgba(16,24,40,.06)] lg:sticky lg:top-5 lg:max-h-[calc(100vh-7rem)]">
        {/* Cart header with quick actions */}
        <div className="border-b border-[var(--dashboard-border)] bg-[#fffdf7] p-4 dark:bg-[#191817] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#ffda32] text-[#050a1f]"><ShoppingCart className="h-4 w-4" /></span>
              <div><span className="block text-sm font-bold text-[var(--dashboard-text)]">{checkoutOpen ? 'Checkout' : 'Your basket'}</span><span className="block text-[11px] text-[var(--dashboard-muted)]">{cart.length ? `${cart.length} product${cart.length === 1 ? '' : 's'} selected` : 'Start a new sale'}</span></div>
            </div>
            {cart.length > 0 && (
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
          
          {/* Quick action buttons */}
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
        </div>

        {/* Cart items */}
        <div className="min-h-[220px] flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12 px-4">
              <ShoppingCart className="mb-3 h-11 w-11 text-[#d9dde5] dark:text-[#3a3a3a]" />
              <p className="text-sm font-semibold text-[var(--dashboard-text)]">Your basket is empty</p>
              <p className="mt-1 max-w-[220px] text-xs leading-5 text-[var(--dashboard-muted)]">Select products from the catalog to build this sale.</p>
            </div>
          ) : (
            <ul className="divide-y">
              {cart.map((item, idx) => (
                <li key={item.productId} className="flex gap-2 p-3 hover:bg-muted/40 group">
                  {products.find((product) => product.id === item.productId)?.imageUrl ? <Image src={products.find((product) => product.id === item.productId)?.imageUrl ?? ''} alt="" width={40} height={40} unoptimized className="h-10 w-10 shrink-0 rounded-md object-cover" /> : <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#fff8d6] text-[#8a6500]"><Package className="h-4 w-4" /></div>}
                  {/* Item info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold leading-snug mb-0.5 truncate">{item.productName}</p>
                    <p className="text-[10px] text-muted-foreground">{products.find((product) => product.id === item.productId)?.unit || 'unit'}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xs text-muted-foreground tabular-nums">{formatCurrency(item.unitPrice)}</span>
                      <span className="text-[9px] text-muted-foreground">× {item.quantity}</span>
                    </div>
                  </div>
                  
                  {/* Quantity controls */}
                  <div className="flex items-center gap-1 bg-muted/50 rounded px-1">
                    <button
                      onClick={() => updateQty(item.productId, -1)}
                      className="p-1 hover:bg-muted transition-colors rounded"
                      title="Decrease quantity"
                    >
                      <Minus className="h-3 w-3 text-muted-foreground" />
                    </button>
                    <span className="w-6 text-center text-xs font-semibold">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQty(item.productId, 1)}
                      className="p-1 hover:bg-muted transition-colors rounded"
                      title="Increase quantity"
                    >
                      <Plus className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </div>
                  
                  {/* Total & remove */}
                  <div className="flex flex-col items-end justify-between">
                    <span className="text-xs font-bold tabular-nums">{formatCurrency(item.totalPrice)}</span>
                    <button
                      onClick={() => removeFromCart(item.productId)}
                      className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                      title="Remove item"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Payment panel */}
        {cart.length > 0 && !checkoutOpen && (
          <div className="border-t bg-white p-4 dark:bg-[#191919]">
            <div className="mb-4 flex items-center justify-between text-sm">
              <span className="font-medium text-muted-foreground">Basket total</span>
              <span className="text-xl font-bold tabular-nums text-[var(--dashboard-text)]">{formatCurrency(subtotal)}</span>
            </div>
            <button onClick={() => setCheckoutOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#ffda32] px-4 py-3 text-sm font-bold text-[#050a1f] transition-colors hover:bg-[#f0c900]">
              Pay {formatCurrency(subtotal)} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {cart.length > 0 && checkoutOpen && (
          <div className="border-t p-3 space-y-3 bg-muted/20">
            <button onClick={() => setCheckoutOpen(false)} className="text-xs font-semibold text-muted-foreground hover:text-foreground">← Back to basket</button>
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

            {/* Tax and Discount controls */}
            <div className="grid grid-cols-2 gap-2">
              {/* Tax toggle */}
              {settings.taxEnabled && (
                <label className="flex items-center gap-2 p-2 rounded border border-input cursor-pointer hover:bg-muted/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={applyTax}
                    onChange={(e) => setApplyTax(e.target.checked)}
                    className="h-4 w-4 rounded"
                  />
                  <span className="text-xs font-medium">Add {settings.taxName || 'Tax'} ({(settings.taxRate).toFixed(1)}%)</span>
                </label>
              )}
              
              {/* Discount input with type selector */}
              <div className="flex gap-2">
                <select
                  value={discountType}
                  onChange={(e) => {
                    setDiscountType(e.target.value as 'fixed' | 'percentage')
                    setDiscount(0)
                  }}
                  className={cn(inputCls, 'text-xs h-9 w-24')}
                >
                  <option value="fixed">Fixed (KES)</option>
                  <option value="percentage">Percent (%)</option>
                </select>
                <input
                  type="number"
                  min="0"
                  max={discountType === 'percentage' ? 100 : subtotal + taxAmount}
                  placeholder={discountType === 'percentage' ? '0-100%' : 'Amount'}
                  value={discount || ''}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  className={cn(inputCls, 'text-xs h-9 flex-1')}
                />
              </div>
            </div>

            {/* Totals */}
            <div className="rounded-lg bg-background border border-border p-2.5 space-y-1 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="tabular-nums font-medium">{formatCurrency(subtotal)}</span>
              </div>
              {applyTax && settings.showTaxOnReceipt && (
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
              <div className="flex justify-between font-bold text-sm border-t border-border pt-1.5 mt-1">
                <span>Total Amount</span>
                <span className="tabular-nums text-primary text-base">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Payment method */}
            <div className={cn('grid gap-1.5', settings.paymentMethods.length === 3 ? 'grid-cols-3' : settings.paymentMethods.length === 2 ? 'grid-cols-2' : 'grid-cols-1')}>
              {([
                { key: 'cash', icon: Banknote, label: 'Cash' },
                { key: 'mpesa', icon: Smartphone, label: 'M-Pesa' },
                { key: 'card', icon: CreditCard, label: 'Card' },
              ] as const)
                .filter(({ key }) => settings.paymentMethods.includes(key))
                .map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  onClick={() => setPaymentMethod(key)}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-lg border py-2 text-xs font-medium transition-colors',
                    paymentMethod === key
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'hover:bg-secondary text-muted-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>

            {paymentMethod === 'cash' && (
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Amount Received (KES)</label>
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
                  {[total, 500, 1000, 2000, 5000].filter((amount, index, values) => amount >= total && values.indexOf(amount) === index).slice(0, 4).map((amount) => (
                    <button key={amount} type="button" onClick={() => setAmountPaid(String(amount))} className="rounded-md border bg-background px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted">{amount === total ? 'Exact' : formatCurrency(amount)}</button>
                  ))}
                </div>
                {parseFloat(amountPaid || '0') >= total && (
                  <p className="mt-1 text-xs font-medium text-[hsl(var(--success))]">
                    Change: {formatCurrency(change)}
                  </p>
                )}
              </div>
            )}

            {paymentMethod === 'mpesa' && (
              <div className="space-y-2">
                <div className="flex gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200">
                  <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 font-medium">Integration pending - Enter reference for manual verification</p>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    M-Pesa Reference <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. QGH4X8MNPA"
                    value={mpesaRef}
                    onChange={(e) => setMpesaRef(e.target.value.toUpperCase())}
                    className={inputCls}
                  />
                </div>
              </div>
            )}
            
            {paymentMethod === 'card' && (
              <div className="flex gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 font-medium">Card payment integration pending</p>
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
              disabled={processing || cart.length === 0}
              className={cn(
                'sticky bottom-0 flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold shadow-[0_-6px_14px_rgba(255,255,255,.85)]',
                'bg-primary text-primary-foreground hover:bg-primary/90',
                'disabled:opacity-60 disabled:cursor-not-allowed transition-colors'
              )}
            >
              {processing ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Pay {formatCurrency(total)}
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
              <button type="button" onClick={() => { setAgeVerified(true); setShowAgeVerification(false); void processCheckout(true) }} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#ffda32] px-4 text-sm font-bold text-[#050a1f] hover:bg-[#f0c900]"><ShieldCheck className="h-4 w-4" />Age verified — continue</button>
            </div>
          </div>
        </div>
      )}

      {/* Sales History Modal */}
      {showSalesHistory && (
        <SalesHistoryModal
          onClose={() => setShowSalesHistory(false)}
          onSelectSale={(sale) => {
            setRefundSale(sale)
            setShowSalesHistory(false)
          }}
        />
      )}

      {/* Receipt Reprint Modal */}
      {showReceiptReprint && (
        <ReceiptReprint
          onClose={() => setShowReceiptReprint(false)}
          settings={settings}
          onRefund={(sale) => {
            setRefundSale(sale)
            setShowReceiptReprint(false)
          }}
        />
      )}

      {/* Refund Dialog (from sales history or receipt reprint) */}
      {refundSale && (
        <RefundDialog
          sale={refundSale}
          onClose={() => setRefundSale(null)}
          onSuccess={() => {
            setRefundSale(null)
            toast.success('Refund processed successfully')
          }}
        />
      )}
    </div>
  )
}
