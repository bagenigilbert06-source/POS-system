import net from 'node:net';
import { getCurrentSession } from '@/lib/auth';

export const runtime = 'nodejs';

const CONNECT_TIMEOUT_MS = 4_000;
const MAX_HTML_LENGTH = 250_000;

function configuredTarget() {
  const host = process.env.POS_RAW_PRINTER_HOST?.trim();
  const port = Number(process.env.POS_RAW_PRINTER_PORT || '9100');
  if (!host || !Number.isInteger(port) || port < 1 || port > 65_535)
    return null;
  return { host, port, uri: `tcp://${host}:${port}` };
}

function htmlToReceiptText(html: string) {
  return (
    html
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(
        /<hr\b[^>]*>/gi,
        '\n------------------------------------------\n'
      )
      .replace(/<br\s*\/?>/gi, '\n')
      // Receipt rows use adjacent spans for their columns. Add separators before
      // stripping markup so RAW TCP output remains legible in monospaced text.
      .replace(/<\/span>/gi, '    ')
      .replace(/<\/(div|p|h[1-6]|li|tr|section|header|footer)>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\s*SKU:/gi, '\nSKU:')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

function escPosPayload(text: string, copies: number) {
  const chunks: Buffer[] = [];
  for (let copy = 0; copy < copies; copy += 1) {
    chunks.push(Buffer.from([0x1b, 0x40]));
    chunks.push(
      Buffer.from(`${text}\n\n\n`, 'utf8'),
      Buffer.from([0x1d, 0x56, 0x00])
    );
  }
  return Buffer.concat(chunks);
}

async function send(target: { host: string; port: number }, payload?: Buffer) {
  await new Promise<void>((resolve, reject) => {
    const socket = net.createConnection({
      host: target.host,
      port: target.port,
    });
    const timer = setTimeout(
      () => socket.destroy(new Error('Printer connection timed out')),
      CONNECT_TIMEOUT_MS
    );
    socket.once('error', reject);
    socket.once('connect', () => {
      clearTimeout(timer);
      if (!payload) {
        socket.end();
        resolve();
        return;
      }
      socket.end(payload, resolve);
    });
  });
}

async function authorize() {
  return Boolean((await getCurrentSession())?.user);
}

export async function HEAD(request: Request) {
  if (!(await authorize())) return new Response(null, { status: 401 });
  const target = configuredTarget();
  if (!target || request.headers.get('x-printer-target') !== target.uri)
    return new Response(null, { status: 404 });
  try {
    await send(target);
    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!(await authorize()))
    return new Response('Unauthorized', { status: 401 });
  const target = configuredTarget();
  if (!target)
    return new Response('RAW TCP printer is not configured', { status: 503 });
  const body = (await request.json().catch(() => null)) as {
    target?: unknown;
    html?: unknown;
    copies?: unknown;
  } | null;
  if (
    !body ||
    body.target !== target.uri ||
    typeof body.html !== 'string' ||
    body.html.length > MAX_HTML_LENGTH
  )
    return new Response('Invalid or unapproved printer target', {
      status: 400,
    });
  const text = htmlToReceiptText(body.html);
  if (!text) return new Response('Receipt is empty', { status: 400 });
  try {
    await send(
      target,
      escPosPayload(text, Math.max(1, Math.min(3, Number(body.copies) || 1)))
    );
    return Response.json({ submitted: true });
  } catch (error) {
    console.error('RAW TCP receipt print failed', error);
    return new Response('Could not connect to RAW TCP printer', {
      status: 503,
    });
  }
}
