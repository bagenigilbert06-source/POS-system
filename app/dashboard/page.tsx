/**
 * Dashboard Router
 * Smart router that redirects to business-type-specific dashboards
 * This uses Server Components for optimal performance and SSR
 */

import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { BusinessTypeEnum } from '@/lib/types';

export const metadata: Metadata = { title: 'Dashboard' };

async function getCurrentBusinessType(): Promise<BusinessTypeEnum> {
  // Replace this with the current user's organization business type when auth is wired in here.
  return BusinessTypeEnum.RETAIL;
}

/**
 * Server component that determines business type and redirects
 */
export default async function DashboardPage() {
  // In a production app, this would:
  // 1. Get the current user's session
  // 2. Fetch their organization
  // 3. Check their business type
  // 4. Redirect to the appropriate dashboard

  // For now, we'll default to retail
  // In reality, you'd fetch this from the database
  const businessType = await getCurrentBusinessType();

  // Route to business-type-specific dashboard
  if (businessType === BusinessTypeEnum.RESTAURANT) {
    redirect('/dashboard/restaurant');
  } else if (businessType === BusinessTypeEnum.PHARMACY) {
    redirect('/dashboard/pharmacy');
  }

  redirect('/dashboard/retail');
}
