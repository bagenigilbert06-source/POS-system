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
    <main className="flex min-h-screen bg-white dark:bg-neutral-950">
      {/* Left panel — Features showcase */}
      <div className="hidden w-1/2 flex-col justify-between bg-neutral-900 p-12 lg:flex">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center">
              <span className="text-sm font-bold text-neutral-900">I</span>
            </div>
            <span className="text-lg font-semibold text-white">IMARA</span>
          </div>
        </div>

        {/* Main content */}
        <div className="space-y-10">
          <div>
            <p className="text-xs text-neutral-400 font-medium uppercase tracking-widest mb-4">Start free • 30-day trial</p>
            <h2 className="text-4xl font-semibold leading-tight text-white mb-6">
              Build your stronger business
            </h2>
            <p className="text-base text-neutral-300 leading-relaxed max-w-md">
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
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-700 flex-shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-white">✓</span>
                </div>
                <div>
                  <p className="font-medium text-white text-sm">{feature.title}</p>
                  <p className="text-xs text-neutral-400 mt-0.5">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-neutral-500 font-medium">
          &copy; {new Date().getFullYear()} IMARA. All rights reserved.
        </p>
      </div>

      {/* Right panel — Sign up form */}
      <div className="flex flex-1 items-center justify-center p-6 md:p-12 bg-white dark:bg-neutral-950">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-2.5 mb-8">
              <div className="h-8 w-8 rounded-lg bg-neutral-900 flex items-center justify-center dark:bg-white">
                <span className="text-sm font-bold text-white dark:text-neutral-900">I</span>
              </div>
              <span className="text-lg font-semibold text-neutral-900 dark:text-white">IMARA</span>
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-neutral-900 dark:text-white mb-2">Create account</h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">Join us and start managing your business</p>
          </div>
          <AuthForm mode="sign-up" />
        </div>
      </div>
    </main>
  )
}
