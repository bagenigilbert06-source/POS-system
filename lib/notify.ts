import { createElement, type ReactNode } from 'react'
import { toast as hotToast, type ToastOptions } from 'react-hot-toast'

type NoticeKind = 'success' | 'error' | 'warning' | 'info' | 'loading'
type NoticeAction = { label: ReactNode; onClick: () => void }
type NoticeOptions = Omit<ToastOptions, 'id'> & {
  id?: string | number
  description?: ReactNode
  action?: NoticeAction
  cancel?: NoticeAction
}
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

function content(title: ReactNode, options: NoticeOptions, id?: string) {
  const actionButton = (action: NoticeAction | undefined, className: string) =>
    action
      ? createElement(
          'button',
          {
            type: 'button',
            className,
            onClick: () => {
              action.onClick()
              if (id) hotToast.dismiss(id)
            },
          },
          action.label
        )
      : null

  return createElement(
    'div',
    { className: 'pesaby-hot-toast-content' },
    createElement('div', { className: 'pesaby-hot-toast-title' }, title),
    options.description
      ? createElement('div', { className: 'pesaby-hot-toast-description' }, options.description)
      : null,
    options.action || options.cancel
      ? createElement(
          'div',
          { className: 'pesaby-hot-toast-actions' },
          actionButton(options.cancel, 'pesaby-hot-toast-action pesaby-hot-toast-action-secondary'),
          actionButton(options.action, 'pesaby-hot-toast-action pesaby-hot-toast-action-primary')
        )
      : null
  )
}

function prepare(kind: NoticeKind, title: ReactNode, options: NoticeOptions = {}) {
  const { description: _description, action: _action, cancel: _cancel, id: rawId, ...toastOptions } = options
  const id = String(rawId ?? noticeId(kind, title, options.description) ?? '') || undefined
  return {
    message: content(title, options, id),
    options: {
      ...toastOptions,
      id,
      duration: toastOptions.duration ?? (kind === 'loading' ? Infinity : durations[kind]),
      className: `pesaby-hot-toast pesaby-hot-toast-${kind}${toastOptions.className ? ` ${toastOptions.className}` : ''}`,
    } satisfies ToastOptions,
  }
}

/** The single notification API for POS and back-office client experiences. */
export const notify = {
  success(title: ReactNode, options: NoticeOptions = {}) {
    const prepared = prepare('success', title, options)
    return hotToast.success(prepared.message, prepared.options)
  },
  error(title: ReactNode, options: NoticeOptions = {}) {
    const prepared = prepare('error', title, options)
    return hotToast.error(prepared.message, prepared.options)
  },
  warning(title: ReactNode, options: NoticeOptions = {}) {
    const prepared = prepare('warning', title, options)
    return hotToast(prepared.message, { ...prepared.options, icon: '!' })
  },
  info(title: ReactNode, options: NoticeOptions = {}) {
    const prepared = prepare('info', title, options)
    return hotToast(prepared.message, { ...prepared.options, icon: 'i' })
  },
  loading(title: ReactNode, options: NoticeOptions = {}) {
    const prepared = prepare('loading', title, options)
    return hotToast.loading(prepared.message, prepared.options)
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
    const id = notify.loading(messages.loading, { description: messages.description })
    try {
      const result = await (typeof operation === 'function' ? operation() : operation)
      const title = typeof messages.success === 'function' ? messages.success(result) : messages.success
      notify.success(title, { id, description: messages.description })
      return result
    } catch (error) {
      const title = typeof messages.error === 'function' ? messages.error(error) : messages.error
      notify.error(title, { id, description: messages.description })
      throw error
    }
  },
  dismiss(id?: string | number) {
    return hotToast.dismiss(id === undefined ? undefined : String(id))
  },
}

export type { NoticeOptions }
