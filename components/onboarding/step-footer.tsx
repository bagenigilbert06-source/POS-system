'use client'

import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
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
    <div className={cn('flex gap-3 mt-10 pt-6 border-t border-border', showBack ? 'justify-between' : 'justify-end')}>
      {showBack && (
        <button
          onClick={onBack}
          disabled={backDisabled || loading}
          className={cn(
            'inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-medium',
            'border border-border text-foreground bg-background',
            'hover:bg-muted transition-colors duration-150',
            'disabled:opacity-40 disabled:cursor-not-allowed',
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
          'inline-flex items-center gap-1.5 px-6 py-2.5 rounded-lg text-sm font-semibold',
          'bg-primary text-primary-foreground',
          'hover:bg-primary/90 transition-colors duration-150',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          'shadow-sm',
          !showBack && 'ml-auto',
        )}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : null}
        {nextLabel}
        {!loading && <ChevronRight className="h-4 w-4" />}
      </button>
    </div>
  )
}
