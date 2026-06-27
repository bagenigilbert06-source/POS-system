import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { AuthForm } from '@/components/auth/auth-form'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Sign In' }

export default async function SignInPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) redirect('/dashboard')

  return (
    <main className="flex min-h-screen bg-gradient-to-br from-background via-background to-card">
      {/* Left panel — Premium brand showcase */}
      <div className="hidden w-1/2 flex-col justify-between bg-[hsl(var(--sidebar-bg))] p-12 lg:flex">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-16">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary shadow-lg">
              <span className="text-sm font-bold text-primary-foreground">H</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">HaraKa</h1>
              <p className="text-xs text-[hsl(var(--sidebar-fg))] font-medium">Business Platform</p>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="space-y-12">
          <div>
            <p className="text-xs text-primary font-semibold uppercase tracking-widest mb-4">Trusted by 5,000+ Businesses</p>
            <h2 className="text-5xl font-bold leading-tight text-white mb-4">
              Speed up your business growth
            </h2>
            <p className="text-base text-[hsl(var(--sidebar-fg))] leading-relaxed">
              HaraKa is the all-in-one POS and business management platform for Kenyan enterprises. Fast, powerful, and built for growth.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {[
              { icon: '💳', label: 'Smart POS', desc: 'Modern checkout' },
              { icon: '📦', label: 'Inventory', desc: 'Real-time tracking' },
              { icon: '💰', label: 'Payments', desc: 'All methods' },
              { icon: '📊', label: 'Analytics', desc: 'Smart insights' },
            ].map((feature) => (
              <div key={feature.label} className="rounded-lg bg-white/5 backdrop-blur-sm border border-white/10 p-4">
                <div className="text-3xl mb-2">{feature.icon}</div>
                <h4 className="font-semibold text-white text-sm">{feature.label}</h4>
                <p className="text-xs text-[hsl(var(--sidebar-fg))]">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-[hsl(var(--sidebar-fg))] font-medium">
          &copy; {new Date().getFullYear()} HaraKa. Fast. Reliable. Local.
        </p>
      </div>

      {/* Right panel — Clean form */}
      <div className="flex flex-1 items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight mb-1">Welcome back</h2>
            <p className="text-sm text-muted-foreground">Sign in to your BizOS account</p>
          </div>
          <AuthForm mode="sign-in" />
        </div>
      </div>
    </main>
  )
}
