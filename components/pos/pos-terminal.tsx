'use client'

import { useState, useCallback } from 'react'
import { createSale, type CartItem } from '@/app/actions/sales'
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
} from 'lucide-react'
import type { Product, Customer } from '@/lib/db/schema'
import { toast } from 'sonner'

interface POSTerminalProps {
  products: Product[]
  customers: Customer[]
}

const TAX_RATE = 0.16

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

export function POSTerminal({ products, customers }: POSTerminalProps) {
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [discount, setDiscount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa' | 'card'>('cash')
  const [mpesaRef, setMpesaRef] = useState('')
  const [amountPaid, setAmountPaid] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<string>('')
  const [processing, setProcessing] = useState(false)
  const [receipt, setReceipt] = useState<ReceiptData | null>(null)
  const [applyTax, setApplyTax] = useState(false)

  const filteredProducts = products.filter(
    (p) =>
      p.isActive &&
      p.stock > 0 &&
      (!search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.sku ?? '').toLowerCase().includes(search.toLowerCase()))
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
  const taxAmount = applyTax ? subtotal * TAX_RATE : 0
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
      const { receiptNo } = await createSale({
        customerId: selectedCustomer || undefined,
        items: cart,
        subtotal,
        taxAmount,
        discountAmount,
        total,
        paymentMethod,
        mpesaRef: mpesaRef || undefined,
      })
      setReceipt({
        receiptNo,
        items: cart,
        subtotal,
        taxAmount,
        discountAmount,
        total,
        paymentMethod,
        mpesaRef: mpesaRef || undefined,
        change,
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

  const inputCls = 'w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors'

  // Receipt overlay
  if (receipt) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-full max-w-sm rounded-xl border bg-card shadow-xl">
          <div className="border-b p-5 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--success)/0.1)]">
              <CheckCircle2 className="h-7 w-7 text-[hsl(var(--success))]" />
            </div>
            <h2 className="text-lg font-semibold">Sale Complete!</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Receipt #{receipt.receiptNo}</p>
          </div>

          <div className="p-5 space-y-3 print-receipt">
            {receipt.items.map((item) => (
              <div key={item.productId} className="flex justify-between text-sm">
                <span>{item.productName} × {item.quantity}</span>
                <span className="tabular-nums">{formatCurrency(item.totalPrice)}</span>
              </div>
            ))}
            <div className="border-t pt-3 space-y-1.5">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatCurrency(receipt.subtotal)}</span>
              </div>
              {receipt.taxAmount > 0 && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>VAT (16%)</span>
                  <span className="tabular-nums">{formatCurrency(receipt.taxAmount)}</span>
                </div>
              )}
              {receipt.discountAmount > 0 && (
                <div className="flex justify-between text-sm text-[hsl(var(--success))]">
                  <span>Discount</span>
                  <span className="tabular-nums">-{formatCurrency(receipt.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base border-t pt-2">
                <span>Total</span>
                <span className="tabular-nums">{formatCurrency(receipt.total)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground capitalize">
                <span>Payment</span>
                <span>{receipt.paymentMethod}{receipt.mpesaRef ? ` — ${receipt.mpesaRef}` : ''}</span>
              </div>
              {receipt.change > 0 && (
                <div className="flex justify-between text-sm font-medium text-[hsl(var(--success))]">
                  <span>Change</span>
                  <span className="tabular-nums">{formatCurrency(receipt.change)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="border-t p-4 flex gap-2">
            <button
              onClick={() => window.print()}
              className="flex-1 rounded-md border px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors"
            >
              Print Receipt
            </button>
            <button
              onClick={handleNewSale}
              className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              New Sale
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
        <div className="mb-3 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search products by name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(inputCls, 'pl-9')}
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <Package className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                {search ? 'No products match your search' : 'No active products with stock'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
              {filteredProducts.map((product) => {
                const inCart = cart.find((i) => i.productId === product.id)
                return (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className={cn(
                      'group relative flex flex-col rounded-lg border p-3 text-left transition-all',
                      'hover:border-primary hover:shadow-sm hover:shadow-primary/10',
                      inCart
                        ? 'border-primary/50 bg-primary/5'
                        : 'bg-card hover:bg-accent/20'
                    )}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2">
                      <Package className="h-4 w-4" />
                    </div>
                    <p className="text-xs font-semibold leading-tight line-clamp-2 mb-1">
                      {product.name}
                    </p>
                    <p className="text-sm font-bold text-primary mt-auto">
                      {formatCurrency(product.sellingPrice)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {product.stock} {product.unit} left
                    </p>
                    {inCart && (
                      <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
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
      <div className="flex min-h-[520px] w-full flex-shrink-0 flex-col rounded-xl border bg-card lg:min-h-0 lg:w-80 xl:w-96">
        {/* Cart header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Cart</span>
            {cart.length > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {cart.reduce((s, i) => s + i.quantity, 0)}
              </span>
            )}
          </div>
          {cart.length > 0 && (
            <button
              onClick={() => setCart([])}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12 px-4">
              <ShoppingCart className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Cart is empty</p>
              <p className="text-xs text-muted-foreground mt-1">Click a product to add it</p>
            </div>
          ) : (
            <ul className="divide-y px-3 py-2">
              {cart.map((item) => (
                <li key={item.productId} className="flex items-center gap-2 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium leading-tight truncate">{item.productName}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {formatCurrency(item.unitPrice)} each
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => updateQty(item.productId, -1)}
                      className="flex h-9 w-9 items-center justify-center rounded-md border hover:bg-secondary transition-colors"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold tabular-nums">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQty(item.productId, 1)}
                      className="flex h-9 w-9 items-center justify-center rounded-md border hover:bg-secondary transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="w-20 text-right text-xs font-semibold tabular-nums">
                      {formatCurrency(item.totalPrice)}
                    </span>
                    <button
                      onClick={() => removeFromCart(item.productId)}
                      className="ml-1 rounded p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Payment panel */}
        {cart.length > 0 && (
          <div className="border-t p-4 space-y-3">
            {/* Customer select */}
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className={inputCls}
            >
              <option value="">Walk-in customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.phone ? ` — ${c.phone}` : ''}</option>
              ))}
            </select>

            {/* Tax toggle */}
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <div
                onClick={() => setApplyTax(!applyTax)}
                className={cn(
                  'relative h-5 w-9 rounded-full transition-colors cursor-pointer',
                  applyTax ? 'bg-primary' : 'bg-muted-foreground/30'
                )}
              >
                <div className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform', applyTax ? 'translate-x-4' : 'translate-x-0.5')} />
              </div>
              Apply VAT (16%)
            </label>

            {/* Discount */}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Discount (KES)</label>
              <input
                type="number"
                min="0"
                max={subtotal}
                placeholder="0.00"
                value={discount || ''}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                className={inputCls}
              />
            </div>

            {/* Totals */}
            <div className="rounded-lg bg-muted/50 p-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatCurrency(subtotal)}</span>
              </div>
              {applyTax && (
                <div className="flex justify-between text-muted-foreground">
                  <span>VAT (16%)</span>
                  <span className="tabular-nums">{formatCurrency(taxAmount)}</span>
                </div>
              )}
              {discountAmount > 0 && (
                <div className="flex justify-between text-[hsl(var(--success))]">
                  <span>Discount</span>
                  <span className="tabular-nums">-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base border-t pt-2">
                <span>Total</span>
                <span className="tabular-nums text-primary">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Payment method */}
            <div className="grid grid-cols-3 gap-1.5">
              {([
                { key: 'cash', icon: Banknote, label: 'Cash' },
                { key: 'mpesa', icon: Smartphone, label: 'M-Pesa' },
                { key: 'card', icon: CreditCard, label: 'Card' },
              ] as const).map(({ key, icon: Icon, label }) => (
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
