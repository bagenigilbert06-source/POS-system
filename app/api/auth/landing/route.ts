import { NextResponse } from 'next/server'
import { AuthorizationError, getAuthorizationContext, getDefaultWorkspaceRoute } from '@/lib/auth/authorization'

export async function GET() {
  try {
    return NextResponse.json({ destination: getDefaultWorkspaceRoute(await getAuthorizationContext()) })
  } catch (error) {
    return NextResponse.json({ error: error instanceof AuthorizationError ? error.message : 'Unauthorized' }, { status: 401 })
  }
}
