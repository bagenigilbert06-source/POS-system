'use client'

import { Banknote, Smartphone, CreditCard } from 'lucide-react'
import { cn } from '@/lib/utils'

type PaymentMethod = 'cash' | 'mpesa' | 'card'

interface PaymentMethodSelectorProps {
  selected: PaymentMethod
  onChange: (method: PaymentMethod) => void
  availableMethods?: PaymentMethod[]
  disabled?: boolean
}

const methods: Record<PaymentMethod, { label: string; icon: any; color: string; description: string }> = {
  cash: {
    label: 'Cash',
    icon: Banknote,
    color: 'bg-amber-100 text-amber-700',
    description: 'Receive payment in cash',
  },
  mpesa: {
    label: 'M-Pesa',
    icon: Smartphone,
    color: 'bg-red-100 text-red-700',
    description: 'Mobile money payment',
  },
  card: {
    label: 'Card',
    icon: CreditCard,
    color: 'bg-blue-100 text-blue-700',
    description: 'Debit or credit card',
  },
}

export function PaymentMethodSelector({
  selected,
  onChange,
  availableMethods = ['cash', 'mpesa', 'card'],
  disabled = false,
}: PaymentMethodSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground block">Payment Method</label>
      <div className="grid gap-2 sm:grid-cols-3">
        {availableMethods.map((method) => {
          const config = methods[method]
          const Icon = config.icon
          const isSelected = selected === method

          return (
            <button
              key={method}
              onClick={() => onChange(method)}
              disabled={disabled}
              className={cn(
                'relative flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-muted hover:border-muted-foreground/30'
              )}
            >
              <div className={cn('p-2 rounded-lg', config.color)}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="text-center">
                <p className="text-xs font-bold">{config.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{config.description}</p>
              </div>
              {isSelected && (
                <div className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground font-bold">
                  ✓
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
