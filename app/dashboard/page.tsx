/**
 * Dashboard Router
 * Smart router that redirects to business-type-specific dashboards
 * This uses Server Components for optimal performance and SSR
 */

import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Dashboard' };

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
  const businessType = 'retail'; // This should come from the user's organization

  // Route to business-type-specific dashboard
  if (businessType === 'restaurant') {
    redirect('/dashboard/restaurant');
  } else if (businessType === 'pharmacy') {
    redirect('/dashboard/pharmacy');
  } else {
    redirect('/dashboard/retail');
  }
}
