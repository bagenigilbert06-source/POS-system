import Image from 'next/image'
import { Check, Store } from 'lucide-react'
import { resolveFeedbackInvitation } from '@/lib/feedback/service'
import { FeedbackForm } from './feedback-form'

function FeedbackShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-6 font-sans text-slate-950 sm:grid sm:place-items-center sm:px-6 sm:py-12">
      <section className="mx-auto w-full max-w-[440px] overflow-hidden rounded-[24px] border border-slate-200/80 bg-white px-5 py-7 shadow-[0_18px_50px_rgba(15,23,42,0.07)] sm:px-9 sm:py-9">
        {children}
      </section>
    </main>
  )
}

function CompleteState({ already = false }: { already?: boolean }) {
  return (
    <FeedbackShell>
      <div
        className="flex min-h-[360px] flex-col items-center justify-center text-center"
        role="status"
        aria-live="polite"
      >
        <span className="grid size-12 place-items-center rounded-full bg-emerald-50 text-emerald-700">
          <Check className="size-6" strokeWidth={2.25} aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-[-0.025em] text-slate-950">
          {already ? 'Feedback already received' : 'Thank you'}
        </h1>
        <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">
          {already
            ? 'Thank you for sharing your experience.'
            : 'Your feedback has been received. It helps the team improve your experience.'}
        </p>
        <p className="mt-8 text-xs text-slate-400">
          You can now close this page.
        </p>
      </div>
    </FeedbackShell>
  )
}

function UnavailableState() {
  return (
    <FeedbackShell>
      <div
        className="flex min-h-[360px] flex-col items-center justify-center text-center"
        role="status"
      >
        <span className="grid size-12 place-items-center rounded-full bg-slate-100 text-slate-500">
          <Store className="size-5" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-xl font-semibold tracking-tight text-slate-950">
          Feedback link unavailable
        </h1>
        <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">
          This feedback link is no longer active. If you need assistance, please
          contact the store.
        </p>
      </div>
    </FeedbackShell>
  )
}

export default async function FeedbackPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const invitation = await resolveFeedbackInvitation(token)
  if (!invitation) return <UnavailableState />
  if (invitation.status === 'RESPONDED') return <CompleteState already />
  return (
    <FeedbackShell>
      <header className="text-center">
        <div className="mx-auto flex size-14 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {invitation.logoUrl ? (
            <Image
              src={invitation.logoUrl}
              alt={`${invitation.businessNameSnapshot} logo`}
              width={56}
              height={56}
              unoptimized
              className="size-full object-contain p-1.5"
              priority
            />
          ) : (
            <Store className="size-6 text-slate-700" aria-hidden="true" />
          )}
        </div>
        <p className="mt-4 text-[15px] font-semibold tracking-[-0.01em] text-slate-900">
          {invitation.businessNameSnapshot}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          {invitation.branchNameSnapshot}
        </p>
      </header>
      <FeedbackForm token={token} />
    </FeedbackShell>
  )
}
