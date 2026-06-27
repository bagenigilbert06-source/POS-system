import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { Settings, User, Building2, Shield } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Settings' }

const BUSINESS_TYPES = [
  'Retail Shop', 'Supermarket', 'Pharmacy', 'Hardware Store', 'Restaurant',
  'Salon / Barbershop', 'Electronics', 'Wholesale', 'Other',
]

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  const user = session?.user

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Settings</h1>
            <p className="text-sm text-muted-foreground">Manage your account and business</p>
          </div>
        </div>
      </div>

      {/* Account */}
      <section className="rounded-lg border bg-card">
        <div className="flex items-center gap-3 border-b px-5 py-4">
          <User className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Account</h2>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Name</p>
              <p className="font-medium">{user?.name ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Email</p>
              <p className="font-medium">{user?.email ?? '—'}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            To update your name or email, sign out and create a new account with updated details.
          </p>
        </div>
      </section>

      {/* Business */}
      <section className="rounded-lg border bg-card">
        <div className="flex items-center gap-3 border-b px-5 py-4">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Business Profile</h2>
        </div>
        <div className="p-5 space-y-4 text-sm">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Business type</label>
            <select className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors">
              {BUSINESS_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Currency</label>
              <select className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors">
                <option value="KES">KES — Kenyan Shilling</option>
                <option value="USD">USD — US Dollar</option>
                <option value="UGX">UGX — Ugandan Shilling</option>
                <option value="TZS">TZS — Tanzanian Shilling</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">VAT Rate (%)</label>
              <input
                type="number"
                defaultValue={16}
                min={0}
                max={100}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground rounded-md bg-muted/50 px-3 py-2">
            Full business profile editing with persistence is available in the next update.
          </p>
        </div>
      </section>

      {/* Security */}
      <section className="rounded-lg border bg-card">
        <div className="flex items-center gap-3 border-b px-5 py-4">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Security</h2>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Password</p>
              <p className="text-xs text-muted-foreground mt-0.5">Secured with Better Auth</p>
            </div>
            <span className="rounded-full bg-[hsl(var(--success)/0.1)] px-2.5 py-0.5 text-xs font-medium text-[hsl(var(--success))]">
              Protected
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Session</p>
              <p className="text-xs text-muted-foreground mt-0.5">7-day rolling session</p>
            </div>
            <span className="rounded-full bg-[hsl(var(--success)/0.1)] px-2.5 py-0.5 text-xs font-medium text-[hsl(var(--success))]">
              Active
            </span>
          </div>
        </div>
      </section>
    </div>
  )
}
