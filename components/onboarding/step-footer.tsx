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
      className={cn('mt-8 flex items-center pt-6', showBack ? 'justify-between' : 'justify-end')}
      style={{
        borderTop: '1px solid #e5e7eb',
      }}
    >
      {showBack && (
        <button
          onClick={onBack}
          disabled={backDisabled || loading}
          className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-[14px] font-semibold text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </button>
      )}

      <button
        onClick={onNext}
        disabled={nextDisabled || loading}
        className={cn(
          'inline-flex items-center gap-2 rounded-md px-6 py-3 text-[14px] font-extrabold text-white transition-all duration-150',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          !showBack && 'ml-auto',
        )}
        style={{
          background: nextDisabled || loading ? '#9ca3af' : '#005a43',
          boxShadow: nextDisabled || loading ? 'none' : '0 12px 24px rgba(0, 90, 67, 0.18)',
          minWidth: '132px',
          justifyContent: 'center',
        }}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {nextLabel}
        {!loading && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
      </button>
    </div>
  )
}
