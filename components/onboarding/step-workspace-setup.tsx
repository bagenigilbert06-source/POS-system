'use client'

import { CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { OnboardingHeader } from './onboarding-header'

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
    <div className="space-y-8">
      <OnboardingHeader
        title="Almost there! Let&apos;s set up your workspace"
        description="You can complete these tasks now or skip and come back later"
        centered={true}
      />

      <div className="space-y-3">
        {SETUP_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onToggle(item.id)}
            className={cn(
              'w-full group p-5 rounded-lg border-2 transition-all duration-300 text-left',
              'flex items-start gap-4',
              'hover:border-primary/30 hover:shadow-md-soft',
              completed.includes(item.id)
                ? 'border-primary/30 bg-primary/5'
                : 'border-border'
            )}
          >
            <div className={cn(
              'h-6 w-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 transition-all duration-300',
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
                'font-semibold text-sm transition-all duration-300',
                completed.includes(item.id)
                  ? 'text-muted-foreground line-through'
                  : 'text-foreground'
              )}>
                {item.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-2">{item.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
