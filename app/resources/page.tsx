import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LandingNavbar } from '@/components/landing/navbar'
import { LandingFAQ } from '@/components/landing/faq'
import { LandingCTA } from '@/components/landing/cta'
import { LandingFooter } from '@/components/landing/footer'
import { FileText, PlayCircle, MessageSquare, BookOpen, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Resources | Imara - Guides, Docs & Support',
  description: 'Access guides, documentation, and support resources for Imara',
}

const resources = [
  {
    icon: BookOpen,
    title: 'Documentation',
    description: 'Complete guides and API documentation to help you get the most out of Imara',
    href: 'mailto:hello@imara.co',
    cta: 'Read Docs',
  },
  {
    icon: PlayCircle,
    title: 'Video Tutorials',
    description: 'Learn Imara with step-by-step video guides for all features',
    href: 'mailto:hello@imara.co',
    cta: 'Watch Tutorials',
  },
  {
    icon: FileText,
    title: 'Blog & Articles',
    description: 'Latest tips, industry insights, and success stories from Imara users',
    href: 'mailto:hello@imara.co',
    cta: 'Read Blog',
  },
  {
    icon: MessageSquare,
    title: 'Support & Contact',
    description: 'Get help from our support team. We typically respond within 2 hours',
    href: 'mailto:hello@imara.co',
    cta: 'Contact Support',
  },
]

export default async function ResourcesPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-background">
      <LandingNavbar />
      <main className="pt-16">
        <section className="section-padding-premium bg-background">
          <div className="container-wide">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <p className="section-eyebrow mb-4">Resources</p>
              <h1 className="section-heading mb-4 text-3xl sm:text-5xl">
                Learn & Get Help
              </h1>
              <p className="section-subheading text-lg">
                Find guides, documentation, video tutorials, and connect with our support team
              </p>
            </div>

            {/* Resources Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-16">
              {resources.map((resource) => {
                const Icon = resource.icon
                return (
                  <Link key={resource.title} href={resource.href} className="group">
                    <div className="rounded-2xl border border-border bg-card p-8 hover:border-primary/50 hover:bg-secondary/50 transition-all duration-300 h-full flex flex-col">
                      <div className="mb-6 p-4 bg-primary/10 rounded-xl w-fit group-hover:bg-primary/20 transition-colors">
                        <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">{resource.title}</h3>
                      <p className="text-muted-foreground text-sm mb-6 flex-1">{resource.description}</p>
                      <div className="flex items-center gap-2 text-primary font-medium text-sm group-hover:gap-3 transition-all">
                        {resource.cta}
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>

        <LandingFAQ />
        <LandingCTA />
      </main>
      <LandingFooter />
    </div>
  )
}
