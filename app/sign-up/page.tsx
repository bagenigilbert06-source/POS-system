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
    <main className="flex min-h-screen">
      <div className="hidden w-1/2 flex-col justify-between bg-[hsl(var(--sidebar-bg))] p-12 lg:flex">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-xs font-bold text-primary-foreground">B</span>
          </div>
          <span className="font-semibold text-white">BizOS Kenya</span>
        </div>

        <div className="space-y-4">
          <h2 className="text-3xl font-semibold text-white">
            Start your 30-day free trial
          </h2>
          <p className="text-[hsl(var(--sidebar-fg))] leading-relaxed">
            Join thousands of Kenyan businesses using BizOS to manage sales,
            inventory, and customers — all in one place.
          </p>
          <ul className="space-y-2 text-sm text-[hsl(var(--sidebar-fg))]">
            {[
              'Full POS terminal with M-Pesa integration',
              'Real-time inventory tracking',
              'Customer management & loyalty',
              'Sales reports & analytics',
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                </div>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-[hsl(var(--sidebar-fg))]">
          &copy; {new Date().getFullYear()} BizOS Kenya.
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center p-8">
        <AuthForm mode="sign-up" />
      </div>
    </main>
  )
}
