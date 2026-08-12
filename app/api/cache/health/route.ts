import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth/authorization'
import { checkRedisCache, invalidateProductCache } from '@/lib/cache/redis-cache'
import { PermissionEnum } from '@/lib/types/permissions'

export async function GET() {
  try {
    await requirePermission(PermissionEnum.SETTINGS_VIEW)
    const status = await checkRedisCache()
    return NextResponse.json(status, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

/** Manual recovery hook for imports or maintenance performed outside the app. */
export async function POST() {
  try {
    const authorization = await requirePermission(PermissionEnum.SETTINGS_EDIT)
    const invalidated = await invalidateProductCache(authorization.organizationId)
    return NextResponse.json({ invalidated, mode: invalidated ? 'redis' : 'database-only' }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
