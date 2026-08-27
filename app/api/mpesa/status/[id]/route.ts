import { and, eq } from 'drizzle-orm'
import { getAuthorizationContext } from '@/lib/auth/authorization'
import { db } from '@/lib/db'
import { mpesaPaymentRequest } from '@/lib/db/schema'
import { getPosAuthorizationContext } from '@/lib/pos/pos-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await getPosAuthorizationContext() ?? await getAuthorizationContext()
  const { id } = await params
  const owned = async () => (await db.select({
    status: mpesaPaymentRequest.status, amount: mpesaPaymentRequest.amount, message: mpesaPaymentRequest.resultDescription,
    receiptNumber: mpesaPaymentRequest.receiptNumber, saleId: mpesaPaymentRequest.saleId,
  }).from(mpesaPaymentRequest).where(and(
    eq(mpesaPaymentRequest.id, id), eq(mpesaPaymentRequest.organizationId, authorization.organizationId),
    eq(mpesaPaymentRequest.userId, authorization.userId),
  )).limit(1))[0]
  if (!await owned()) return new Response('Not found', { status: 404 })

  const encoder = new TextEncoder()
  let timer: ReturnType<typeof setInterval> | undefined
  let closed = false
  const stream = new ReadableStream({
    async start(controller) {
      const send = async () => {
        try {
          const value = await owned()
          if (!value) { closed = true; controller.close(); if (timer) clearInterval(timer); return }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(value)}\n\n`))
          if (value.saleId || ['FAILED', 'CANCELLED', 'EXPIRED'].includes(value.status)) {
            closed = true
            controller.close()
            if (timer) clearInterval(timer)
          }
        } catch { controller.close(); if (timer) clearInterval(timer) }
      }
      await send()
      if (!closed) timer = setInterval(() => void send(), 2_000)
      request.signal.addEventListener('abort', () => { if (timer) clearInterval(timer) }, { once: true })
    },
    cancel() { if (timer) clearInterval(timer) },
  })
  return new Response(stream, { headers: {
    'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive',
  } })
}
