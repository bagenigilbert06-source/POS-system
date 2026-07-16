import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { LandingNavbar } from '@/components/landing/navbar'
import { LandingIndustries } from '@/components/landing/industries'
import { LandingCTA } from '@/components/landing/cta'
import { LandingFooter } from '@/components/landing/footer'

export const metadata = {
  title: 'Industries | Pesaby - Solutions for Every Business Type',
  description: 'See how Pesaby works for retail, restaurants, salons, pharmacies, hardware stores, and more',
}

export default async function IndustriesPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-background">
      <LandingNavbar />
      <main className="pt-16">
        <section className="section-padding-premium bg-background">
          <div className="container-wide">
            <div className="max-w-3xl mx-auto text-center">
              <p className="section-eyebrow mb-4">Industries</p>
              <h1 className="section-heading mb-4 text-3xl sm:text-5xl">
                Built for your business type
              </h1>
              <p className="section-subheading text-lg">
                One platform tailored to how your specific type of business actually works — not a generic tool that forces you to adapt.
              </p>
            </div>
          </div>
        </section>
        <LandingIndustries />
        <LandingCTA />
      </main>
      <LandingFooter />
    </div>
  )
}
