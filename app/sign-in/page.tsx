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
    <main className="flex min-h-screen bg-white dark:bg-neutral-950">
      {/* Left panel — Brand showcase */}
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
            <p className="text-xs text-neutral-400 font-medium uppercase tracking-widest mb-4">Welcome back</p>
            <h2 className="text-4xl font-semibold leading-tight text-white mb-6">
              Manage your business with ease
            </h2>
            <p className="text-base text-neutral-300 leading-relaxed max-w-md">
              Access your POS, inventory, payments, and analytics all in one place. Sign in to continue.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { icon: '→', title: 'Fast Access' },
              { icon: '→', title: 'Secure Login' },
              { icon: '→', title: 'Your Data Protected' },
            ].map((feature) => (
              <div key={feature.title} className="flex items-center gap-3">
                <span className="text-neutral-500 text-sm font-medium">{feature.icon}</span>
                <span className="text-neutral-300 text-sm">{feature.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-neutral-500 font-medium">
          &copy; {new Date().getFullYear()} IMARA. All rights reserved.
        </p>
      </div>

      {/* Right panel — Clean form */}
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
            <h1 className="text-3xl font-semibold text-neutral-900 dark:text-white mb-2">Sign in</h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">Enter your credentials to access your account</p>
          </div>
          <AuthForm mode="sign-in" />
        </div>
      </div>
    </main>
  )
}
