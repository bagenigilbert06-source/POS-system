import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { LandingNavbar } from '@/components/landing/navbar'
import { LandingHero } from '@/components/landing/hero'
import { TrustedBy } from '@/components/landing/trusted-by'
import { ProblemsSolved } from '@/components/landing/problems-solved'
import { BusinessTypesSection } from '@/components/landing/business-types-section'
import { ProductPreview } from '@/components/landing/product-preview'
import { WhyChooseImara } from '@/components/landing/why-choose-imara'
import { HowItWorks } from '@/components/landing/how-it-works'
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
        <TrustedBy />
        <ProblemsSolved />
        <BusinessTypesSection />
        <ProductPreview />
        <WhyChooseImara />
        <HowItWorks />
        <LandingTestimonials />
        <LandingCTA />
      </main>
      <LandingFooter />
    </div>
  )
}
