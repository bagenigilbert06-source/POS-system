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
    <div
      className={cn(
        'flex items-center pt-8 mt-10',
        showBack ? 'justify-between' : 'justify-end',
      )}
      style={{ borderTop: '1px solid #e2e8f0' }}
    >
      {showBack && (
        <button
          onClick={onBack}
          disabled={backDisabled || loading}
          className="inline-flex items-center gap-1.5 text-[14px] font-medium transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ color: backDisabled ? '#94a3b8' : '#475569' }}
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
      )}

      <button
        onClick={onNext}
        disabled={nextDisabled || loading}
        className={cn(
          'inline-flex items-center gap-2 px-7 py-2.5 rounded-lg text-[14px] font-semibold text-white transition-all duration-150',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          !showBack && 'ml-auto',
        )}
        style={{
          background: nextDisabled || loading ? '#93c5fd' : '#1a56db',
          boxShadow: nextDisabled || loading ? 'none' : '0 1px 4px rgba(26,86,219,0.3)',
        }}
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
