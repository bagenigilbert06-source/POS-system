'use client'

import { CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const SETUP_ITEMS = [
  {
    id: 'products',
    title: 'Add your first products',
    description: 'Import or manually add your inventory',
  },
  {
    id: 'categories',
    title: 'Set up product categories',
    description: 'Organize your items for easier management',
  },
  {
    id: 'customers',
    title: 'Add customer information',
    description: 'Start tracking your customer base',
  },
  {
    id: 'settings',
    title: 'Configure business settings',
    description: 'Set tax rates, currency, and preferences',
  },
]

interface StepWorkspaceSetupProps {
  completed: string[]
  onToggle: (id: string) => void
}

export function StepWorkspaceSetup({ completed, onToggle }: StepWorkspaceSetupProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Almost there! Let&apos;s set up your workspace</h2>
        <p className="text-muted-foreground">You can complete these tasks now or skip and come back later</p>
      </div>

      <div className="space-y-3">
        {SETUP_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onToggle(item.id)}
            className={cn(
              'w-full p-4 rounded-lg border-2 transition-all duration-200 text-left',
              'hover:border-primary/50 hover:bg-primary/5',
              completed.includes(item.id)
                ? 'border-primary/30 bg-primary/5'
                : 'border-border'
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                'h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all',
                completed.includes(item.id)
                  ? 'border-primary bg-primary'
                  : 'border-border'
              )}>
                {completed.includes(item.id) && (
                  <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                )}
              </div>
              <div className="flex-1">
                <h3 className={cn(
                  'font-semibold text-sm transition-colors',
                  completed.includes(item.id)
                    ? 'text-muted-foreground line-through'
                    : 'text-foreground'
                )}>
                  {item.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
