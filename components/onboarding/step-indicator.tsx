'use client'

interface StepIndicatorProps {
  currentStep: number
  totalSteps: number
  stepTitle: string
  isComplete?: boolean
}

const STEP_LABELS = [
  'Business Type',
  'Category',
  'Details',
  'Location',
  'Team Size',
]

export function StepIndicator({
  currentStep,
  totalSteps,
  stepTitle,
  isComplete = false,
}: StepIndicatorProps) {
  return (
    <div className="mb-10">
      {/* Horizontal step track — Zoho / Odoo style */}
      <div className="flex items-center gap-0 mb-6">
        {Array.from({ length: totalSteps }).map((_, i) => {
          const done   = isComplete || i < currentStep
          const active = !isComplete && i === currentStep
          const label  = STEP_LABELS[i] ?? `Step ${i + 1}`

          return (
            <div key={i} className="flex items-center flex-1 min-w-0">
              {/* Circle */}
              <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                <div
                  className="h-8 w-8 rounded-full flex items-center justify-center text-[12px] font-semibold transition-all duration-200"
                  style={
                    done
                      ? { background: '#1a56db', color: '#fff' }
                      : active
                      ? { background: '#fff', color: '#1a56db', outline: '2px solid #1a56db', outlineOffset: '1px' }
                      : { background: '#e2e8f0', color: '#94a3b8' }
                  }
                >
                  {done ? (
                    <svg viewBox="0 0 10 10" fill="none" className="h-3.5 w-3.5">
                      <path d="M2 5l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <span
                  className="hidden sm:block text-[10px] font-medium whitespace-nowrap tracking-wide"
                  style={{ color: active ? '#1a56db' : done ? '#475569' : '#94a3b8' }}
                >
                  {label}
                </span>
              </div>

              {/* Connector line (skip after last) */}
              {i < totalSteps - 1 && (
                <div
                  className="flex-1 h-px mx-2 transition-all duration-300"
                  style={{ background: i < currentStep ? '#1a56db' : '#e2e8f0' }}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Contextual label */}
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: '#94a3b8' }}>
        Step {currentStep + 1} of {totalSteps}
      </p>
    </div>
  )
}
