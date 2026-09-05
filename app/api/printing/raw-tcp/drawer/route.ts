import net from 'node:net';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { auditEvent, posSession, posTerminal, sale } from '@/lib/db/schema';
import { getPosAuthorizationContext } from '@/lib/pos/pos-auth';

export const runtime = 'nodejs';
const inputSchema = z.union([
  z.object({ manualRequestId: z.string().min(8).max(120) }),
  z.object({ saleId: z.string().min(1).max(120) }),
]);

function configuredTarget() {
  const host = process.env.POS_RAW_PRINTER_HOST?.trim(),
    port = Number(process.env.POS_RAW_PRINTER_PORT || '9100');
  return host && Number.isInteger(port) && port > 0 && port <= 65_535
    ? { host, port, uri: `tcp://${host}:${port}` }
    : null;
}

async function pulse(target: { host: string; port: number }) {
  await new Promise<void>((resolve, reject) => {
    const socket = net.createConnection(target);
    const timer = setTimeout(
      () => socket.destroy(new Error('Printer connection timed out')),
      4_000
    );
    socket.once('error', reject);
    socket.once('connect', () => {
      clearTimeout(timer);
      socket.end(Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa]), resolve);
    });
  });
}

export async function POST(request: Request) {
  const authorization = await getPosAuthorizationContext();
  if (!authorization) return new Response('Unauthorized', { status: 401 });
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return new Response('Invalid drawer request', { status: 400 });
  const target = configuredTarget();
  if (!target)
    return new Response('RAW TCP drawer printer is not configured', {
      status: 503,
    });

  let terminalId: string | null = null;
  let sessionId: string | null = null;
  if ('saleId' in parsed.data) {
    const [record] = await db
      .select({ terminalId: posSession.terminalId, sessionId: posSession.id })
      .from(sale)
      .innerJoin(posSession, eq(posSession.id, sale.posSessionId))
      .where(
        and(
          eq(sale.id, parsed.data.saleId),
          eq(sale.orgId, authorization.organizationId),
          eq(sale.status, 'completed'),
          eq(sale.paymentMethod, 'cash'),
          eq(posSession.status, 'open')
        )
      )
      .limit(1);
    terminalId = record?.terminalId ?? null;
    sessionId = record?.sessionId ?? null;
  } else {
    const [event] = await db
      .select({ metadata: auditEvent.metadata })
      .from(auditEvent)
      .where(
        and(
          eq(auditEvent.organizationId, authorization.organizationId),
          eq(auditEvent.action, 'cash_drawer.manual_open_requested'),
          eq(auditEvent.id, parsed.data.manualRequestId)
        )
      )
      .limit(1);
    const metadata = event?.metadata as
      | { terminalId?: unknown; sessionId?: unknown }
      | undefined;
    terminalId =
      typeof metadata?.terminalId === 'string' ? metadata.terminalId : null;
    sessionId =
      typeof metadata?.sessionId === 'string' ? metadata.sessionId : null;
  }
  if (!terminalId || terminalId !== authorization.terminalId)
    return new Response('Drawer request is no longer authorized', {
      status: 403,
    });
  const dispatchAction =
    'saleId' in parsed.data
      ? 'cash_drawer.automatic_pulse_dispatched'
      : 'cash_drawer.manual_pulse_dispatched';
  const dispatchReference =
    'saleId' in parsed.data ? parsed.data.saleId : parsed.data.manualRequestId;
  const dispatchKey = 'saleId' in parsed.data ? 'saleId' : 'requestId';
  const [dispatch] = await db
    .select({ id: auditEvent.id })
    .from(auditEvent)
    .where(
      and(
        eq(auditEvent.organizationId, authorization.organizationId),
        eq(auditEvent.userId, authorization.userId),
        eq(auditEvent.action, dispatchAction),
        sql`${auditEvent.metadata}->>${dispatchKey} = ${dispatchReference}`
      )
    )
    .limit(1);
  if (!dispatch)
    return new Response('Drawer pulse was not authorized', { status: 403 });
  const [openSession] = await db
    .select({ id: posSession.id })
    .from(posSession)
    .where(
      and(
        eq(posSession.id, sessionId ?? ''),
        eq(posSession.orgId, authorization.organizationId),
        eq(posSession.terminalId, terminalId),
        eq(posSession.status, 'open')
      )
    )
    .limit(1);
  if (!openSession)
    return new Response('The POS shift is no longer open', { status: 409 });
  const [terminal] = await db
    .select({ id: posTerminal.id })
    .from(posTerminal)
    .where(
      and(
        eq(posTerminal.id, terminalId),
        eq(posTerminal.organizationId, authorization.organizationId),
        eq(posTerminal.status, 'active'),
        eq(posTerminal.printingMode, 'direct'),
        'saleId' in parsed.data
          ? eq(posTerminal.cashDrawerPulse, true)
          : undefined,
        eq(posTerminal.printerIdentifier, target.uri)
      )
    )
    .limit(1);
  if (!terminal)
    return new Response('Configured drawer printer is unavailable', {
      status: 409,
    });
  try {
    await pulse(target);
    return Response.json({ submitted: true });
  } catch {
    return new Response('Could not connect to RAW TCP drawer printer', {
      status: 503,
    });
  }
}
