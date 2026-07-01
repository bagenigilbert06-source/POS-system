'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { cn } from '@/lib/utils'
import { Loader2, Eye, EyeOff, Check } from 'lucide-react'

interface AuthFormProps {
  mode: 'sign-in' | 'sign-up'
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '' })

  const clearStoredAuthState = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('accessToken')
    }
  }

  const loadAccessToken = async () => {
    const response = await fetch('/api/auth-tokens', {
      method: 'POST',
      cache: 'no-store',
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error('Signed in, but failed to create an access token')
    }

    const tokens = await response.json()
    sessionStorage.setItem('accessToken', tokens.accessToken)
    return tokens
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    clearStoredAuthState()

    try {
      if (mode === 'sign-up') {
        const result = await authClient.signUp.email({
          name: form.name,
          email: form.email,
          password: form.password,
        })
        if (result.error) throw new Error(result.error.message)
        await loadAccessToken()

        // Create organization for new user
        try {
          await fetch('/api/auth/post-signup', {
            method: 'POST',
            credentials: 'include',
          })
        } catch (orgError) {
          console.warn('[v0] Failed to create organization:', orgError)
          // Continue anyway, user can still access onboarding
        }

        router.push('/onboarding')
      } else {
        const result = await authClient.signIn.email({
          email: form.email,
          password: form.password,
        })
        if (result.error) throw new Error(result.error.message)
        await loadAccessToken()
        router.push('/dashboard')
      }
      router.refresh()
    } catch (err: unknown) {
      clearStoredAuthState()
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    setError('')
    clearStoredAuthState()
    try {
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: '/dashboard',
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to sign in with Google')
      setGoogleLoading(false)
    }
  }

  return (
    <div className="w-full space-y-5">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm">
          <p className="font-semibold text-destructive">{error}</p>
        </div>
      )}

      {/* Google Sign In */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={googleLoading}
        className={cn(
          'w-full flex items-center justify-center gap-2.5 rounded-lg px-4 py-2.5',
          'bg-white border border-zinc-300 text-zinc-800 text-sm font-semibold',
          'hover:bg-zinc-50 active:bg-zinc-100 transition-all duration-150 shadow-sm',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'dark:bg-white dark:border-zinc-300 dark:text-zinc-800 dark:hover:bg-zinc-50'
        )}
      >
        {googleLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-gray-700" />
        ) : (
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC04"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
        )}
        {googleLoading ? 'Connecting...' : 'Continue with Google'}
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 border-t border-zinc-200" />
        <span className="text-xs font-medium text-zinc-500">or</span>
        <div className="flex-1 border-t border-zinc-200" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'sign-up' && (
          <div>
            <label htmlFor="name" className="mb-2 block text-sm font-semibold text-zinc-800">
              Full name
            </label>
            <input
              id="name"
              type="text"
              required
              placeholder="John Doe"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={cn(
                'w-full rounded-md border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none',
                'placeholder:text-zinc-400',
                'focus:border-[#005a43] focus:ring-2 focus:ring-emerald-900/10',
                'transition-all duration-150'
              )}
            />
          </div>
        )}

        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-semibold text-zinc-800">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            placeholder="name@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={cn(
              'w-full rounded-md border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-950 outline-none',
              'placeholder:text-zinc-400',
              'focus:border-[#005a43] focus:ring-2 focus:ring-emerald-900/10',
              'transition-all duration-150'
            )}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="password" className="block text-sm font-semibold text-zinc-800">
              Password
            </label>
            {mode === 'sign-in' && (
              <a href="#" className="text-xs font-semibold text-[#005a43] transition-colors hover:text-emerald-800">
                Forgot?
              </a>
            )}
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className={cn(
                'w-full rounded-md border border-zinc-300 bg-white px-4 py-3 pr-10 text-sm text-zinc-950 outline-none',
                'placeholder:text-zinc-400',
                'focus:border-[#005a43] focus:ring-2 focus:ring-emerald-900/10',
                'transition-all duration-150'
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors hover:text-zinc-950"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={cn(
            'mt-6 flex w-full items-center justify-center gap-2 rounded-md px-4 py-3',
            'bg-[#005a43] text-white text-sm font-extrabold',
            'hover:bg-emerald-800 active:bg-emerald-900 focus:outline-none',
            'disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150',
            'shadow-md shadow-emerald-950/15'
          )}
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === 'sign-in' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      <p className="text-center text-sm text-zinc-600">
        {mode === 'sign-in' ? (
          <>
            Don&apos;t have an account?{' '}
            <a href="/sign-up" className="font-semibold text-[#005a43] transition-colors hover:text-emerald-800">
              Sign up
            </a>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <a href="/sign-in" className="font-semibold text-[#005a43] transition-colors hover:text-emerald-800">
              Sign in
            </a>
          </>
        )}
      </p>

      {mode === 'sign-up' && (
        <p className="text-center text-xs leading-relaxed text-zinc-500">
          <Check className="mr-1 inline h-3.5 w-3.5 text-[#005a43]" aria-hidden="true" />
          By signing up, you agree to our{' '}
          <a href="#" className="font-semibold text-zinc-800 transition-colors hover:text-[#005a43]">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="#" className="font-semibold text-zinc-800 transition-colors hover:text-[#005a43]">
            Privacy Policy
          </a>
        </p>
      )}
    </div>
  )
}
