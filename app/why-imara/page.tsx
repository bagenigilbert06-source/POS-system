import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { LandingNavbar } from '@/components/landing/navbar'
import { LandingWhyImara } from '@/components/landing/why-imara'
import { LandingTestimonials } from '@/components/landing/testimonials'
import { LandingCTA } from '@/components/landing/cta'
import { LandingFooter } from '@/components/landing/footer'

export const metadata = {
  title: 'Why Imara | Business OS Built for Africa',
  description: 'Discover why thousands of African businesses choose Imara for their operations',
}

export default async function WhyImaraPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-background">
      <LandingNavbar />
      <main className="pt-16">
        <section className="section-padding-premium bg-background">
          <div className="container-wide">
            <div className="max-w-3xl mx-auto text-center">
              <p className="section-eyebrow mb-4">Why Imara</p>
              <h1 className="section-heading mb-4 text-3xl sm:text-5xl">
                Built different. Built for Africa.
              </h1>
              <p className="section-subheading text-lg">
                Other platforms were built elsewhere and retrofitted. Imara was designed from day one for the realities of African commerce.
              </p>
            </div>
          </div>
        </section>
        <LandingWhyImara />
        <LandingTestimonials />
        <LandingCTA />
      </main>
      <LandingFooter />
    </div>
  )
}
