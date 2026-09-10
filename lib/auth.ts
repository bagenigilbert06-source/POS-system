import { betterAuth } from 'better-auth';
import { bearer, jwt } from 'better-auth/plugins';
import { cache } from 'react';
import { headers } from 'next/headers';
import { pool } from '@/lib/db';
import { db } from '@/lib/db';
import { emailVerificationEmail } from '@/lib/email/templates/email-verification';
import { sendEmail } from '@/lib/email/client';
import { withDatabaseRetry } from '@/lib/db/retry';
import { after } from 'next/server';
import { nextCookies } from 'better-auth/next-js';

export const auth = betterAuth({
  database: pool,
  basePath: '/api/auth',
  baseURL:
    process.env.BETTER_AUTH_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : (process.env.V0_RUNTIME_URL ?? 'http://localhost:3000')),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    requireEmailVerification: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    async sendResetPassword({ user: authUser, url }) {
      await sendEmail({
          to: { email: authUser.email, name: authUser.name },
          subject: 'Reset your Pesaby password',
          text: `Reset your password using this secure one-hour link: ${url}`,
          html: `<p>Hello ${authUser.name},</p><p><a href="${url}">Reset your Pesaby password</a></p><p>This secure link expires in one hour and can only be used once.</p>`,
        });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60,
    async sendVerificationEmail({ user: authUser, url }) {
      // Always return to a long-lived dashboard route. Better Auth appends an
      // error code to this URL when a token is expired or invalid.
      const verificationUrl = new URL(url);
      verificationUrl.searchParams.set('callbackURL', '/auth/staff-activation');
      await sendEmail({
        to: { email: authUser.email, name: authUser.name },
        ...emailVerificationEmail({
          name: authUser.name,
          email: authUser.email,
          verificationUrl: verificationUrl.toString(),
        }),
      });
    },
  },
  trustedOrigins: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
    ...(process.env.V0_RUNTIME_URL ? [process.env.V0_RUNTIME_URL] : []),
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
    ...(process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? [`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`]
      : []),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      // Avoid a second database session lookup immediately after authentication.
      // Keep this deliberately short; account status is still checked per request.
      enabled: true,
      maxAge: 60,
      strategy: 'compact',
    },
  },
  advanced: {
    backgroundTasks: {
      // Better Auth uses this for non-critical work such as verification
      // email delivery, allowing the auth response to return immediately.
      handler: (promise) => after(() => promise),
    },
  },
  plugins: [
    bearer(),
    jwt({
      jwt: {
        expirationTime: '15m',
        issuer: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
        audience: 'pos-api',
      },
    }),
    nextCookies(),
  ],
});

/** One request-scoped session lookup shared by dashboard layouts and pages. */
export const getCurrentSession = cache(async () =>
  withDatabaseRetry(async () =>
    auth.api.getSession({ headers: await headers() })
  )
);
