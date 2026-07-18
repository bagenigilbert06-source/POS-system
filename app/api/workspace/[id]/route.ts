import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WorkspaceService } from '@/lib/services/workspace-service'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  try {
    const { id } = await context.params
    const workspaceConfig = await WorkspaceService.getWorkspaceConfig(id, session.user.id)
    if (!workspaceConfig) return NextResponse.json({ message: 'Workspace not found' }, { status: 404 })
    return NextResponse.json({ success: true, workspaceConfig })
  } catch {
    console.error('[workspace/get] Unable to load workspace configuration')
    return NextResponse.json({ message: 'Unable to load workspace configuration.' }, { status: 500 })
  }
}
