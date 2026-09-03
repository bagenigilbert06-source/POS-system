import { getCustomers } from '@/app/actions/customers';
import { CustomersClient } from '@/components/customers/customers-client';
import { Users } from 'lucide-react';
import type { Metadata } from 'next';
import { requireWorkspaceModule } from '@/lib/onboarding/require-module';
import { isCafeBusiness } from '@/lib/hospitality/rules';

export const metadata: Metadata = { title: 'Customers' };

export default async function CustomersPage() {
  const { config } = await requireWorkspaceModule('customers');
  const cafeMode = isCafeBusiness(config.businessType, config.businessCategory);
  const customers = await getCustomers();

  return (
    <div className="mx-auto max-w-[1480px] space-y-6 pb-8">
      <header className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-[#ffd60a]/10 dark:text-[#ffd60a]">
          <Users className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {cafeMode ? 'Guests' : 'Customers'}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {cafeMode
              ? 'Find regular guests and make repeat counter service faster.'
              : 'Find and manage everyone connected to your sales.'}
          </p>
        </div>
      </header>

      <CustomersClient initialCustomers={customers} cafeMode={cafeMode} />
    </div>
  );
}
