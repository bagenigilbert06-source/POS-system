import { getCustomerById } from '@/app/actions/customers';
import { CustomerForm } from '@/components/customers/customer-form';
import { requireWorkspaceModule } from '@/lib/onboarding/require-module';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  CalendarDays,
  Mail,
  MapPin,
  Pencil,
  Phone,
  UserRound,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { isCafeBusiness } from '@/lib/hospitality/rules';

export const metadata: Metadata = { title: 'Edit customer' };

export default async function EditCustomerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { config } = await requireWorkspaceModule('customers');
  const cafeMode = isCafeBusiness(config.businessType, config.businessCategory);
  const label = cafeMode ? 'Guest' : 'Customer';
  const { id } = await params;
  const { mode } = await searchParams;
  const item = await getCustomerById(id);
  if (!item) notFound();
  const name = item.name
    .toLocaleLowerCase()
    .replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase());

  if (mode === 'view')
    return (
      <div className="mx-auto max-w-[1480px] py-2">
        <div className="mx-auto w-full max-w-3xl space-y-5">
          <Link
            href="/dashboard/customers"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {cafeMode ? 'Guests' : 'Customers'}
          </Link>
          <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <header className="flex flex-col gap-4 border-b bg-secondary/30 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <UserRound className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {label} details
                  </p>
                  <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">
                    {name}
                  </h1>
                </div>
              </div>
              <Link
                href={`/dashboard/customers/${item.id}`}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit {label.toLocaleLowerCase()}
              </Link>
            </header>
            <div className="grid gap-5 p-6 sm:grid-cols-2">
              <Detail
                icon={Mail}
                label="Email"
                value={item.email || 'Not provided'}
              />
              <Detail
                icon={Phone}
                label="Phone"
                value={item.phone || 'Not provided'}
              />
              <Detail
                icon={MapPin}
                label="Location"
                value={item.address || 'Not provided'}
              />
              <Detail
                icon={CalendarDays}
                label="Date added"
                value={formatDate(item.createdAt)}
              />
            </div>
          </section>
        </div>
      </div>
    );
  return (
    <div className="mx-auto max-w-[1480px] space-y-6 py-2">
      <div className="mx-auto w-full max-w-3xl">
        <Link
          href="/dashboard/customers"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {cafeMode ? 'Guests' : 'Customers'}
        </Link>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">
          Edit {label.toLocaleLowerCase()}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update {name}&apos;s details for faster checkout.
        </p>
      </div>
      <CustomerForm customer={item} cafeMode={cafeMode} />
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3 rounded-lg border bg-background/50 p-4">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 break-words text-sm text-foreground">{value}</p>
      </div>
    </div>
  );
}
