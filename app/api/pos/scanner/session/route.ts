import { NextResponse } from 'next/server'
import { and, eq, gt, inArray, isNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { wirelessScannerEvent, wirelessScannerSession } from '@/lib/db/schema'
import { requireAnyPermission } from '@/lib/auth/authorization'
import { PermissionEnum } from '@/lib/types/permissions'
import { getPosAuthorizationContext } from '@/lib/pos/pos-auth'
import { createWirelessScannerToken, hashWirelessScannerToken, WIRELESS_SCANNER_TTL_MS } from '@/lib/pos/wireless-scanner'
import { generateId } from '@/lib/utils'

const permissions = [PermissionEnum.POS_VIEW, PermissionEnum.POS_SELL, PermissionEnum.SALE_CREATE]

async function authorizeScanner() {
  const posAuthorization = await getPosAuthorizationContext()
  if (posAuthorization && posAuthorization.permissions.some((permission) => permissions.includes(permission))) return posAuthorization
  return requireAnyPermission(permissions)
}

export async function POST() {
  try {
    const authorization = await authorizeScanner()
    const token = createWirelessScannerToken()
    const id = generateId()
    const expiresAt = new Date(Date.now() + WIRELESS_SCANNER_TTL_MS)
    await db.transaction(async (tx) => {
      await tx.update(wirelessScannerSession).set({ status: 'closed' }).where(and(
        eq(wirelessScannerSession.organizationId, authorization.organizationId),
        eq(wirelessScannerSession.userId, authorization.userId),
        eq(wirelessScannerSession.status, 'active'),
      ))
      await tx.insert(wirelessScannerSession).values({ id, organizationId: authorization.organizationId, userId: authorization.userId, tokenHash: hashWirelessScannerToken(token), expiresAt })
    })
    return NextResponse.json({ id, token, expiresAt: expiresAt.toISOString() }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function GET(request: Request) {
  try {
    const authorization = await authorizeScanner()
    const sessionId = new URL(request.url).searchParams.get('sessionId') ?? ''
    const [session] = await db.select({ id: wirelessScannerSession.id, lastSeenAt: wirelessScannerSession.lastSeenAt }).from(wirelessScannerSession).where(and(
      eq(wirelessScannerSession.id, sessionId),
      eq(wirelessScannerSession.organizationId, authorization.organizationId),
      eq(wirelessScannerSession.userId, authorization.userId),
      eq(wirelessScannerSession.status, 'active'),
      gt(wirelessScannerSession.expiresAt, new Date()),
    )).limit(1)
    if (!session) return NextResponse.json({ error: 'Scanner session expired' }, { status: 404 })
    const events = await db.select({ id: wirelessScannerEvent.id, barcode: wirelessScannerEvent.barcode }).from(wirelessScannerEvent).where(and(
      eq(wirelessScannerEvent.sessionId, session.id),
      isNull(wirelessScannerEvent.consumedAt),
    )).orderBy(wirelessScannerEvent.createdAt).limit(20)
    if (events.length) await db.update(wirelessScannerEvent).set({ consumedAt: new Date() }).where(inArray(wirelessScannerEvent.id, events.map((event) => event.id)))
    return NextResponse.json({ events, connected: Boolean(session.lastSeenAt && Date.now() - session.lastSeenAt.getTime() < 15_000) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function DELETE(request: Request) {
  try {
    const authorization = await authorizeScanner()
    const sessionId = new URL(request.url).searchParams.get('sessionId') ?? ''
    await db.update(wirelessScannerSession).set({ status: 'closed' }).where(and(eq(wirelessScannerSession.id, sessionId), eq(wirelessScannerSession.organizationId, authorization.organizationId), eq(wirelessScannerSession.userId, authorization.userId)))
    return NextResponse.json({ closed: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
