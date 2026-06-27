'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { cn } from '@/lib/utils'
import { Loader2, Eye, EyeOff } from 'lucide-react'

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

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    setError('')
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
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2.5 text-sm">
          <p className="text-red-900 font-medium">{error}</p>
        </div>
      )}

      {/* Google Sign In */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={googleLoading}
        className={cn(
          'w-full flex items-center justify-center gap-2.5 rounded-md px-4 py-2.5',
          'border border-neutral-200 bg-white text-neutral-900 text-sm font-medium',
          'hover:bg-neutral-50 transition-colors duration-150',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-50 dark:hover:bg-neutral-800'
        )}
      >
        {googleLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
        )}
        {googleLoading ? 'Connecting...' : 'Continue with Google'}
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 border-t border-neutral-200 dark:border-neutral-700" />
        <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">or</span>
        <div className="flex-1 border-t border-neutral-200 dark:border-neutral-700" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'sign-up' && (
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-neutral-900 dark:text-neutral-50 mb-1.5">
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
                'w-full rounded-md border border-neutral-200 bg-white px-3.5 py-2.5 text-sm outline-none',
                'placeholder:text-neutral-400',
                'focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900',
                'transition-all duration-150',
                'dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-50 dark:placeholder:text-neutral-500',
                'dark:focus:border-neutral-50 dark:focus:ring-neutral-50'
              )}
            />
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-neutral-900 dark:text-neutral-50 mb-1.5">
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
              'w-full rounded-md border border-neutral-200 bg-white px-3.5 py-2.5 text-sm outline-none',
              'placeholder:text-neutral-400',
              'focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900',
              'transition-all duration-150',
              'dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-50 dark:placeholder:text-neutral-500',
              'dark:focus:border-neutral-50 dark:focus:ring-neutral-50'
            )}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="password" className="block text-sm font-medium text-neutral-900 dark:text-neutral-50">
              Password
            </label>
            {mode === 'sign-in' && (
              <a href="#" className="text-xs font-medium text-neutral-600 hover:text-neutral-900 transition-colors dark:text-neutral-400 dark:hover:text-neutral-50">
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
                'w-full rounded-md border border-neutral-200 bg-white px-3.5 py-2.5 pr-10 text-sm outline-none',
                'placeholder:text-neutral-400',
                'focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900',
                'transition-all duration-150',
                'dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-50 dark:placeholder:text-neutral-500',
                'dark:focus:border-neutral-50 dark:focus:ring-neutral-50'
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors dark:text-neutral-500 dark:hover:text-neutral-300"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={cn(
            'w-full flex items-center justify-center gap-2 rounded-md px-4 py-2.5 mt-6',
            'bg-neutral-900 text-white text-sm font-medium',
            'hover:bg-neutral-800 active:bg-neutral-700 focus:outline-none',
            'disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150',
            'dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-200'
          )}
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === 'sign-in' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      <p className="text-center text-sm text-neutral-600 dark:text-neutral-400">
        {mode === 'sign-in' ? (
          <>
            Don&apos;t have an account?{' '}
            <a href="/sign-up" className="font-medium text-neutral-900 hover:underline dark:text-neutral-50">
              Sign up
            </a>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <a href="/sign-in" className="font-medium text-neutral-900 hover:underline dark:text-neutral-50">
              Sign in
            </a>
          </>
        )}
      </p>

      {mode === 'sign-up' && (
        <p className="text-center text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
          By signing up, you agree to our <a href="#" className="font-medium text-neutral-900 hover:underline dark:text-neutral-50">Terms of Service</a> and <a href="#" className="font-medium text-neutral-900 hover:underline dark:text-neutral-50">Privacy Policy</a>
        </p>
      )}
    </div>
  )
}
