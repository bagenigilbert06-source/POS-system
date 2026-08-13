import { NextResponse } from 'next/server'
import { and, eq, gt } from 'drizzle-orm'
import { db } from '@/lib/db'
import { product, wirelessScannerEvent, wirelessScannerSession } from '@/lib/db/schema'
import { generateId, normalizeBarcode } from '@/lib/utils'
import { hashWirelessScannerToken } from '@/lib/pos/wireless-scanner'

export async function POST(request: Request) {
  try {
    const body = await request.json() as { token?: string; barcode?: string; clientEventId?: string }
    const token = body.token?.trim() ?? ''
    const barcode = normalizeBarcode(body.barcode ?? '')
    const clientEventId = body.clientEventId?.trim().slice(0, 100) ?? ''
    if (!token || !barcode || !clientEventId || barcode.length > 128) return NextResponse.json({ error: 'Invalid scan' }, { status: 400 })
    const [session] = await db.select().from(wirelessScannerSession).where(and(eq(wirelessScannerSession.tokenHash, hashWirelessScannerToken(token)), eq(wirelessScannerSession.status, 'active'), gt(wirelessScannerSession.expiresAt, new Date()))).limit(1)
    if (!session) return NextResponse.json({ error: 'Pairing expired. Pair the phone again.' }, { status: 410 })
    const matches = await db.select({ id: product.id, name: product.name, stock: product.stock }).from(product).where(and(eq(product.orgId, session.organizationId), eq(product.barcode, barcode), eq(product.isActive, true))).limit(2)
    if (!matches.length) return NextResponse.json({ error: `No product is registered with barcode ${barcode}.` }, { status: 404 })
    if (matches.length > 1) return NextResponse.json({ error: 'This barcode belongs to multiple products. Correct the catalogue first.' }, { status: 409 })
    if (matches[0].stock <= 0) return NextResponse.json({ error: `${matches[0].name} is out of stock.` }, { status: 409 })
    await db.transaction(async (tx) => {
      await tx.update(wirelessScannerSession).set({ lastSeenAt: new Date() }).where(eq(wirelessScannerSession.id, session.id))
      await tx.insert(wirelessScannerEvent).values({ id: generateId(), sessionId: session.id, barcode, clientEventId }).onConflictDoNothing()
    })
    return NextResponse.json({ accepted: true, product: { name: matches[0].name } }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'Unable to send scan' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token') ?? ''
  if (!token) return NextResponse.json({ active: false }, { status: 400 })
  const [session] = await db.select({ id: wirelessScannerSession.id }).from(wirelessScannerSession).where(and(eq(wirelessScannerSession.tokenHash, hashWirelessScannerToken(token)), eq(wirelessScannerSession.status, 'active'), gt(wirelessScannerSession.expiresAt, new Date()))).limit(1)
  if (!session) return NextResponse.json({ active: false }, { status: 410 })
  await db.update(wirelessScannerSession).set({ lastSeenAt: new Date() }).where(eq(wirelessScannerSession.id, session.id))
  return NextResponse.json({ active: true }, { headers: { 'Cache-Control': 'no-store' } })
}
