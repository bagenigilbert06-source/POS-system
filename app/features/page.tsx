import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { LandingNavbar } from '@/components/landing/navbar'
import { LandingFeatures } from '@/components/landing/features'
import { LandingCTA } from '@/components/landing/cta'
import { LandingFooter } from '@/components/landing/footer'

export const metadata = {
  title: 'Features | Imara - Business OS for African Commerce',
  description: 'Explore all of Imara\'s features designed for African businesses',
}

export default async function FeaturesPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-background">
      <LandingNavbar />
      <main className="pt-16">
        <section className="section-padding-premium bg-background">
          <div className="container-wide">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <p className="section-eyebrow mb-4">Platform Features</p>
              <h1 className="section-heading mb-4 text-3xl sm:text-5xl">
                Everything you need to run your business
              </h1>
              <p className="section-subheading text-lg">
                From point of sale to inventory management, Imara brings together every tool modern African businesses need to operate, grow, and stay in control.
              </p>
            </div>
          </div>
        </section>
        <LandingFeatures />
        <LandingCTA />
      </main>
      <LandingFooter />
    </div>
  )
}
