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
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Building2 className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {mode === 'sign-in' ? 'Welcome back' : 'Create your account'}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {mode === 'sign-in'
            ? 'Sign in to your BizOS account'
            : 'Start managing your business today'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'sign-up' && (
          <div>
            <label className="mb-1.5 block text-sm font-medium">Full name</label>
            <input
              type="text"
              required
              placeholder="John Doe"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={cn(
                'w-full rounded-md border bg-background px-3 py-2 text-sm outline-none',
                'placeholder:text-muted-foreground',
                'focus:border-primary focus:ring-2 focus:ring-primary/20',
                'transition-colors'
              )}
            />
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium">Email address</label>
          <input
            type="email"
            required
            placeholder="john@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={cn(
              'w-full rounded-md border bg-background px-3 py-2 text-sm outline-none',
              'placeholder:text-muted-foreground',
              'focus:border-primary focus:ring-2 focus:ring-primary/20',
              'transition-colors'
            )}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className={cn(
                'w-full rounded-md border bg-background px-3 py-2 pr-10 text-sm outline-none',
                'placeholder:text-muted-foreground',
                'focus:border-primary focus:ring-2 focus:ring-primary/20',
                'transition-colors'
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-md px-4 py-2.5',
            'bg-primary text-primary-foreground text-sm font-medium',
            'hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/40',
            'disabled:opacity-60 disabled:cursor-not-allowed transition-colors'
          )}
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === 'sign-in' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {mode === 'sign-in' ? (
          <>
            Don&apos;t have an account?{' '}
            <a href="/sign-up" className="font-medium text-primary hover:underline">
              Sign up
            </a>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <a href="/sign-in" className="font-medium text-primary hover:underline">
              Sign in
            </a>
          </>
        )}
      </p>
    </div>
  )
}
