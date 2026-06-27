import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { LandingNavbar } from '@/components/landing/navbar'
import { LandingHero } from '@/components/landing/hero'
import { LandingStats } from '@/components/landing/stats'
import { LandingFeatures } from '@/components/landing/features'
import { LandingIndustries } from '@/components/landing/industries'
import { LandingPricing } from '@/components/landing/pricing'
import { LandingFAQ } from '@/components/landing/faq'
import { LandingCTA } from '@/components/landing/cta'
import { LandingFooter } from '@/components/landing/footer'

export default async function RootPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-background">
      <LandingNavbar />
      <main>
        <LandingHero />
        <LandingStats />
        <LandingFeatures />
        <LandingIndustries />
        <LandingPricing />
        <LandingFAQ />
        <LandingCTA />
      </main>
      <LandingFooter />
    </div>
  )
}
