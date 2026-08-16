import { NextResponse } from 'next/server'
import { AuthorizationError } from '@/lib/auth/authorization'
import { getComplianceOverview, recordAgeVerification, saveAlcoholSaleHours, saveComplianceLicense, setCustomerBan } from '@/app/actions/compliance'

export async function GET() {
  try {
    return NextResponse.json(await getComplianceOverview(), { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return NextResponse.json({ error: error instanceof AuthorizationError ? error.message : 'Unable to load compliance data' }, { status: error instanceof AuthorizationError ? 403 : 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { action?: string; [key: string]: unknown }
    switch (body.action) {
      case 'record-age-verification': return NextResponse.json(await recordAgeVerification(body as never))
      case 'save-license': return NextResponse.json(await saveComplianceLicense(body as never))
      case 'save-sale-hours': return NextResponse.json(await saveAlcoholSaleHours(body as never))
      case 'set-customer-ban': return NextResponse.json(await setCustomerBan(body as never))
      default: return NextResponse.json({ error: 'Unknown compliance action' }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof AuthorizationError ? error.message : error instanceof Error ? error.message : 'Unable to update compliance data' }, { status: error instanceof AuthorizationError ? 403 : 400 })
  }
}
