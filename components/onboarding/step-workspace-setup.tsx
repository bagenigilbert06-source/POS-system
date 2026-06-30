'use client'

import { CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PremiumStepHeader } from './premium-step-header'

const SETUP_ITEMS = [
  {
    id: 'products',
    title: 'Add your first products',
    description: 'Import or manually add your inventory to get started',
  },
  {
    id: 'categories',
    title: 'Set up product categories',
    description: 'Organize your items for easier management and discovery',
  },
  {
    id: 'customers',
    title: 'Add customer information',
    description: 'Start tracking and managing your customer base',
  },
  {
    id: 'settings',
    title: 'Configure business settings',
    description: 'Set tax rates, currency, language, and preferences',
  },
]

interface StepWorkspaceSetupProps {
  completed: string[]
  onToggle: (id: string) => void
  stepNumber?: number
  totalSteps?: number
}

export function StepWorkspaceSetup({
  completed,
  onToggle,
  stepNumber = 6,
  totalSteps = 7,
}: StepWorkspaceSetupProps) {
  return (
    <div className="space-y-12">
      <PremiumStepHeader
        stepNumber={stepNumber}
        totalSteps={totalSteps}
        title="Almost there! Let's set up your workspace"
        description="You can complete these tasks now or skip and come back later"
      />

      <div className="space-y-4">
        {SETUP_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onToggle(item.id)}
            className={cn(
              'w-full group p-6 rounded-lg transition-all duration-200 text-left',
              'flex items-start gap-4',
              'border border-border hover:border-primary/30 hover:shadow-md-soft hover:-translate-y-0.5',
              completed.includes(item.id)
                ? 'bg-primary/5 border-primary/30'
                : 'bg-card'
            )}
          >
            <div className={cn(
              'h-6 w-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-200',
              completed.includes(item.id)
                ? 'border-primary bg-primary shadow-md-soft'
                : 'border-border group-hover:border-primary/50'
            )}>
              {completed.includes(item.id) && (
                <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
              )}
            </div>
            <div className="flex-1">
              <h3 className={cn(
                'font-semibold text-sm transition-all duration-200',
                completed.includes(item.id)
                  ? 'text-muted-foreground line-through'
                  : 'text-foreground'
              )}>
                {item.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="rounded-lg bg-primary/5 border border-primary/20 p-6 space-y-3">
        <p className="text-sm font-semibold text-foreground">Pro Tip</p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          You don't need to complete all these tasks right now. Your workspace is ready to use, and you can set these up anytime from your dashboard settings.
        </p>
      </div>
    </div>
  )
}
