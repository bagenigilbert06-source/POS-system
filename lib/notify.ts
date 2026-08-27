import type { ReactNode } from 'react'
import { toast as sonnerToast, type ExternalToast } from 'sonner'

type NoticeKind = 'success' | 'error' | 'warning' | 'info' | 'loading'
type NoticeOptions = ExternalToast
type NoticeMessage<T = unknown> = ReactNode | ((value: T) => ReactNode)

const durations: Record<Exclude<NoticeKind, 'loading'>, number> = {
  success: 3500,
  info: 4000,
  warning: 5000,
  error: 6000,
}

function noticeId(kind: NoticeKind, title: ReactNode, description: unknown) {
  if (typeof title !== 'string') return undefined
  const detail = typeof description === 'string' ? description : ''
  return `pesaby:${kind}:${title}:${detail}`
}

function optionsFor(kind: NoticeKind, title: ReactNode, options: NoticeOptions = {}) {
  return {
    ...options,
    id: options.id ?? noticeId(kind, title, options.description),
    duration: options.duration ?? (kind === 'loading' ? Infinity : durations[kind]),
  }
}

/** The single notification API for POS and back-office client experiences. */
export const notify = {
  success(title: ReactNode, options?: NoticeOptions) {
    return sonnerToast.success(title, optionsFor('success', title, options))
  },
  error(title: ReactNode, options?: NoticeOptions) {
    return sonnerToast.error(title, optionsFor('error', title, options))
  },
  warning(title: ReactNode, options?: NoticeOptions) {
    return sonnerToast.warning(title, optionsFor('warning', title, options))
  },
  info(title: ReactNode, options?: NoticeOptions) {
    return sonnerToast.info(title, optionsFor('info', title, options))
  },
  loading(title: ReactNode, options?: NoticeOptions) {
    return sonnerToast.loading(title, optionsFor('loading', title, options))
  },
  async track<T>(
    operation: Promise<T> | (() => Promise<T>),
    messages: {
      loading: ReactNode
      success: NoticeMessage<T>
      error: NoticeMessage<unknown>
      description?: ReactNode
    }
  ) {
    const id = sonnerToast.loading(messages.loading, {
      duration: Infinity,
      description: messages.description,
    })
    try {
      const result = await (typeof operation === 'function' ? operation() : operation)
      const title = typeof messages.success === 'function' ? messages.success(result) : messages.success
      sonnerToast.success(title, { id, duration: durations.success })
      return result
    } catch (error) {
      const title = typeof messages.error === 'function' ? messages.error(error) : messages.error
      sonnerToast.error(title, { id, duration: durations.error })
      throw error
    }
  },
  dismiss(id?: string | number) {
    return sonnerToast.dismiss(id)
  },
}

export type { NoticeOptions }
