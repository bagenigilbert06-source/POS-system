import { NextResponse } from 'next/server'
import { getAuthorizationContext, getDefaultWorkspaceRoute } from '@/lib/auth/authorization'
export async function GET(request: Request) {
  try { return NextResponse.redirect(new URL(getDefaultWorkspaceRoute(await getAuthorizationContext()), request.url)) }
  catch { return NextResponse.redirect(new URL('/sign-in', request.url)) }
}
