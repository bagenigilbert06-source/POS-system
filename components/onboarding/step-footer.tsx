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
    <div className="flex gap-4 mt-14 pt-8 border-t border-border">
      {showBack && (
        <button
          onClick={onBack}
          disabled={backDisabled || loading}
          className={cn(
            'flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold',
            'border border-border text-foreground bg-background',
            'hover:bg-secondary hover:border-primary/20 active:scale-95',
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
          'flex items-center justify-center gap-2 flex-1 px-8 py-3 rounded-lg text-sm font-semibold',
          'bg-primary text-primary-foreground',
          'hover:bg-primary/90 hover:shadow-lg active:scale-95',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'transition-all duration-200 shadow-md-soft'
        )}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {nextLabel}
      </button>
    </div>
  )
}
