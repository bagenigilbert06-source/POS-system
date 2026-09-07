import { notFound } from 'next/navigation'
import { resolveFeedbackInvitation } from '@/lib/feedback/service'
import { FeedbackForm } from './feedback-form'

export default async function FeedbackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const invitation = await resolveFeedbackInvitation(token)
  if (!invitation) notFound()
  if (invitation.status === 'RESPONDED') return <main className="mx-auto grid min-h-screen max-w-md place-items-center p-6 text-center"><div><p className="text-sm font-semibold text-muted-500">Powered by Pesaby</p><h1 className="mt-4 text-2xl font-bold">Thank you</h1><p className="mt-2 text-sm text-muted-foreground">We already received feedback for this visit.</p></div></main>
  return <main className="mx-auto min-h-screen max-w-md px-5 py-10"><p className="text-center text-xs font-semibold tracking-wide text-muted-foreground">POWERED BY PESABY</p><h1 className="mt-6 text-center text-2xl font-bold">{invitation.businessNameSnapshot}</h1><p className="mt-1 text-center text-sm text-muted-foreground">{invitation.branchNameSnapshot}</p><FeedbackForm token={token} businessName={invitation.businessNameSnapshot} /></main>
}
