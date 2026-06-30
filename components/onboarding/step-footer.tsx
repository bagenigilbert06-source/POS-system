'use client'

import { ChevronLeft, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StepFooterProps {
  onBack: () => void
  onNext: () => void
  backDisabled?: boolean
  nextDisabled?: boolean
  loading?: boolean
  nextLabel?: string
  showBack?: boolean
}

export function StepFooter({
  onBack,
  onNext,
  backDisabled = false,
  nextDisabled = false,
  loading = false,
  nextLabel = 'Continue',
  showBack = true,
}: StepFooterProps) {
  return (
    <div className="flex gap-3 mt-12">
      {showBack && (
        <button
          onClick={onBack}
          disabled={backDisabled || loading}
          className={cn(
            'flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold',
            'border border-border text-foreground bg-card',
            'hover:bg-muted hover:border-border/70 active:bg-muted/80',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-all duration-200'
          )}
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
      )}
      <button
        onClick={onNext}
        disabled={nextDisabled || loading}
        className={cn(
          'flex items-center justify-center gap-2 flex-1 px-6 py-3 rounded-lg text-sm font-semibold',
          'bg-primary text-primary-foreground',
          'hover:bg-primary/90 active:bg-primary/80',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'transition-all duration-200 shadow-md'
        )}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {nextLabel}
      </button>
    </div>
  )
}
