'use client'

import { useEffect, useState } from 'react'
import { formatCurrency } from '@/lib/utils'
import { Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

type PaymentStatus = 'pending' | 'success' | 'failed' | 'timeout'

interface MpesaPaymentStatusProps {
  amount: number
  reference: string
  onStatusChange?: (status: PaymentStatus) => void
  autoRetry?: boolean
  timeoutSeconds?: number
}

export function MpesaPaymentStatus({
  amount,
  reference,
  onStatusChange,
  autoRetry = true,
  timeoutSeconds = 120,
}: MpesaPaymentStatusProps) {
  const [status, setStatus] = useState<PaymentStatus>('pending')
  const [timeLeft, setTimeLeft] = useState(timeoutSeconds)
  const [retryCount, setRetryCount] = useState(0)

  // Simulate payment polling - in production, this would call your backend API
  useEffect(() => {
    if (status !== 'pending') return

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [status])

  // Timeout handler
  useEffect(() => {
    if (timeLeft <= 0 && status === 'pending') {
      setStatus('timeout')
      onStatusChange?.('timeout')
    }
  }, [timeLeft, status, onStatusChange])

  const handleRetry = () => {
    setRetryCount(prev => prev + 1)
    setTimeLeft(timeoutSeconds)
    setStatus('pending')
  }

  const statusConfig = {
    pending: {
      icon: Loader2,
      title: 'Payment Pending',
      description: 'Waiting for M-Pesa confirmation',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
    },
    success: {
      icon: CheckCircle2,
      title: 'Payment Successful',
      description: 'Transaction completed',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
    },
    failed: {
      icon: XCircle,
      title: 'Payment Failed',
      description: 'Transaction could not be completed',
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
    },
    timeout: {
      icon: AlertCircle,
      title: 'Payment Timeout',
      description: 'No response received from M-Pesa',
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
    },
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <div className={cn('rounded-lg border p-6', config.bg, config.border)}>
      <div className="flex items-start gap-4">
        <div className={cn('mt-1', config.color)}>
          {status === 'pending' ? (
            <Icon className="h-6 w-6 animate-spin" />
          ) : (
            <Icon className="h-6 w-6" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className={cn('font-semibold', config.color)}>{config.title}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{config.description}</p>

          {/* Amount and reference */}
          <div className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-mono font-bold">{formatCurrency(amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Reference:</span>
              <span className="font-mono text-xs">{reference}</span>
            </div>
          </div>

          {/* Timeout countdown */}
          {status === 'pending' && (
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${(timeLeft / timeoutSeconds) * 100}%` }}
                />
              </div>
              <span className="text-xs font-mono text-muted-foreground">{timeLeft}s</span>
            </div>
          )}

          {/* Actions */}
          {(status === 'failed' || status === 'timeout') && (
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleRetry}
                disabled={retryCount >= 3}
                className={cn(
                  'flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-colors',
                  retryCount < 3
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                )}
              >
                Retry {retryCount > 0 && `(${retryCount}/3)`}
              </button>
              <button
                className="flex-1 px-4 py-2 rounded-lg border font-medium text-sm hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
