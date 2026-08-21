import { betterAuth } from 'better-auth'
import { bearer, jwt } from 'better-auth/plugins'
import { cache } from 'react'
import { headers } from 'next/headers'
import { pool } from '@/lib/db'
import { db } from '@/lib/db'
import { auditEvent, employee, user } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { generateId } from '@/lib/utils'
import { sendStaffInvitation } from '@/lib/email/staff-invitation'
import { sendEmail } from '@/lib/email/client'
import { withDatabaseRetry } from '@/lib/db/retry'

export const auth = betterAuth({
  database: pool,
  baseURL:
    process.env.BETTER_AUTH_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.V0_RUNTIME_URL ?? 'http://localhost:3000'),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    async sendResetPassword({ user: authUser, url }) {
      const [staff] = await db.select().from(employee).where(eq(employee.userId, authUser.id)).limit(1)
      if (staff?.status === 'invited') {
        // Better Auth's reset token is single-use. The email is only used after
        // that token succeeds to establish the member's first signed-in session.
        const separator = url.includes('?') ? '&' : '?'
        await sendStaffInvitation({ userId: authUser.id, email: authUser.email, setupUrl: `${url}${separator}email=${encodeURIComponent(authUser.email)}` })
      }
      else await sendEmail({ to: { email: authUser.email, name: authUser.name }, subject: 'Reset your Pesaby password', text: `Reset your password using this secure one-hour link: ${url}`, html: `<p>Hello ${authUser.name},</p><p><a href="${url}">Reset your Pesaby password</a></p><p>This secure link expires in one hour and can only be used once.</p>` })
    },
    async onPasswordReset({ user: authUser }) {
      const [staff] = await db.select().from(employee).where(eq(employee.userId, authUser.id)).limit(1)
      await db.update(user).set({ status: 'active', emailVerified: true, updatedAt: new Date() }).where(eq(user.id, authUser.id))
      if (staff?.status === 'invited') {
        await db.update(employee).set({ status: 'active', updatedAt: new Date() }).where(eq(employee.id, staff.id))
        await db.insert(auditEvent).values({ id: generateId(), organizationId: staff.orgId, userId: authUser.id, action: 'staff.activated', metadata: { employeeId: staff.id } })
      }
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
    updateAge: 60 * 60 * 24,      // 1 day
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
  ],
})

/** One request-scoped session lookup shared by dashboard layouts and pages. */
export const getCurrentSession = cache(async () =>
  withDatabaseRetry(async () => auth.api.getSession({ headers: await headers() }))
)
