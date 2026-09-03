'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, Check, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { LoadingSpinner as Loader2 } from '@/components/ui/page-loader';
import { authClient } from '@/lib/auth-client';
import { cn } from '@/lib/utils';

interface AuthFormProps {
  mode: 'sign-in' | 'sign-up';
}

type FieldName = 'name' | 'email' | 'password' | 'confirmPassword';
type FieldErrors = Partial<Record<FieldName, string>>;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const isSignUp = mode === 'sign-up';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const getAuthErrorMessage = (message: string) => {
    if (isSignUp && /already|exists|registered|unique/i.test(message)) {
      return 'An account with this email already exists. Sign in instead or reset your password.';
    }
    if (!isSignUp && /invalid|credential|password|email/i.test(message)) {
      return 'The email or password you entered is incorrect.';
    }
    if (/too short|at least 8|min.*8/i.test(message)) {
      return 'Your password must contain at least 8 characters.';
    }
    if (
      /server|database|network|fetch|connect|unexpected|unavailable|timeout|internal/i.test(
        message
      )
    ) {
      return 'We could not connect to Pesaby right now. Please try again shortly.';
    }
    return message || 'Something went wrong. Please try again.';
  };

  const updateField = (field: FieldName, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    if (error) setError('');
  };

  const validate = () => {
    const errors: FieldErrors = {};
    const name = form.name.trim();
    const email = form.email.trim();

    if (isSignUp) {
      if (name.length < 2) errors.name = 'Enter your full name.';
      else if (name.length > 80)
        errors.name = 'Name must be 80 characters or fewer.';
    }
    if (!email) errors.email = 'Enter your work email.';
    else if (email.length > 254 || !EMAIL_PATTERN.test(email))
      errors.email = 'Enter a valid email address.';
    if (!form.password) errors.password = 'Enter your password.';
    else if (form.password.length < 8)
      errors.password = 'Use at least 8 characters.';
    else if (form.password.length > 128)
      errors.password = 'Password must be 128 characters or fewer.';
    if (isSignUp && form.confirmPassword !== form.password)
      errors.confirmPassword = 'Passwords do not match.';

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const clearStoredAuthState = () => {
    try {
      sessionStorage.removeItem('accessToken');
    } catch {
      // Storage can be unavailable in hardened/private browser contexts.
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setError('');
    clearStoredAuthState();

    try {
      const email = form.email.trim().toLowerCase();
      if (isSignUp) {
        const result = await authClient.signUp.email({
          name: form.name.trim().replace(/\s+/g, ' '),
          email,
          password: form.password,
        });
        if (result.error) {
          throw new Error(
            result.error.status >= 500
              ? 'Authentication service is temporarily unavailable.'
              : result.error.message
          );
        }

        // The session cookie is complete at this point. Onboarding owns its
        // idempotent draft creation, so no extra request blocks navigation.
        router.replace('/onboarding');
        return;
      } else {
        const result = await authClient.signIn.email({
          email,
          password: form.password,
          rememberMe,
        });
        if (result.error) {
          throw new Error(
            result.error.status >= 500
              ? 'Authentication service is temporarily unavailable.'
              : result.error.message
          );
        }
        // Dashboard route guards perform the role-aware destination decision.
        // Going there directly avoids doing the same authorization queries twice.
        router.replace('/dashboard');
        return;
      }
    } catch (err: unknown) {
      clearStoredAuthState();
      setError(
        getAuthErrorMessage(
          err instanceof Error ? err.message : 'Something went wrong'
        )
      );
      setLoading(false);
    }
  };

  const inputClass = (invalid: boolean) =>
    cn(
      'h-12 w-full rounded-lg border bg-white px-3.5 text-sm text-slate-950 outline-none transition',
      'placeholder:text-zinc-400 hover:border-zinc-400 focus:border-slate-900 focus:ring-4 focus:ring-[#ffda32]/45',
      invalid ? 'border-red-500 ring-2 ring-red-100' : 'border-zinc-300',
      'disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500'
    );

  const fieldError = (field: FieldName) =>
    fieldErrors[field] ? (
      <p
        id={`${field}-error`}
        className="mt-1.5 text-xs font-medium text-red-700"
      >
        {fieldErrors[field]}
      </p>
    ) : null;

  return (
    <div className="w-full">
      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="mb-5 flex gap-3 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p className="leading-5">{error}</p>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        noValidate
        aria-busy={loading}
        className="space-y-4"
      >
        {isSignUp && (
          <div>
            <label
              htmlFor="name"
              className="mb-1.5 block text-sm font-semibold text-slate-900"
            >
              Full name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              autoFocus
              required
              maxLength={80}
              placeholder="e.g. Amina Kamau"
              value={form.name}
              disabled={loading}
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={fieldErrors.name ? 'name-error' : undefined}
              onChange={(event) => updateField('name', event.target.value)}
              className={inputClass(Boolean(fieldErrors.name))}
            />
            {fieldError('name')}
          </div>
        )}

        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-sm font-semibold text-slate-900"
          >
            Work email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            autoFocus={!isSignUp}
            required
            maxLength={254}
            placeholder="you@business.com"
            value={form.email}
            disabled={loading}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? 'email-error' : undefined}
            onChange={(event) => updateField('email', event.target.value)}
            className={inputClass(Boolean(fieldErrors.email))}
          />
          {fieldError('email')}
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm font-semibold text-slate-900"
          >
            {isSignUp ? 'Create password' : 'Password'}
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              required
              minLength={8}
              maxLength={128}
              placeholder={
                isSignUp ? 'At least 8 characters' : 'Enter your password'
              }
              value={form.password}
              disabled={loading}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={
                fieldErrors.password
                  ? 'password-error'
                  : isSignUp
                    ? 'password-hint'
                    : undefined
              }
              onChange={(event) => updateField('password', event.target.value)}
              className={cn(inputClass(Boolean(fieldErrors.password)), 'pr-12')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e42527]"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="h-[18px] w-[18px]" />
              ) : (
                <Eye className="h-[18px] w-[18px]" />
              )}
            </button>
          </div>
          {fieldError('password')}
          {isSignUp && !fieldErrors.password && (
            <p
              id="password-hint"
              className="mt-1.5 flex items-center gap-1.5 text-xs text-zinc-500"
            >
              <Check
                className={cn(
                  'h-3.5 w-3.5',
                  form.password.length >= 8
                    ? 'text-emerald-600'
                    : 'text-zinc-400'
                )}
                aria-hidden="true"
              />
              Use 8 or more characters
            </p>
          )}
        </div>

        {isSignUp && (
          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-1.5 block text-sm font-semibold text-slate-900"
            >
              Confirm password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              maxLength={128}
              placeholder="Enter your password again"
              value={form.confirmPassword}
              disabled={loading}
              aria-invalid={Boolean(fieldErrors.confirmPassword)}
              aria-describedby={
                fieldErrors.confirmPassword
                  ? 'confirmPassword-error'
                  : undefined
              }
              onChange={(event) =>
                updateField('confirmPassword', event.target.value)
              }
              className={inputClass(Boolean(fieldErrors.confirmPassword))}
            />
            {fieldError('confirmPassword')}
          </div>
        )}

        {!isSignUp && (
          <div className="flex items-center justify-between gap-4 pt-0.5 text-sm">
            <label className="inline-flex cursor-pointer items-center gap-2 text-zinc-600">
              <input
                type="checkbox"
                checked={rememberMe}
                disabled={loading}
                onChange={(event) => setRememberMe(event.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 accent-[#e42527]"
              />
              Remember me
            </label>
            <Link
              href="/forgot-password"
              className="font-semibold text-[#b91c1c] underline-offset-4 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#ffda32] px-4 text-sm font-extrabold text-slate-950 shadow-sm ring-1 ring-black/5 transition hover:bg-[#f3cd26] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e42527] focus-visible:ring-offset-2 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading && (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span className="sr-only" role="status" aria-label="Authenticating">
                Authenticating
              </span>
            </>
          )}
          {loading
            ? isSignUp
              ? 'Creating your account…'
              : 'Signing you in…'
            : isSignUp
              ? 'Create account'
              : 'Sign in to Pesaby'}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-zinc-600">
        {isSignUp ? 'Already have an account?' : 'New to Pesaby?'}{' '}
        <Link
          href={isSignUp ? '/sign-in' : '/sign-up'}
          className="font-bold text-[#c91f21] underline-offset-4 hover:underline"
        >
          {isSignUp ? 'Sign in' : 'Create an account'}
        </Link>
      </p>

      {!isSignUp && (
        <div className="mt-5 flex items-center justify-center gap-2 border-t border-zinc-200 pt-5 text-xs text-zinc-500">
          <ShieldCheck className="h-4 w-4 text-zinc-600" aria-hidden="true" />
          <span>Secure, encrypted account access.</span>
        </div>
      )}
    </div>
  );
}
