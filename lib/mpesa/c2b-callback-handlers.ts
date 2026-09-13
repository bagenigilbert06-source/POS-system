import { after, NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { mpesaBusinessAccount, mpesaPaymentRequest } from '@/lib/db/schema'
import { validCallbackToken } from '@/lib/mpesa/daraja'
import { getBranchMpesaMerchant } from '@/lib/mpesa/merchant-configuration'
import { acceptsBranchC2b } from '@/lib/mpesa/merchant-rules'
import { processDueMpesaProviderEvents } from '@/lib/mpesa/provider-event-processor'
import { ingestSafaricomC2bConfirmation } from '@/lib/mpesa/c2b-ingestion'

type C2bPayload = { TransAmount?: string | number; BillRefNumber?: string; BusinessShortCode?: string | number }

const accepted = () => NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
const rejected = (description: string, status = 400) => NextResponse.json({ ResultCode: 1, ResultDesc: description }, { status })

export async function handleC2bValidation(request: NextRequest) {
  if (!validCallbackToken(request.nextUrl.searchParams.get('token'), 'c2b-validation')) return rejected('Rejected', 401)
  let payload: C2bPayload
  try { payload = await request.json() as C2bPayload } catch { return rejected('Invalid request') }
  const reference = String(payload.BillRefNumber || '').trim().toUpperCase()
  const amount = Number(payload.TransAmount)
  const shortcode = String(payload.BusinessShortCode || '').trim()
  const [account] = await db.select().from(mpesaBusinessAccount).where(and(eq(mpesaBusinessAccount.shortcode, shortcode), eq(mpesaBusinessAccount.active, true))).limit(1)
  if (!account) return rejected('Unregistered business shortcode')
  const merchant = await getBranchMpesaMerchant(account.organizationId, account.branchId)
  if (!acceptsBranchC2b({ configuredTill: merchant?.tillNumber ?? null, configuredProviderIdentifier: account.shortcode, callbackMerchantIdentifier: shortcode, manualTillEnabled: Boolean(merchant?.manualTillEnabled) }))
    return rejected('Merchant Till is not enabled')
  if (!Number.isFinite(amount) || amount <= 0) return rejected('Enter a valid amount')
  if (account.accountType === 'till') return accepted()
  const [payment] = await db.select({ amount: mpesaPaymentRequest.amount }).from(mpesaPaymentRequest).where(and(
    eq(mpesaPaymentRequest.organizationId, account.organizationId), eq(mpesaPaymentRequest.branchId, account.branchId),
    eq(mpesaPaymentRequest.accountReference, reference), eq(mpesaPaymentRequest.paymentMode, 'paybill'), eq(mpesaPaymentRequest.status, 'AWAITING_CONFIRMATION'),
  )).limit(1)
  if (!payment) return rejected('Use the account reference shown at the till')
  if (Number(payment.amount) !== amount) return rejected('Enter the exact amount shown at the till')
  return accepted()
}

/** Persist first and acknowledge. Financial work is performed by the durable retry worker. */
export async function handleC2bConfirmation(request: NextRequest) {
  if (!validCallbackToken(request.nextUrl.searchParams.get('token'), 'c2b-confirmation')) return rejected('Rejected', 401)
  let payload: unknown
  try { payload = await request.json() } catch { return rejected('Invalid request') }
  try {
    const ingested = await ingestSafaricomC2bConfirmation(payload)
    if (ingested.eventId) after(async () => { await processDueMpesaProviderEvents(1) })
    return accepted()
  } catch { return rejected('Could not record payment', 503) }
}
