import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { AuthForm } from '@/components/auth/auth-form'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Sign Up' }

export default async function SignUpPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) redirect('/dashboard')

  return (
    <main className="flex min-h-screen bg-gradient-to-br from-background via-background to-card">
      {/* Left panel — Premium features */}
      <div className="hidden w-1/2 flex-col justify-between bg-[hsl(var(--sidebar-bg))] p-12 lg:flex">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-16">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary shadow-lg">
              <span className="text-sm font-bold text-primary-foreground">N</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Nexora</h1>
              <p className="text-xs text-[hsl(var(--sidebar-fg))] font-medium">Business Management System</p>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="space-y-12">
          <div>
            <p className="text-xs text-primary font-semibold uppercase tracking-widest mb-4">Start Free • 30-Day Trial</p>
            <h2 className="text-5xl font-bold leading-tight text-white mb-4">
              Your business deserves better
            </h2>
            <p className="text-base text-[hsl(var(--sidebar-fg))] leading-relaxed">
              Join thousands of Kenyan businesses using Nexora to streamline operations, boost sales, and grow faster.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { icon: '✓', title: 'Smart POS System', desc: 'Accept all payment methods' },
              { icon: '✓', title: 'Live Inventory', desc: 'Never run out of stock' },
              { icon: '✓', title: 'Sales Analytics', desc: 'Data-driven decisions' },
              { icon: '✓', title: 'Customer CRM', desc: 'Build lasting relationships' },
              { icon: '✓', title: 'Mobile App', desc: 'Manage on the go' },
              { icon: '✓', title: '24/7 Support', desc: 'Local support team' },
            ].map((feature, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 flex-shrink-0">
                  <span className="text-sm font-bold text-primary">{feature.icon}</span>
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">{feature.title}</p>
                  <p className="text-xs text-[hsl(var(--sidebar-fg))]">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-[hsl(var(--sidebar-fg))] font-medium">
          &copy; {new Date().getFullYear()} Nexora. Enterprise. Secure. Local.
        </p>
      </div>

      {/* Right panel — Sign up form */}
      <div className="flex flex-1 items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight mb-1">Get started</h2>
            <p className="text-sm text-muted-foreground">Create your account in seconds</p>
          </div>
          <AuthForm mode="sign-up" />
        </div>
      </div>
    </main>
  )
}
