'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { cn } from '@/lib/utils'
import { Loader2, Eye, EyeOff, Building2 } from 'lucide-react'

interface AuthFormProps {
  mode: 'sign-in' | 'sign-up'
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (mode === 'sign-up') {
        const result = await authClient.signUp.email({
          name: form.name,
          email: form.email,
          password: form.password,
        })
        if (result.error) throw new Error(result.error.message)
      } else {
        const result = await authClient.signIn.email({
          email: form.email,
          password: form.password,
        })
        if (result.error) throw new Error(result.error.message)
      }
      router.push('/dashboard')
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-5">
        {mode === 'sign-up' && (
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-foreground">Full name</label>
            <input
              type="text"
              required
              placeholder="John Doe"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={cn(
                'w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none',
                'placeholder:text-muted-foreground',
                'focus:border-primary focus:ring-2 focus:ring-primary/20 focus:ring-offset-2',
                'transition-all duration-200'
              )}
            />
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-foreground">Email address</label>
          <input
            type="email"
            required
            placeholder="name@company.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={cn(
              'w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none',
              'placeholder:text-muted-foreground',
              'focus:border-primary focus:ring-2 focus:ring-primary/20 focus:ring-offset-2',
              'transition-all duration-200'
            )}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-semibold text-foreground">Password</label>
            {mode === 'sign-in' && (
              <a href="#" className="text-xs font-semibold text-primary hover:text-primary/80">
                Forgot?
              </a>
            )}
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className={cn(
                'w-full rounded-lg border border-border bg-background px-4 py-3 pr-12 text-sm outline-none',
                'placeholder:text-muted-foreground',
                'focus:border-primary focus:ring-2 focus:ring-primary/20 focus:ring-offset-2',
                'transition-all duration-200'
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            <p className="font-semibold">Error</p>
            <p className="text-xs mt-1">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className={cn(
            'w-full flex items-center justify-center gap-2 rounded-lg px-4 py-3 mt-6',
            'bg-primary text-primary-foreground text-sm font-semibold',
            'hover:bg-primary/90 active:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-primary/40',
            'disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200'
          )}
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === 'sign-in' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {mode === 'sign-in' ? (
          <>
            New to BizOS?{' '}
            <a href="/sign-up" className="font-semibold text-primary hover:text-primary/80 transition-colors">
              Create an account
            </a>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <a href="/sign-in" className="font-semibold text-primary hover:text-primary/80 transition-colors">
              Sign in
            </a>
          </>
        )}
      </p>

      {mode === 'sign-up' && (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          By signing up, you agree to our Terms of Service and Privacy Policy
        </p>
      )}
    </div>
  )
}
