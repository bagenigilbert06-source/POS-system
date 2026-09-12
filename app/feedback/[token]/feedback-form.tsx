'use client'

import { useState } from 'react'
import { Check, Loader2, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { submitPublicFeedback } from './actions'

const POSITIVE_TAGS = [
  'Friendly service',
  'Fast checkout',
  'Staff helpfulness',
  'Product availability',
]
const IMPROVEMENT_TAGS = [
  'Waiting time',
  'Product availability',
  'Staff helpfulness',
  'Pricing',
  'Other',
]
const ratingMessages: Record<number, string> = {
  1: "We're sorry your experience wasn't ideal. Tell us what happened so the team can improve.",
  2: "We're sorry your experience wasn't ideal. Tell us what happened so the team can improve.",
  3: 'Thanks for your feedback. What could we improve?',
  4: 'Thanks! Anything we could make even better?',
  5: "Excellent — we're glad you had a great experience.",
}

export function FeedbackForm({ token }: { token: string }) {
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [busy, setBusy] = useState(false)
  const [completion, setCompletion] = useState<'sent' | 'already' | null>(null)
  const [error, setError] = useState('')
  const [commentLength, setCommentLength] = useState(0)

  if (completion)
    return (
      <div
        className="flex min-h-[330px] flex-col items-center justify-center text-center"
        role="status"
        aria-live="polite"
      >
        <span className="grid size-12 place-items-center rounded-full bg-emerald-50 text-emerald-700">
          <Check className="size-6" strokeWidth={2.25} aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-[-0.025em] text-slate-950">
          {completion === 'already' ? 'Feedback already received' : 'Thank you'}
        </h1>
        <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">
          {completion === 'already'
            ? 'Thank you for sharing your experience.'
            : 'Your feedback has been received. It helps the team improve your experience.'}
        </p>
        <p className="mt-8 text-xs text-slate-400">
          You can now close this page.
        </p>
      </div>
    )

  const visibleRating = hoveredRating || rating
  const tags = rating >= 4 ? POSITIVE_TAGS : IMPROVEMENT_TAGS

  return (
    <form
      className="mt-8"
      onSubmit={async (event) => {
        event.preventDefault()
        if (!rating || busy) return
        setBusy(true)
        setError('')
        try {
          const result = await submitPublicFeedback(
            token,
            new FormData(event.currentTarget)
          )
          setCompletion(result.alreadySubmitted ? 'already' : 'sent')
        } catch {
          setError(
            'We could not send your feedback. Please check your connection and try again.'
          )
        } finally {
          setBusy(false)
        }
      }}
    >
      <fieldset className="text-center">
        <legend className="w-full text-[26px] font-semibold leading-tight tracking-[-0.035em] text-slate-950">
          How was your experience?
        </legend>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          We’d love to hear how your visit went.
        </p>
        <div
          className="mt-6 flex items-center justify-center gap-1"
          onMouseLeave={() => setHoveredRating(0)}
        >
          {Array.from({ length: 5 }, (_, index) => {
            const value = index + 1
            const selected = value <= visibleRating
            return (
              <label
                key={value}
                className="group grid size-12 cursor-pointer place-items-center rounded-xl"
              >
                <input
                  required
                  className="peer sr-only"
                  type="radio"
                  name="rating"
                  value={value}
                  checked={rating === value}
                  onChange={() => setRating(value)}
                  aria-label={`${value} ${value === 1 ? 'star' : 'stars'}`}
                />
                <Star
                  onMouseEnter={() => setHoveredRating(value)}
                  className={cn(
                    'size-8 transition duration-150 motion-reduce:transition-none peer-focus-visible:scale-110',
                    selected
                      ? 'fill-blue-600 text-blue-600'
                      : 'fill-transparent text-slate-300 group-hover:text-blue-400'
                  )}
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              </label>
            )
          })}
        </div>
      </fieldset>
      {rating > 0 && (
        <div className="mt-6 animate-in fade-in slide-in-from-top-1 duration-200 motion-reduce:animate-none">
          <p
            className="text-center text-sm leading-6 text-slate-600"
            aria-live="polite"
          >
            {ratingMessages[rating]}
          </p>
          <fieldset className="mt-5">
            <legend className="text-sm font-medium text-slate-800">
              What stood out?
            </legend>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <label key={tag} className="cursor-pointer">
                  <input
                    className="peer sr-only"
                    type="checkbox"
                    name="tags"
                    value={tag}
                  />
                  <span className="inline-flex min-h-9 items-center rounded-full border border-slate-200 px-3 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 peer-checked:border-blue-600 peer-checked:bg-blue-50 peer-checked:text-blue-700 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue-600">
                    {tag}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="mt-5 block text-sm font-medium text-slate-800">
            Anything you’d like us to know?
            <textarea
              name="comment"
              maxLength={1000}
              rows={3}
              onChange={(event) =>
                setCommentLength(event.currentTarget.value.length)
              }
              className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-normal text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
              placeholder="Share a short comment (optional)"
            />
            <span className="mt-1.5 block text-right text-[11px] font-normal tabular-nums text-slate-400">
              {commentLength}/1000
            </span>
          </label>
          {error && (
            <p
              id="feedback-error"
              role="alert"
              className="mt-3 text-sm leading-5 text-red-600"
            >
              {error}
            </p>
          )}
          <Button
            type="submit"
            disabled={busy}
            aria-describedby={error ? 'feedback-error' : undefined}
            className="mt-4 h-12 w-full rounded-xl bg-blue-600 text-[15px] font-semibold text-white shadow-none hover:bg-blue-700 focus-visible:ring-blue-600 disabled:bg-slate-200 disabled:text-slate-500"
          >
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Sending feedback
              </>
            ) : (
              'Send feedback'
            )}
          </Button>
        </div>
      )}
      <p className="mt-6 text-center text-[11px] leading-5 text-slate-400">
        Your feedback is shared with this business to help improve service.
      </p>
    </form>
  )
}
