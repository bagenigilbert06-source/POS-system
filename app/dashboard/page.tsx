import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { OrganizationService } from '@/lib/services/organization-service'
import { getDashboardRoute } from '@/lib/templates'

/**
 * /dashboard — server-side redirect to the correct business-type dashboard.
 *
 * Business Type → Dashboard Route (the ONLY mapping in the codebase):
 *   retail      → /dashboard/retail
 *   restaurant  → /dashboard/restaurant
 *   pharmacy    → /dashboard/pharmacy
 *
 * No if/else chains — getDashboardRoute() reads from the template registry.
 */
export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const organization = await OrganizationService.getPrimaryOrganization(session.user.id)
  if (!organization) redirect('/onboarding')
  if (!organization.onboardingCompleted) redirect('/onboarding')

  const dashboardRoute = getDashboardRoute(organization.businessType ?? 'retail')
  redirect(dashboardRoute)
}
