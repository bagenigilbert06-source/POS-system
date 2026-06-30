import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { organization } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify session
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    // Fetch organization
    const orgs = await db
      .select()
      .from(organization)
      .where(eq(organization.id, id))

    if (!orgs || orgs.length === 0) {
      return NextResponse.json(
        { message: 'Workspace not found' },
        { status: 404 }
      )
    }

    const org = orgs[0]

    // Parse workspace config if it exists
    let workspaceConfig = null
    if (org.workspaceConfig) {
      try {
        workspaceConfig = JSON.parse(org.workspaceConfig)
      } catch (e) {
        console.error('Failed to parse workspace config:', e)
      }
    }

    return NextResponse.json({
      success: true,
      workspaceConfig,
      organization: {
        id: org.id,
        name: org.name,
        businessType: org.businessType,
        onboardingCompleted: org.onboardingCompleted,
      },
    })
  } catch (error) {
    console.error('Workspace fetch error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
