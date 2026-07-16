'use client'

import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
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
    <div
      className={cn('mt-8 flex items-center border-t border-zinc-200 pt-6', showBack ? 'justify-between' : 'justify-end')}
    >
      {showBack && (
        <button
          onClick={onBack}
          disabled={backDisabled || loading}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e42527] disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </button>
      )}

      <button
        onClick={onNext}
        disabled={nextDisabled || loading}
        className={cn(
          'inline-flex min-h-11 min-w-[148px] items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-extrabold text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e42527] focus-visible:ring-offset-2',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          !showBack && 'ml-auto',
        )}
        style={{ background: nextDisabled || loading ? '#a1a1aa' : '#e42527' }}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {nextLabel}
        {!loading && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
      </button>
    </div>
  )
}
