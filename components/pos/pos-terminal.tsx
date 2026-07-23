'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { createSale, type CartItem } from '@/app/actions/sales'
import { createCustomer } from '@/app/actions/customers'
import { formatCurrency } from '@/lib/utils'
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
} from 'lucide-react'
import type { Product, Customer } from '@/lib/db/schema'
import { toast } from 'sonner'

interface POSTerminalProps {
  products: Product[]
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
  }
}

interface ReceiptData {
  receiptNo: string
  items: CartItem[]
  subtotal: number
  taxAmount: number
  discountAmount: number
  total: number
  paymentMethod: string
  mpesaRef?: string
  change: number
}

export function POSTerminal({ products, customers, settings }: POSTerminalProps) {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [discount, setDiscount] = useState(0)
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
  const searchInputRef = useRef<HTMLInputElement>(null)
  const barcodeBufferRef = useRef<string>('')
  const barcodeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Get unique categories
  const categories = Array.from(new Set(products.filter(p => p.categoryId).map(p => p.categoryId))).filter(Boolean) as string[]
  
  // Detect barcode scanner input (USB scanners send Enter after barcode)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in other fields
      if (receipt || !searchInputRef.current) return
      
      if (e.key === 'Enter' && barcodeBufferRef.current) {
        e.preventDefault()
        const barcode = barcodeBufferRef.current
        barcodeBufferRef.current = ''
        
        // Find product by barcode
        const product = products.find(p => p.barcode === barcode && p.isActive)
        if (product) {
          addToCart(product)
          setSearch('')
        } else {
          toast.error('Product not found')
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
        }, 2000)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [products, receipt])

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

  const addToCart = useCallback((product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id)
      const price = parseFloat(product.sellingPrice)
      if (existing) {
        if (existing.quantity >= product.stock) {
          toast.error(`Only ${product.stock} ${product.unit} in stock`)
          return prev
        }
        return prev.map((i) =>
          i.productId === product.id
            ? { ...i, quantity: i.quantity + 1, totalPrice: (i.quantity + 1) * price }
            : i
        )
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          unitPrice: price,
          totalPrice: price,
        },
      ]
    })
  }, [])

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
  const discountAmount = Math.min(discount, subtotal + taxAmount)
  const total = subtotal + taxAmount - discountAmount
  const change = paymentMethod === 'cash' ? Math.max(0, parseFloat(amountPaid || '0') - total) : 0

  const handleCheckout = async () => {
    if (cart.length === 0) return toast.error('Cart is empty')
    if (paymentMethod === 'mpesa' && !mpesaRef) return toast.error('Enter M-Pesa reference number')
    if (paymentMethod === 'cash' && parseFloat(amountPaid || '0') < total) {
      return toast.error('Amount paid is less than total')
    }

    setProcessing(true)
    try {
      const { receiptNo, tax, total: returnedTotal } = await createSale({
        customerId: selectedCustomer || undefined,
        items: cart,
        subtotal,
        discountAmount,
        total,
        paymentMethod,
        mpesaRef: mpesaRef || undefined,
        amountReceived: paymentMethod === 'cash' ? parseFloat(amountPaid || '0') : undefined,
      })
      setReceipt({
        receiptNo,
        items: cart,
        subtotal,
        taxAmount: tax || taxAmount,
        discountAmount,
        total: returnedTotal || total,
        paymentMethod,
        mpesaRef: mpesaRef || undefined,
        change: paymentMethod === 'cash' ? (parseFloat(amountPaid || '0') - (returnedTotal || total)) : 0,
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to process sale')
    } finally {
      setProcessing(false)
    }
  }

  const handleNewSale = () => {
    setCart([])
    setDiscount(0)
    setMpesaRef('')
    setAmountPaid('')
    setSelectedCustomer('')
    setPaymentMethod('cash')
    setReceipt(null)
    setSearch('')
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
          <div className="border-t bg-muted/30 p-4 flex gap-2">
            <button
              onClick={() => window.print()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-input hover:bg-muted transition-colors text-sm font-medium"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
            <button
              onClick={handleNewSale}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-bold"
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
    <div className="flex min-h-[calc(100vh-8rem)] flex-col gap-4 lg:h-[calc(100vh-8rem)] lg:min-h-0 lg:flex-row">
      {/* Left: Product catalog */}
      <div className="flex min-h-[420px] min-w-0 flex-1 flex-col lg:min-h-0">
        {/* Search bar */}
        <div className="mb-3 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search by name, SKU or barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(inputCls, 'pl-9')}
            autoFocus
          />
        </div>
        
        {/* Category filter */}
        {categories.length > 0 && (
          <div className="mb-3 flex gap-1 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedCategory('')}
              className={cn(
                'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                !selectedCategory
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-secondary'
              )}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                  selectedCategory === cat
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-secondary'
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto">
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
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 pr-2">
              {filteredProducts.map((product) => {
                const inCart = cart.find((i) => i.productId === product.id)
                const outOfStock = product.stock === 0
                return (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    disabled={outOfStock}
                    className={cn(
                      'group relative flex flex-col rounded-lg border p-3 text-left transition-all',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      'hover:border-primary hover:shadow-sm hover:shadow-primary/10',
                      inCart
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                        : 'bg-card hover:bg-accent/20'
                    )}
                  >
                    {/* Stock badge */}
                    {product.stock <= product.minStock && product.stock > 0 && (
                      <div className="absolute top-1 right-1 text-[8px] font-bold rounded px-1.5 py-0.5 bg-amber-100 text-amber-800">Low</div>
                    )}
                    {outOfStock && (
                      <div className="absolute top-1 right-1 text-[8px] font-bold rounded px-1 py-0.5 bg-red-100 text-red-800">OOS</div>
                    )}
                    
                    {/* Product icon */}
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2">
                      <Package className="h-4 w-4" />
                    </div>
                    
                    {/* Product name */}
                    <p className="text-xs font-semibold leading-tight line-clamp-2 mb-1">
                      {product.name}
                    </p>
                    
                    {/* SKU if available */}
                    {product.sku && (
                      <p className="text-[9px] text-muted-foreground mb-1">SKU: {product.sku}</p>
                    )}
                    
                    {/* Price */}
                    <p className="text-sm font-bold text-primary mt-auto mb-1">
                      {formatCurrency(product.sellingPrice)}
                    </p>
                    
                    {/* Stock */}
                    <p className={cn('text-[10px]', outOfStock ? 'text-red-600 font-medium' : 'text-muted-foreground')}>
                      {product.stock} {product.unit} left
                    </p>
                    
                    {/* Cart badge */}
                    {inCart && (
                      <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-lg">
                        {inCart.quantity}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right: Cart + Payment */}
      <div className="flex min-h-[520px] w-full flex-shrink-0 flex-col rounded-xl border bg-card lg:min-h-0 lg:w-96 xl:w-[420px] shadow-sm">
        {/* Cart header */}
        <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/30">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold">Order Summary</span>
            {cart.length > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {cart.length}
              </span>
            )}
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

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12 px-4">
              <ShoppingCart className="h-12 w-12 text-muted-foreground/20 mb-3" />
              <p className="text-sm font-medium text-foreground">No items in cart</p>
              <p className="text-xs text-muted-foreground mt-1">Search and click products to add them</p>
            </div>
          ) : (
            <ul className="divide-y">
              {cart.map((item, idx) => (
                <li key={item.productId} className="flex gap-2 p-3 hover:bg-muted/40 transition-colors group">
                  {/* Item info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold leading-snug mb-0.5 truncate">{item.productName}</p>
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
        {cart.length > 0 && (
          <div className="border-t p-3 space-y-3 bg-muted/20">
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
              
              {/* Discount input */}
              <div>
                <input
                  type="number"
                  min="0"
                  max={subtotal + taxAmount}
                  placeholder="Discount"
                  value={discount || ''}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  className={cn(inputCls, 'text-xs h-9')}
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
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span>
                  <span className="tabular-nums font-medium">-{formatCurrency(discountAmount)}</span>
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
                {parseFloat(amountPaid || '0') >= total && (
                  <p className="mt-1 text-xs font-medium text-[hsl(var(--success))]">
                    Change: {formatCurrency(change)}
                  </p>
                )}
              </div>
            )}

            {paymentMethod === 'mpesa' && (
              <div className="space-y-1">
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
                <p className="text-[10px] text-amber-600 font-medium">Integration pending - Enter reference for manual verification</p>
              </div>
            )}
            
            {paymentMethod === 'card' && (
              <div>
                <p className="text-xs text-amber-600 font-medium">Card payment integration pending</p>
              </div>
            )}

            <button
              onClick={handleCheckout}
              disabled={processing || cart.length === 0}
              className={cn(
                'flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold',
                'bg-primary text-primary-foreground hover:bg-primary/90',
                'disabled:opacity-60 disabled:cursor-not-allowed transition-colors'
              )}
            >
              {processing ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Charge {formatCurrency(total)}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
