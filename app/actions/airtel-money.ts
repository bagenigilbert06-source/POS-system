'use server';

import { z } from 'zod';
import { requirePermission } from '@/lib/auth/authorization';
import { PermissionEnum } from '@/lib/types/permissions';
import { generateId } from '@/lib/utils';

const requestSchema = z.object({
  phone: z.string().trim().min(9).max(16),
  amount: z.number().finite().positive(),
});

function config() {
  const clientId = process.env.AIRTEL_CLIENT_ID?.trim();
  const clientSecret = process.env.AIRTEL_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret)
    throw new Error(
      'Airtel Money is not configured. Add the Airtel client ID and secret in Settings.'
    );
  const environment =
    process.env.AIRTEL_ENV === 'production' ? 'production' : 'sandbox';
  return {
    clientId,
    clientSecret,
    country: process.env.AIRTEL_COUNTRY?.trim().toUpperCase() || 'KE',
    currency: process.env.AIRTEL_CURRENCY?.trim().toUpperCase() || 'KES',
    baseUrl:
      environment === 'production'
        ? 'https://openapi.airtel.africa'
        : 'https://openapiuat.airtel.africa',
  };
}

async function airtelToken(settings: ReturnType<typeof config>) {
  const response = await fetch(`${settings.baseUrl}/auth/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: '*/*' },
    body: JSON.stringify({
      client_id: settings.clientId,
      client_secret: settings.clientSecret,
      grant_type: 'client_credentials',
    }),
    cache: 'no-store',
  });
  const payload = (await response.json().catch(() => ({}))) as {
    access_token?: string;
    message?: string;
  };
  if (!response.ok || !payload.access_token)
    throw new Error(payload.message || 'Airtel Money authentication failed');
  return payload.access_token;
}

function kenyaSubscriber(phone: string) {
  const digits = phone.replace(/\D/g, '');
  const local = digits.startsWith('254')
    ? digits.slice(3)
    : digits.startsWith('0')
      ? digits.slice(1)
      : digits;
  if (!/^7\d{8}$/.test(local))
    throw new Error('Enter a valid Kenyan Airtel Money phone number');
  return local;
}

type AirtelPayload = {
  status?: { code?: string; message?: string; success?: boolean };
  data?: {
    transaction?: {
      id?: string;
      airtel_money_id?: string;
      status?: string;
      message?: string;
    };
  };
};
function paymentResult(
  payload: AirtelPayload,
  fallbackId: string
): {
  status: 'success' | 'failed' | 'pending';
  requestId: string;
  reference: string | null;
  message: string;
} {
  const transaction = payload.data?.transaction;
  const raw = String(
    transaction?.status || payload.status?.code || ''
  ).toUpperCase();
  const status: 'success' | 'failed' | 'pending' = [
    'TS',
    'SUCCESS',
    'COMPLETED',
  ].includes(raw)
    ? 'success'
    : ['TF', 'FAILED', 'REJECTED', 'CANCELLED'].includes(raw)
      ? 'failed'
      : 'pending';
  return {
    status,
    requestId: transaction?.id || fallbackId,
    reference: transaction?.airtel_money_id || null,
    message:
      transaction?.message ||
      payload.status?.message ||
      (status === 'pending' ? 'Waiting for customer approval' : ''),
  };
}

export async function initiateAirtelMoneyPayment(
  input: z.infer<typeof requestSchema>
) {
  const data = requestSchema.parse(input);
  await requirePermission(PermissionEnum.POS_SELL);
  const settings = config();
  const token = await airtelToken(settings);
  const requestId = generateId().replaceAll('-', '').slice(0, 24);
  const response = await fetch(`${settings.baseUrl}/merchant/v1/payments/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: '*/*',
      'X-Country': settings.country,
      'X-Currency': settings.currency,
    },
    body: JSON.stringify({
      reference: `POS-${requestId.slice(-8).toUpperCase()}`,
      subscriber: {
        country: settings.country,
        currency: settings.currency,
        msisdn: kenyaSubscriber(data.phone),
      },
      transaction: {
        amount: Number(data.amount.toFixed(2)),
        country: settings.country,
        currency: settings.currency,
        id: requestId,
      },
    }),
    cache: 'no-store',
  });
  const payload = (await response.json().catch(() => ({}))) as AirtelPayload;
  if (!response.ok)
    throw new Error(
      payload.status?.message ||
        'Airtel Money could not send the payment prompt'
    );
  return paymentResult(payload, requestId);
}

export async function getAirtelMoneyPaymentStatus(requestIdInput: string) {
  const requestId = z.string().trim().min(8).max(80).parse(requestIdInput);
  await requirePermission(PermissionEnum.POS_SELL);
  const settings = config();
  const token = await airtelToken(settings);
  const response = await fetch(
    `${settings.baseUrl}/standard/v1/payments/${encodeURIComponent(requestId)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: '*/*',
        'X-Country': settings.country,
        'X-Currency': settings.currency,
      },
      cache: 'no-store',
    }
  );
  const payload = (await response.json().catch(() => ({}))) as AirtelPayload;
  if (!response.ok)
    throw new Error(
      payload.status?.message || 'Could not check Airtel Money payment'
    );
  return paymentResult(payload, requestId);
}
