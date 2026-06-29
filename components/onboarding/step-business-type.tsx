'use client';

import { ShoppingCart, UtensilsCrossed, Pill } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BUSINESS_TYPES } from '@/lib/types';

interface StepBusinessTypeProps {
  value: string;
  onChange: (value: string) => void;
}

export function StepBusinessType({ value, onChange }: StepBusinessTypeProps) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900">What type of business do you run?</h2>
        <p className="mt-2 text-lg text-gray-600">
          We&apos;ll customize IMARA POS for your specific needs
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {BUSINESS_TYPES.map((type) => {
          const iconMap: Record<string, React.ComponentType<any>> = {
            ShoppingCart,
            UtensilsCrossed,
            Pill,
          };
          const Icon = iconMap[type.icon] || ShoppingCart;

          return (
            <button
              key={type.id}
              onClick={() => onChange(type.id)}
              className={cn(
                'p-4 rounded-lg border-2 transition-all duration-200 text-left',
                'hover:border-primary/50 hover:bg-primary/5',
                value === type.id
                  ? 'border-primary bg-primary/10'
                  : 'border-border'
              )}
            >
              <div className="flex items-start gap-3">
                <Icon className={cn(
                  'h-6 w-6 mt-0.5 flex-shrink-0 transition-colors',
                  value === type.id ? 'text-primary' : 'text-muted-foreground'
                )} />
                <div>
                  <h3 className="font-semibold text-foreground text-sm">{type.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{type.description}</p>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
