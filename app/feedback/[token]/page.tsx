import { notFound } from 'next/navigation'
import { resolveFeedbackInvitation } from '@/lib/feedback/service'
import { FeedbackForm } from './feedback-form'

export default async function FeedbackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const invitation = await resolveFeedbackInvitation(token)
  if (!invitation) notFound()
  if (invitation.status === 'RESPONDED') return <main className="grid min-h-screen place-items-center bg-[#f7f8fa] p-6 text-center font-sans"><div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#b77900]">Pesaby feedback</p><h1 className="mt-4 text-2xl font-bold text-slate-950">Thank you</h1><p className="mt-2 text-sm leading-6 text-slate-500">We already received feedback for this visit.</p></div></main>
  return <main className="min-h-screen bg-[#f7f8fa] px-4 py-8 font-sans text-slate-950 sm:px-6 sm:py-14"><div className="mx-auto w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,.07)] sm:p-9"><header className="border-b border-slate-100 pb-6 text-center"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#b77900]">Powered by Pesaby</p><h1 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">{invitation.businessNameSnapshot}</h1><p className="mt-1 text-sm text-slate-500">{invitation.branchNameSnapshot}</p><p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-slate-500">Tell us how your visit went. Your feedback helps us improve every customer experience.</p></header><FeedbackForm token={token} businessName={invitation.businessNameSnapshot} /></div></main>
}
