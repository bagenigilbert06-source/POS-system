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
    <main className="flex min-h-screen bg-background">
      {/* Left panel — Features showcase with gradient */}
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
              <p className="text-xs text-blue-300/70 font-medium uppercase tracking-widest mb-4">Start free • 30-day trial</p>
              <h2 className="text-5xl font-semibold leading-tight text-white mb-6">
                Build your stronger business
              </h2>
              <p className="text-base text-blue-100/70 leading-relaxed max-w-md">
                Join thousands of businesses managing sales, inventory, and payments all in one platform.
              </p>
            </div>

            <div className="space-y-3">
              {[
                { title: 'Smart POS System', desc: 'Accept all payment methods' },
                { title: 'Live Inventory', desc: 'Real-time stock tracking' },
                { title: 'Sales Analytics', desc: 'Data-driven insights' },
                { title: 'Customer CRM', desc: 'Build relationships' },
              ].map((feature, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-400/30 flex-shrink-0 mt-0.5">
                    <span className="text-xs font-semibold text-blue-200">✓</span>
                  </div>
                  <div>
                    <p className="font-medium text-white text-sm">{feature.title}</p>
                    <p className="text-xs text-blue-200/60 mt-0.5">{feature.desc}</p>
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

      {/* Right panel — Sign up form */}
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
            <h1 className="text-3xl font-semibold text-foreground mb-2">Create account</h1>
            <p className="text-sm text-muted-foreground">Join us and start managing your business</p>
          </div>
          <AuthForm mode="sign-up" />
        </div>
      </div>
    </main>
  )
}
