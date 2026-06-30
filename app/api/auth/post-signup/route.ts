import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { OrganizationService } from '@/lib/services/organization-service'

/**
 * POST /api/auth/post-signup
 * Called after successful signup to create initial organization and membership
 */
export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })

    if (!session?.user) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user already has an organization (in case this is called multiple times)
    const existingOrgs = await OrganizationService.getOrganizationsForUser(session.user.id)

    if (existingOrgs.length > 0) {
      return Response.json({
        success: true,
        message: 'Organization already exists',
        organization: existingOrgs[0],
      })
    }

    // Create organization for the user
    const org = await OrganizationService.createOrganizationForUser(
      session.user.id,
      session.user.name || `${session.user.email.split('@')[0]}'s Business`,
      'retail',
      'other_retail'
    )

    return Response.json({
      success: true,
      organization: org,
    })
  } catch (error) {
    console.error('[v0] Post-signup error:', error)
    return Response.json(
      { error: 'Failed to create organization' },
      { status: 500 }
    )
  }
}
