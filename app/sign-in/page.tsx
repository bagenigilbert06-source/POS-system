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
            <p className="text-sm text-[hsl(var(--sidebar-fg))] font-semibold uppercase tracking-wide mb-4">Trusted by businesses across Kenya</p>
            <blockquote className="text-4xl font-bold leading-tight text-white">
              The complete business platform for Kenyan entrepreneurs
            </blockquote>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {[
              { icon: '📦', label: 'POS Terminal', desc: 'Fast checkout' },
              { icon: '📊', label: 'Inventory', desc: 'Real-time stock' },
              { icon: '💚', label: 'M-Pesa Ready', desc: 'Local payments' },
              { icon: '📈', label: 'Reports', desc: 'Analytics' },
            ].map((feature) => (
              <div key={feature.label} className="rounded-lg bg-white/5 backdrop-blur-sm border border-white/10 p-4">
                <div className="text-2xl mb-2">{feature.icon}</div>
                <h4 className="font-semibold text-white text-sm">{feature.label}</h4>
                <p className="text-xs text-[hsl(var(--sidebar-fg))]">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-[hsl(var(--sidebar-fg))] font-medium">
          &copy; {new Date().getFullYear()} BizOS Kenya. Built for Kenya, used across Africa.
        </p>
      </div>

      {/* Right panel — Clean form */}
      <div className="flex flex-1 items-center justify-center p-8 md:p-12">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2">Welcome back</h2>
            <p className="text-muted-foreground">Sign in to your BizOS account to continue</p>
          </div>
          <AuthForm mode="sign-in" />
        </div>
      </div>
    </main>
  )
}
