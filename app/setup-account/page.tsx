import Link from 'next/link'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { SetupAccountForm } from '@/components/auth/setup-account-form'
import { PesabyLogoMark } from '@/components/brand/pesaby-logo'
import { getStaffInvitationContext } from '@/app/actions/staff-invitation-actions'

const states: Record<string, [string, string]> = {
  EXPIRED: ['This invitation has expired.', 'Ask your administrator to send you a new invitation.'],
  REVOKED: ['This invitation is no longer available.', 'Contact your administrator if you still need access.'],
  SUPERSEDED: ['A newer invitation was sent.', 'Use the most recent invitation email to continue.'],
  ACCEPTED: ['Invitation already accepted.', 'This invitation has already been used.'],
  DEACTIVATED: ['Account activation unavailable.', 'Contact your administrator for assistance.'],
  INVALID: ["This invitation isn't valid.", 'Check that you opened the complete link from your invitation email.'],
}

function readableRole(role?: string) {
  return role?.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ') || 'Team member'
}

export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string; error?: string; activation?: string }> }) {
  const query = await searchParams
  if (query.activation === 'success') {
    return <Shell><div className="py-10 text-center"><p className="text-sm font-semibold text-emerald-700">You&apos;re all set</p><h1 className="mt-2 text-2xl font-semibold tracking-tight">Welcome to Pesaby</h1><p className="mt-2 text-sm text-muted-foreground">Taking you to your workspace…</p><Link className="mt-6 inline-flex text-sm font-medium text-primary underline underline-offset-4" href="/auth/continue">Open Pesaby</Link></div></Shell>
  }

  const context = query.token ? await getStaffInvitationContext(query.token) : null
  const state = query.error ? 'INVALID' : context?.valid ? undefined : context?.state ?? 'INVALID'
  if (state) {
    const [title, description] = states[state] ?? states.INVALID
    return <Shell><div className="py-10 text-center"><h1 className="text-2xl font-semibold tracking-tight">{title}</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>{state === 'ACCEPTED' && <Link className="mt-6 inline-flex text-sm font-medium text-primary underline underline-offset-4" href="/auth/continue">Go to Pesaby</Link>}</div></Shell>
  }

  const session = await auth.api.getSession({ headers: await headers() })
  const signedInForInvitation = Boolean(session?.user?.email && context?.email && session.user.email.toLowerCase() === context.email.toLowerCase())
  return <Shell>
    <div className="mt-8 space-y-6">
      <header>
        <h1 className="text-[25px] font-semibold leading-tight tracking-[-0.02em] text-slate-950">Join {context?.organizationName}</h1>
        <p className="mt-2 text-sm leading-5 text-muted-foreground">You&apos;ve been invited to join the team.</p>
      </header>
      <div className="rounded-xl bg-slate-50 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[.12em] text-slate-500">Your invitation</p>
        <p className="text-base font-semibold text-slate-950">{context?.employeeName}</p>
        <p className="mt-1 text-sm text-slate-600">{readableRole(context?.roleName)}{context?.branchName ? ` · ${context.branchName}` : ''}</p>
        <p className="mt-2 break-all text-sm text-slate-500">{context?.email}</p>
      </div>
      <SetupAccountForm token={query.token} existingAccount={context?.existingAccount} signedInForInvitation={signedInForInvitation} awaitingVerification={context?.state === 'AWAITING_EMAIL_VERIFICATION'} email={context?.email} businessName={context?.organizationName} />
    </div>
  </Shell>
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5] px-4 py-8 sm:px-6"><section role="dialog" aria-modal="true" aria-label="Employee invitation" className="w-full max-w-[460px] rounded-2xl border border-slate-200 bg-white px-6 py-7 shadow-[0_20px_55px_rgba(15,23,42,0.10)] sm:px-9 sm:py-8"><div className="flex items-center gap-3 border-b border-slate-100 pb-5"><PesabyLogoMark/><div><p className="text-base font-semibold tracking-tight text-slate-950">Pesaby</p><p className="text-[10px] font-semibold tracking-[.14em] text-slate-500">EMPLOYEE INVITATION</p></div></div>{children}</section></main>
}
