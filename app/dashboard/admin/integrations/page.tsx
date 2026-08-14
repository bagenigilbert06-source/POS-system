import type { Metadata } from 'next';
import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { CircleCheck, CircleDashed, Mail, Smartphone } from 'lucide-react';
import { db } from '@/lib/db';
import { branch, mpesaBusinessAccount } from '@/lib/db/schema';
import { requireDashboardPermission } from '@/lib/auth/dashboard-access';
import { PermissionEnum } from '@/lib/types/permissions';
import { AdminPageHeader } from '@/components/admin/admin-page-header';

export const metadata: Metadata = { title: 'Integrations | Pesaby' };

export default async function IntegrationsPage() {
  const authorization = await requireDashboardPermission(
    PermissionEnum.ADMIN_ACCESS
  );
  const accounts = await db
    .select({
      id: mpesaBusinessAccount.id,
      shortcode: mpesaBusinessAccount.shortcode,
      accountType: mpesaBusinessAccount.accountType,
      active: mpesaBusinessAccount.active,
      branchName: branch.name,
    })
    .from(mpesaBusinessAccount)
    .innerJoin(branch, eq(branch.id, mpesaBusinessAccount.branchId))
    .where(
      eq(mpesaBusinessAccount.organizationId, authorization.organizationId)
    );
  const mpesaConfigured = Boolean(
    process.env.MPESA_CONSUMER_KEY &&
    process.env.MPESA_CONSUMER_SECRET &&
    process.env.MPESA_SHORTCODE &&
    process.env.MPESA_PASSKEY
  );
  const callbackProtected =
    process.env.MPESA_ENV !== 'production' ||
    Boolean(process.env.MPESA_CALLBACK_SECRET);
  const emailConfigured = Boolean(
    process.env.BREVO_API_KEY && process.env.EMAIL_FROM_ADDRESS
  );
  return (
    <div className="space-y-5 pb-8">
      <AdminPageHeader
        title="Integrations"
        description="Review organization integration readiness without exposing API keys or secrets in the browser."
      />
      <section className="grid gap-4 lg:grid-cols-2">
        <IntegrationCard
          icon={Smartphone}
          title="Safaricom M-Pesa / Daraja"
          configured={mpesaConfigured && callbackProtected}
          details={[
            ['Credentials', mpesaConfigured],
            ['Callback protection', callbackProtected],
            ['Branch accounts', accounts.some((item) => item.active)],
          ]}
        >
          <div className="mt-4 space-y-2">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex justify-between rounded-lg border p-3 text-sm"
              >
                <span>
                  <strong>{account.branchName}</strong>
                  <span className="ml-2 text-muted-foreground capitalize">
                    {account.accountType}
                  </span>
                </span>
                <span className="font-mono">{account.shortcode}</span>
              </div>
            ))}
            {!accounts.length && (
              <p className="text-sm text-muted-foreground">
                No branch shortcode has registered a transaction yet.
              </p>
            )}
          </div>
          <Link
            href="/dashboard/pos/mpesa-reconciliation"
            className="mt-4 inline-flex text-sm font-bold text-primary"
          >
            Open M-Pesa reconciliation
          </Link>
        </IntegrationCard>
        <IntegrationCard
          icon={Mail}
          title="Transactional email"
          configured={emailConfigured}
          details={[
            ['Brevo API connection', Boolean(process.env.BREVO_API_KEY)],
            ['Sender identity', Boolean(process.env.EMAIL_FROM_ADDRESS)],
            ['Staff invitations', emailConfigured],
          ]}
        >
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Used for staff invitations and secure account setup. Provider
            secrets remain server-only environment configuration.
          </p>
        </IntegrationCard>
      </section>
    </div>
  );
}

function IntegrationCard({
  icon: Icon,
  title,
  configured,
  details,
  children,
}: {
  icon: typeof Mail;
  title: string;
  configured: boolean;
  details: Array<[string, boolean]>;
  children: React.ReactNode;
}) {
  return (
    <article className="app-panel p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <Icon className="h-4 w-4" />
        </span>
        <Status
          ready={configured}
          text={configured ? 'Ready' : 'Needs configuration'}
        />
      </div>
      <h2 className="mt-4 text-lg font-bold">{title}</h2>
      <div className="mt-4 divide-y rounded-lg border">
        {details.map(([label, ready]) => (
          <div
            key={label}
            className="flex items-center justify-between px-3 py-2.5 text-sm"
          >
            <span>{label}</span>
            <Status ready={ready} text={ready ? 'Configured' : 'Missing'} />
          </div>
        ))}
      </div>
      {children}
    </article>
  );
}
function Status({ ready, text }: { ready: boolean; text: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${ready ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}
    >
      {ready ? (
        <CircleCheck className="h-3.5 w-3.5" />
      ) : (
        <CircleDashed className="h-3.5 w-3.5" />
      )}
      {text}
    </span>
  );
}
