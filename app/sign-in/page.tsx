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
    <main className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden w-1/2 flex-col justify-between bg-[hsl(var(--sidebar-bg))] p-12 lg:flex">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-xs font-bold text-primary-foreground">B</span>
          </div>
          <span className="font-semibold text-white">BizOS Kenya</span>
        </div>

        <div className="space-y-6">
          <blockquote className="text-2xl font-medium leading-relaxed text-white">
            &quot;The complete business platform built for Kenyan entrepreneurs — from the smallest
            kiosk to the largest supermarket.&quot;
          </blockquote>
          <div className="flex gap-6 text-[hsl(var(--sidebar-fg))] text-sm">
            {['POS Terminal', 'Inventory', 'M-Pesa Payments', 'Reports'].map((f) => (
              <div key={f} className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                {f}
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-[hsl(var(--sidebar-fg))]">
          &copy; {new Date().getFullYear()} BizOS Kenya. Built for Kenyan businesses.
        </p>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center p-8">
        <AuthForm mode="sign-in" />
      </div>
    </main>
  )
}
