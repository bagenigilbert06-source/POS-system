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
    <main className="flex min-h-screen bg-background">
      {/* Left panel — Brand showcase with gradient */}
      <div className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-[hsl(var(--section-dark-bg))] via-[hsl(221,80%,25%)] to-[hsl(var(--section-dark-bg))] p-12 lg:flex relative overflow-hidden">
        {/* Gradient glow decoration */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <div className="h-[600px] w-[600px] rounded-full bg-blue-500/10 dark:bg-blue-400/5" />
        </div>

        <div className="relative z-10">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2.5 mb-16">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <span className="text-sm font-bold text-white">I</span>
              </div>
              <span className="text-xl font-bold text-white">IMARA</span>
            </div>
          </div>

          {/* Main content */}
          <div className="space-y-10">
            <div>
              <p className="text-xs text-blue-300/70 font-medium uppercase tracking-widest mb-4">Welcome back</p>
              <h2 className="text-5xl font-semibold leading-tight text-white mb-6">
                Manage your business effortlessly
              </h2>
              <p className="text-base text-blue-100/70 leading-relaxed max-w-md">
                Access your POS, inventory, payments, and analytics all in one unified platform.
              </p>
            </div>

            <div className="space-y-3">
              {[
                { icon: '✓', title: 'Fast Access', desc: 'Instant sign-in' },
                { icon: '✓', title: 'Secure Login', desc: 'Enterprise-grade security' },
                { icon: '✓', title: 'Your Data Protected', desc: 'End-to-end encrypted' },
              ].map((feature) => (
                <div key={feature.title} className="flex items-start gap-3">
                  <span className="text-blue-300 text-sm font-semibold flex-shrink-0">{feature.icon}</span>
                  <div>
                    <span className="text-white text-sm font-medium">{feature.title}</span>
                    <p className="text-blue-200/60 text-xs">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <p className="text-xs text-blue-300/50 font-medium">
            &copy; {new Date().getFullYear()} IMARA. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right panel — Clean form */}
      <div className="flex flex-1 items-center justify-center p-6 md:p-12 bg-background relative overflow-hidden">
        {/* Subtle gradient glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-start justify-end"
        >
          <div className="h-[500px] w-[500px] rounded-full bg-blue-600/[0.06] dark:bg-blue-500/[0.08]" />
        </div>

        <div className="w-full max-w-sm relative z-10">
          {/* Mobile logo */}
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-2.5 mb-8">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <span className="text-sm font-bold text-white">I</span>
              </div>
              <span className="text-lg font-semibold text-foreground">IMARA</span>
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-foreground mb-2">Sign in</h1>
            <p className="text-sm text-muted-foreground">Enter your credentials to access your account</p>
          </div>
          <AuthForm mode="sign-in" />
        </div>
      </div>
    </main>
  )
}
