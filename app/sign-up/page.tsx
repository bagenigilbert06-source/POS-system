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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg">
              <span className="text-sm font-bold text-primary-foreground">B</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">BizOS Kenya</h1>
              <p className="text-xs text-[hsl(var(--sidebar-fg))] font-medium">Business OS for Africa</p>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="space-y-12">
          <div>
            <p className="text-sm text-primary font-semibold uppercase tracking-wide mb-4">No credit card required</p>
            <h2 className="text-4xl font-bold leading-tight text-white mb-4">
              Start free for 30 days
            </h2>
            <p className="text-base text-[hsl(var(--sidebar-fg))] leading-relaxed">
              Join thousands of Kenyan businesses. Manage sales, inventory, and customers all in one powerful platform.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { emoji: '✨', title: 'Full POS Terminal', desc: 'With M-Pesa support' },
              { emoji: '📊', title: 'Real-time Inventory', desc: 'Track stock instantly' },
              { emoji: '💚', title: 'M-Pesa Integrated', desc: 'Accept payments seamlessly' },
              { emoji: '📈', title: 'Powerful Reports', desc: 'Understand your business' },
              { emoji: '👥', title: 'Customer Profiles', desc: 'Build loyalty programs' },
              { emoji: '🔐', title: 'Secure & Fast', desc: 'Enterprise-grade security' },
            ].map((feature, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <span className="text-2xl mt-1">{feature.emoji}</span>
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
          &copy; {new Date().getFullYear()} BizOS Kenya. Built for Kenya, trusted across Africa.
        </p>
      </div>

      {/* Right panel — Sign up form */}
      <div className="flex flex-1 items-center justify-center p-8 md:p-12">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2">Get started</h2>
            <p className="text-muted-foreground">Create your account to begin</p>
          </div>
          <AuthForm mode="sign-up" />
        </div>
      </div>
    </main>
  )
}
