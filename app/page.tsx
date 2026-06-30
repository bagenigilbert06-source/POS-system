import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { LandingNavbar } from '@/components/landing/navbar'
import { LandingHero } from '@/components/landing/hero'
import { WhoWeServe } from '@/components/landing/who-we-serve'
import { OutcomesFeatures } from '@/components/landing/outcomes-features'
import { ProductShowcase } from '@/components/landing/product-showcase'
import { TrustSignals } from '@/components/landing/trust-signals'
import { LandingTestimonials } from '@/components/landing/testimonials'
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
        <WhoWeServe />
        <OutcomesFeatures />
        <ProductShowcase />
        <TrustSignals />
        <LandingTestimonials />
        <LandingCTA />
      </main>
      <LandingFooter />
    </div>
  )
}
