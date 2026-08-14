import type { Metadata } from 'next';
import Link from 'next/link';
import { and, count, desc, eq, gte } from 'drizzle-orm';
import {
  Activity,
  BarChart3,
  Building2,
  ChevronRight,
  CircleCheck,
  CircleDashed,
  CreditCard,
  FileClock,
  Settings,
  ShieldCheck,
  Smartphone,
  Store,
  UsersRound,
  WalletCards,
} from 'lucide-react';
import { db } from '@/lib/db';
import {
  auditEvent,
  branch,
  businessSettings,
  employee,
  mpesaBusinessAccount,
  organization,
  organizationMembership,
  posTerminal,
} from '@/lib/db/schema';
import { requireDashboardPermission } from '@/lib/auth/dashboard-access';
import { PermissionEnum } from '@/lib/types/permissions';
import { AdminPageHeader } from '@/components/admin/admin-page-header';

export const metadata: Metadata = { title: 'Admin control center | Pesaby' };

export default async function AdminPage() {
  const authorization = await requireDashboardPermission(
    PermissionEnum.ADMIN_ACCESS
  );
  const orgId = authorization.organizationId;
  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const [
    [org],
    [settings],
    [branchCount],
    [staffCount],
    roleRows,
    [terminalCount],
    [mpesaCount],
    [auditToday],
    recentEvents,
  ] = await Promise.all([
    db
      .select({
        name: organization.name,
        currency: organization.currency,
        timezone: organization.timezone,
        country: organization.country,
      })
      .from(organization)
      .where(eq(organization.id, orgId))
      .limit(1),
    db
      .select({ paymentMethods: businessSettings.paymentMethods })
      .from(businessSettings)
      .where(eq(businessSettings.organizationId, orgId))
      .limit(1),
    db
      .select({ value: count() })
      .from(branch)
      .where(eq(branch.organizationId, orgId)),
    db
      .select({ value: count() })
      .from(employee)
      .where(and(eq(employee.orgId, orgId), eq(employee.status, 'active'))),
    db
      .select({ role: organizationMembership.role, value: count() })
      .from(organizationMembership)
      .where(eq(organizationMembership.organizationId, orgId))
      .groupBy(organizationMembership.role),
    db
      .select({ value: count() })
      .from(posTerminal)
      .where(
        and(
          eq(posTerminal.organizationId, orgId),
          eq(posTerminal.status, 'active')
        )
      ),
    db
      .select({ value: count() })
      .from(mpesaBusinessAccount)
      .where(
        and(
          eq(mpesaBusinessAccount.organizationId, orgId),
          eq(mpesaBusinessAccount.active, true)
        )
      ),
    db
      .select({ value: count() })
      .from(auditEvent)
      .where(
        and(
          eq(auditEvent.organizationId, orgId),
          gte(auditEvent.createdAt, dayStart)
        )
      ),
    db
      .select({
        id: auditEvent.id,
        action: auditEvent.action,
        createdAt: auditEvent.createdAt,
      })
      .from(auditEvent)
      .where(eq(auditEvent.organizationId, orgId))
      .orderBy(desc(auditEvent.createdAt))
      .limit(5),
  ]);
  const paymentMethods = Array.isArray(settings?.paymentMethods)
    ? (settings.paymentMethods as string[])
    : [];
  const roles = new Map(roleRows.map((row) => [row.role, Number(row.value)]));
  const integrations = {
    mpesa: Boolean(
      process.env.MPESA_CONSUMER_KEY &&
      process.env.MPESA_CONSUMER_SECRET &&
      process.env.MPESA_SHORTCODE
    ),
    email: Boolean(process.env.BREVO_API_KEY && process.env.EMAIL_FROM_ADDRESS),
  };

  const sections = [
    {
      title: 'Organization',
      description:
        'Business identity, locations, tax, receipts and operating defaults.',
      icon: Building2,
      links: [
        {
          label: 'Business settings',
          href: '/dashboard/settings',
          detail: `${org?.currency ?? 'KES'} · ${org?.timezone ?? 'Africa/Nairobi'}`,
        },
        {
          label: 'Branches',
          href: '/dashboard/admin/branches',
          detail: `${Number(branchCount?.value ?? 0)} configured`,
        },
      ],
    },
    {
      title: 'People & access',
      description:
        'Accounts, roles, branch assignments and permission boundaries.',
      icon: UsersRound,
      links: [
        {
          label: 'Staff accounts',
          href: '/dashboard/staff',
          detail: `${Number(staffCount?.value ?? 0)} active`,
        },
        {
          label: 'Role permissions',
          href: '/dashboard/admin/roles',
          detail: `${roles.size} roles in use`,
        },
      ],
    },
    {
      title: 'Payments',
      description: 'Payment methods, M-Pesa exceptions and register controls.',
      icon: WalletCards,
      links: [
        {
          label: 'Payment defaults',
          href: '/dashboard/settings',
          detail: paymentMethods.length ? paymentMethods.join(', ') : 'Cash',
        },
        {
          label: 'M-Pesa reconciliation',
          href: '/dashboard/pos/mpesa-reconciliation',
          detail: `${Number(mpesaCount?.value ?? 0)} connected account${Number(mpesaCount?.value ?? 0) === 1 ? '' : 's'}`,
        },
        {
          label: 'Registers & shifts',
          href: '/dashboard/operations',
          detail: `${Number(terminalCount?.value ?? 0)} active terminal${Number(terminalCount?.value ?? 0) === 1 ? '' : 's'}`,
        },
      ],
    },
    {
      title: 'Finance & reporting',
      description:
        'Organization-wide financial, purchasing and performance records.',
      icon: BarChart3,
      links: [
        {
          label: 'Financials',
          href: '/dashboard/financials',
          detail: 'Statements and ledger',
        },
        {
          label: 'Reports',
          href: '/dashboard/reports',
          detail: 'Sales, payments and inventory',
        },
        {
          label: 'Invoices',
          href: '/dashboard/invoices',
          detail: 'Customer billing records',
        },
        {
          label: 'Purchases',
          href: '/dashboard/purchases',
          detail: 'Suppliers and procurement',
        },
        {
          label: 'Expenses',
          href: '/dashboard/expenses',
          detail: 'Operating expenditure',
        },
      ],
    },
    {
      title: 'Analytics & insights',
      description:
        'Connected analysis views that were previously outside Admin navigation.',
      icon: Activity,
      links: [
        {
          label: 'Business analytics',
          href: '/dashboard/analytics',
          detail: 'Organization performance overview',
        },
        {
          label: 'Sales analytics',
          href: '/dashboard/sales-analytics',
          detail: 'Trends, channels and sales performance',
        },
        {
          label: 'Inventory analytics',
          href: '/dashboard/inventory-analytics',
          detail: 'Stock health and valuation',
        },
        {
          label: 'Customer analytics',
          href: '/dashboard/customer-analytics',
          detail: 'Customer value and retention',
        },
        {
          label: 'Expense analytics',
          href: '/dashboard/expense-analytics',
          detail: 'Operating-cost analysis',
        },
        {
          label: 'Financial insights',
          href: '/dashboard/financial-insights',
          detail: 'Margins, cash flow and forecasts',
        },
        {
          label: 'Staff performance',
          href: '/dashboard/staff-performance',
          detail: 'Employee sales and productivity',
        },
      ],
    },
    {
      title: 'Security & system',
      description:
        'Audit history, integration health and protected system configuration.',
      icon: ShieldCheck,
      links: [
        {
          label: 'Security administration',
          href: '/dashboard/admin/security',
          detail: 'Sessions, accounts and POS PIN posture',
        },
        {
          label: 'Audit activity',
          href: '/dashboard/admin/audit',
          detail: `${Number(auditToday?.value ?? 0)} event${Number(auditToday?.value ?? 0) === 1 ? '' : 's'} today`,
        },
        {
          label: 'Integrations',
          href: '/dashboard/admin/integrations',
          detail: `${Number(integrations.mpesa) + Number(integrations.email)} configured`,
        },
      ],
    },
  ];

  return (
    <div className="space-y-6 pb-8">
      <AdminPageHeader
        title="Control center"
        description={`Organization-wide administration for ${org?.name ?? 'this workspace'}. Review setup, access, payments and security from one place.`}
      />
      <section
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Administration status"
      >
        <Summary
          icon={Store}
          label="Branches"
          value={Number(branchCount?.value ?? 0)}
          detail={org?.country || 'Organization locations'}
        />
        <Summary
          icon={UsersRound}
          label="Active staff"
          value={Number(staffCount?.value ?? 0)}
          detail={`${roles.get('manager') ?? 0} managers · ${roles.get('admin') ?? 0} admins`}
        />
        <Summary
          icon={Smartphone}
          label="M-Pesa"
          value={integrations.mpesa ? 'Ready' : 'Needs setup'}
          detail={`${Number(mpesaCount?.value ?? 0)} branch accounts`}
          ready={integrations.mpesa}
        />
        <Summary
          icon={Activity}
          label="Audit events today"
          value={Number(auditToday?.value ?? 0)}
          detail="Security and operating activity"
        />
      </section>
      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {sections.map((section) => (
          <AdminSection key={section.title} {...section} />
        ))}
        <article className="app-panel overflow-hidden">
          <div className="border-b p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff3be] text-[#8a6500]">
                <CreditCard className="h-4 w-4" />
              </span>
              <div>
                <h2 className="font-bold">Billing & subscription</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Plan ownership and invoices.
                </p>
              </div>
            </div>
          </div>
          <div className="p-5">
            <Status configured={false} label="Billing provider not connected" />
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              No billing provider or subscription records exist in this
              installation. The Admin console reports this honestly rather than
              exposing non-working controls.
            </p>
          </div>
        </article>
      </section>
      <section className="app-panel overflow-hidden">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="font-bold">Recent organization activity</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Latest persisted audit events.
            </p>
          </div>
          <Link
            href="/dashboard/admin/audit"
            className="text-xs font-bold text-primary"
          >
            View audit log
          </Link>
        </div>
        <div className="divide-y">
          {recentEvents.length ? (
            recentEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between gap-4 px-5 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <FileClock className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate text-sm font-medium">
                    {event.action.replace(/[._-]/g, ' ')}
                  </span>
                </div>
                <time className="shrink-0 text-xs text-muted-foreground">
                  {event.createdAt.toLocaleString('en-KE')}
                </time>
              </div>
            ))
          ) : (
            <p className="p-5 text-sm text-muted-foreground">
              No audit activity recorded yet.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function Summary({
  icon: Icon,
  label,
  value,
  detail,
  ready,
}: {
  icon: typeof Store;
  label: string;
  value: string | number;
  detail: string;
  ready?: boolean;
}) {
  return (
    <article className="app-panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-extrabold tracking-tight">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      {ready !== undefined && (
        <div className="mt-3">
          <Status
            configured={ready}
            label={ready ? 'Configured' : 'Configuration required'}
          />
        </div>
      )}
    </article>
  );
}

function AdminSection({
  title,
  description,
  icon: Icon,
  links,
}: {
  title: string;
  description: string;
  icon: typeof Settings;
  links: Array<{ label: string; href: string; detail: string }>;
}) {
  return (
    <article className="app-panel overflow-hidden">
      <div className="border-b p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff3be] text-[#8a6500]">
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-bold">{title}</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
      </div>
      <div className="divide-y">
        {links.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className="group flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-muted/40"
          >
            <div>
              <p className="text-sm font-semibold">{link.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {link.detail}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>
    </article>
  );
}

function Status({ configured, label }: { configured: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${configured ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}
    >
      {configured ? (
        <CircleCheck className="h-3.5 w-3.5" />
      ) : (
        <CircleDashed className="h-3.5 w-3.5" />
      )}
      {label}
    </span>
  );
}
