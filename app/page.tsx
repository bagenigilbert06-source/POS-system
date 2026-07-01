import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { AnnouncementBanner } from '@/components/landing/announcement-banner'
import { LandingNavbar } from '@/components/landing/navbar'
import { LandingHero } from '@/components/landing/hero'
import { DashboardPreviewSection } from '@/components/landing/dashboard-preview'
import { LandingStats } from '@/components/landing/stats'
import { LandingFeatures } from '@/components/landing/features'
import { LandingIndustries } from '@/components/landing/industries'
import { LandingWhyImara } from '@/components/landing/why-imara'
import { LogoCarousel } from '@/components/landing/logo-carousel'
import { LandingTestimonials } from '@/components/landing/testimonials'
import { LandingFAQ } from '@/components/landing/faq'
import { LandingCTA } from '@/components/landing/cta'
import { LandingFooter } from '@/components/landing/footer'

export default async function RootPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) redirect('/dashboard')

  return (
    <div className="landing-green min-h-screen bg-[#f6f6f3] text-foreground">
      <AnnouncementBanner />
      <LandingNavbar />
      <main>
        <LandingHero />
        <DashboardPreviewSection />
        <LogoCarousel />
        <LandingStats />
        <LandingFeatures />
        <LandingIndustries />
        <LandingWhyImara />
        <LandingTestimonials />
        <LandingFAQ />
        <LandingCTA />
      </main>
      <LandingFooter />
    </div>
  )
}
