'use client'

import { Loader2 } from 'lucide-react'
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
      className={cn('flex items-center pt-8 mt-8', showBack ? 'justify-between' : 'justify-end')}
      style={{
        borderTop: '1px solid #f3f4f6',
        fontFamily: 'var(--font-inter, Inter, sans-serif)',
      }}
    >
      {showBack && (
        <button
          onClick={onBack}
          disabled={backDisabled || loading}
          className="text-[14px] font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ color: '#6b7280' }}
        >
          Back
        </button>
      )}

      <button
        onClick={onNext}
        disabled={nextDisabled || loading}
        className={cn(
          'inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-[14px] font-semibold text-white transition-all duration-150',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          !showBack && 'ml-auto',
        )}
        style={{
          background: nextDisabled || loading ? '#9ca3af' : '#111827',
          minWidth: '120px',
          justifyContent: 'center',
        }}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {nextLabel}
      </button>
    </div>
  )
}
