import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { LandingNavbar } from '@/components/landing/navbar'
import { DepartmentSuite } from '@/components/landing/department-suite'
import { PlatformSuite } from '@/components/landing/platform-suite'
import { LandingFooter } from '@/components/landing/footer'

export const metadata = {
  title: 'Features | Pesaby - Business OS for African Commerce',
  description: 'Explore all of Pesaby\'s features designed for African businesses',
}

export default async function FeaturesPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-background">
      <LandingNavbar />
      <main>
        <section className="border-b border-slate-200 bg-white px-5 pb-16 pt-24 sm:pb-20 sm:pt-28">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#e42527]">Pesaby product overview</p>
            <h1 className="mt-4 text-4xl font-bold tracking-[-0.04em] text-slate-950 sm:text-6xl">One workspace for the work that keeps business moving.</h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">Connect checkout, stock, payments, people, customers, and reporting in one clear operating system built for growing teams.</p>
          </div>
        </section>
        <DepartmentSuite />
        <PlatformSuite />
      </main>
      <LandingFooter />
    </div>
  )
}
