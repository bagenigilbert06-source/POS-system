import { SetupAccountForm } from '@/components/auth/setup-account-form'
import { PesabyLogoMark } from '@/components/brand/pesaby-logo'

export default async function SetupAccountPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const query = await searchParams
  return <main className="flex min-h-screen items-center justify-center bg-[#fff4e8] p-5"><section className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm"><PesabyLogoMark className="h-10 w-10" /><h1 className="mt-6 text-2xl font-extrabold">Set up your Pesaby account</h1><p className="mb-6 mt-2 text-sm text-muted-foreground">Choose a private password for your staff login.</p><SetupAccountForm token={query.token} invalid={Boolean(query.error)} /></section></main>
}
