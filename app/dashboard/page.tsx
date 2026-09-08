import type { Metadata } from 'next';
import { DashboardHome } from '@/components/dashboard/overview/dashboard-home';
import { redirect } from 'next/navigation';
import {
  getAuthorizationContext,
  getDefaultWorkspaceRoute,
} from '@/lib/auth/authorization';
import { EmailVerificationNotice } from '@/components/auth/email-verification-notice';

// This overview is operational data; a browser refresh must render a fresh
// server snapshot rather than a previously cached route payload.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Business overview | Pesaby',
  description:
    'Review the operational records available in your Pesaby workspace.',
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ verified?: string; error?: string }>;
}) {
  const destination = getDefaultWorkspaceRoute(await getAuthorizationContext());
  if (destination !== '/dashboard') redirect(destination);
  const query = await searchParams;
  return (
    <>
      {query?.verified === '1' && (
        <EmailVerificationNotice error={query.error} />
      )}
      <DashboardHome />
    </>
  );
}
