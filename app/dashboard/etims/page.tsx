import Link from 'next/link';
import { and, asc, eq, inArray } from 'drizzle-orm';
import {
  AlertTriangle,
  Box,
  CheckCircle2,
  CircleDot,
  Clock3,
  Settings2,
  ShieldCheck,
} from 'lucide-react';
import { db } from '@/lib/db';
import {
  branch,
  etimsConfiguration,
  etimsProviderCode,
  product,
} from '@/lib/db/schema';
import { requireDashboardPermission } from '@/lib/auth/dashboard-access';
import { PermissionEnum } from '@/lib/types/permissions';
import {
  getEtimsDashboard,
  initializeEtimsDeviceForm,
  saveEtimsProductMapping,
  syncEtimsClassifications,
} from '@/app/actions/etims';
import { getProductFiscalReadiness } from '@/lib/etims/product-readiness';
import {
  getEtimsBranchReadiness,
  type KraOscuBranchReadiness,
} from '@/lib/etims/branch-readiness';
import { EtimsConfigurationPanel } from '@/components/etims/etims-configuration-panel';
import { EtimsBranchSelector } from '@/components/etims/etims-branch-selector';
import {
  EtimsCreditRetryButton,
  EtimsRetryButton,
} from '@/components/etims/etims-retry-button';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge } from '@/components/ui/status-badge';
import { FilterFields, FilterPanel } from '@/components/ui/filter-panel';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  getEtimsProviderCapabilities,
  isEtimsProviderConfigured,
} from '@/lib/etims/provider-factory';

export const metadata = { title: 'eTIMS | Pesaby' };
export const dynamic = 'force-dynamic';

const tabs = [
  ['overview', 'Overview'],
  ['onboarding', 'Onboarding'],
  ['invoices', 'Fiscal invoices'],
  ['exceptions', 'Exceptions'],
  ['credits', 'Credit notes'],
  ['mapping', 'Product mapping'],
  ['settings', 'Settings'],
] as const;
type Dashboard = Awaited<ReturnType<typeof getEtimsDashboard>>;
type Configuration = {
  connectionStatus: string;
  environment: string;
  integrationMethod: string;
  providerName: string;
  businessKraPin: string | null;
  externalBranchId: string | null;
  deviceId: string | null;
  lastConnectionSuccessAt: Date | null;
  lastConnectionTestAt: Date | null;
  lastConnectionMessage: string | null;
  lastStatusCheckAt: Date | null;
  lastSuccessfulStatusCheckAt: Date | null;
  providerReference: string | null;
};
function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
function maskPin(value: string | null) {
  if (!value) return 'Not provided';
  if (value.length <= 4) return '••••';
  return `${value.slice(0, 3)}${'•'.repeat(Math.max(4, value.length - 5))}${value.slice(-2)}`;
}
function shortDevice(value: string | null) {
  if (!value) return 'Not assigned yet';
  return value.length > 24 ? `${value.slice(0, 15)}…${value.slice(-4)}` : value;
}

export default async function EtimsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const auth = await requireDashboardPermission(PermissionEnum.ETIMS_VIEW);
  const params = await searchParams;
  const tab = one(params.tab) ?? 'overview';
  const selectedBranchId = one(params.branch);
  const branchScope = auth.isOrganizationWide
    ? undefined
    : inArray(branch.id, auth.branchIds.length ? auth.branchIds : ['']);
  const branches = await db
    .select({ id: branch.id, name: branch.name, code: branch.code })
    .from(branch)
    .where(and(eq(branch.organizationId, auth.organizationId), branchScope))
    .orderBy(asc(branch.name));
  const branchId =
    selectedBranchId && branches.some((item) => item.id === selectedBranchId)
      ? selectedBranchId
      : branches[0]?.id;
  const configurations = await db
    .select({
      branchId: etimsConfiguration.branchId,
      enabled: etimsConfiguration.enabled,
      environment: etimsConfiguration.environment,
      integrationMethod: etimsConfiguration.integrationMethod,
      businessKraPin: etimsConfiguration.businessKraPin,
      externalBranchId: etimsConfiguration.externalBranchId,
      vatRegistered: etimsConfiguration.vatRegistered,
      providerName: etimsConfiguration.providerName,
      deviceId: etimsConfiguration.deviceId,
      connectionStatus: etimsConfiguration.connectionStatus,
      lastConnectionTestAt: etimsConfiguration.lastConnectionTestAt,
      lastConnectionSuccessAt: etimsConfiguration.lastConnectionSuccessAt,
      lastConnectionMessage: etimsConfiguration.lastConnectionMessage,
      lastStatusCheckAt: etimsConfiguration.lastStatusCheckAt,
      lastSuccessfulStatusCheckAt:
        etimsConfiguration.lastSuccessfulStatusCheckAt,
      providerReference: etimsConfiguration.providerReference,
    })
    .from(etimsConfiguration)
    .where(
      and(
        eq(etimsConfiguration.organizationId, auth.organizationId),
        branchId ? eq(etimsConfiguration.branchId, branchId) : undefined
      )
    );
  const config = configurations[0];
  const dashboard = await getEtimsDashboard({
    branchId,
    status: one(params.status),
    receipt: one(params.receipt),
    customer: one(params.customer),
    from: one(params.from),
    to: one(params.to),
    page: Number(one(params.page) ?? 1),
    exceptionsOnly: tab === 'exceptions',
  });
  const branchReadiness = branchId
    ? await getEtimsBranchReadiness(auth.organizationId, branchId)
    : null;
  const canRetry = auth.permissions.includes(PermissionEnum.ETIMS_RETRY);
  const canConfigure = auth.permissions.includes(
    PermissionEnum.ETIMS_CONFIGURE
  );
  const safeConfigs = configurations.map((item) => ({
    ...item,
    environment:
      item.environment === 'production'
        ? ('production' as const)
        : ('sandbox' as const),
    integrationMethod:
      item.integrationMethod === 'VSCU' ? ('VSCU' as const) : ('OSCU' as const),
    businessKraPin: item.businessKraPin ?? '',
    externalBranchId: item.externalBranchId ?? '',
    deviceId: item.deviceId ?? '',
  }));
  const mappingProducts =
    tab === 'mapping'
      ? await db
          .select({
            id: product.id,
            name: product.name,
            sku: product.sku,
            etimsItemCode: product.etimsItemCode,
            etimsItemClassificationCode: product.etimsItemClassificationCode,
            etimsItemTypeCode: product.etimsItemTypeCode,
            etimsOriginCountryCode: product.etimsOriginCountryCode,
            etimsPackagingUnitCode: product.etimsPackagingUnitCode,
            etimsQuantityUnitCode: product.etimsQuantityUnitCode,
            etimsTaxCategory: product.etimsTaxCategory,
            etimsRegistrationStatus: product.etimsRegistrationStatus,
          })
          .from(product)
          .where(
            and(
              eq(product.orgId, auth.organizationId),
              eq(product.isActive, true)
            )
          )
          .orderBy(asc(product.name))
          .limit(200)
      : [];
  const mappingCodes =
    tab === 'mapping' && branchId
      ? await db
          .select({
            type: etimsProviderCode.codeType,
            code: etimsProviderCode.code,
            name: etimsProviderCode.name,
          })
          .from(etimsProviderCode)
          .where(
            and(
              eq(etimsProviderCode.organizationId, auth.organizationId),
              eq(etimsProviderCode.branchId, branchId),
              eq(etimsProviderCode.active, true)
            )
          )
          .orderBy(asc(etimsProviderCode.name))
      : [];

  return (
    <div className="etims-workspace mx-auto max-w-[1480px] space-y-5 pb-8 text-sm">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Tax & compliance / eTIMS
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
            eTIMS Compliance Centre
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Monitor branch readiness, fiscal documents, and transmission
            exceptions.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <EnvironmentBadge config={config} />
          <div className="rounded-lg border border-border bg-card px-2 py-1">
            <EtimsBranchSelector branches={branches} value={branchId} />
          </div>
        </div>
      </header>
      <nav
        className="flex w-full gap-1 overflow-x-auto rounded-lg border border-border bg-muted/40 p-1"
        aria-label="eTIMS sections"
      >
        {tabs.map(([id, label]) => (
          <Link
            key={id}
            href={`?tab=${id}${branchId ? `&branch=${branchId}` : ''}`}
            aria-current={tab === id ? 'page' : undefined}
            className={`whitespace-nowrap rounded-md px-3 py-2 text-xs font-semibold transition-colors ${tab === id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'}`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {tab === 'overview' && !config && (
        <UnconfiguredOverview
          branchId={branchId}
          canConfigure={canConfigure}
          readiness={branchReadiness}
        />
      )}
      {tab === 'overview' && config && (
        <ConfiguredOverview
          dashboard={dashboard}
          config={config}
          branchName={branches.find((item) => item.id === branchId)?.name}
          branchId={branchId}
          canConfigure={canConfigure}
          readiness={branchReadiness}
        />
      )}
      {tab === 'onboarding' && (
        <OnboardingWorkspace
          config={config}
          readiness={dashboard.readiness}
          branchId={branchId}
          canConfigure={canConfigure}
        />
      )}
      {(tab === 'invoices' || tab === 'exceptions') && (
        <>
          <Filters branchId={branchId} params={params} tab={tab} />
          <InvoiceTable
            rows={dashboard.rows}
            canRetry={canRetry}
            empty={
              tab === 'exceptions'
                ? 'Everything looks good. There are no operational fiscal exceptions.'
                : 'No fiscal invoices yet. Fiscal invoices will appear after completed sales are submitted.'
            }
          />
          <Pagination
            page={dashboard.pagination.page}
            pages={dashboard.pagination.pages}
            tab={tab}
            branchId={branchId}
          />
        </>
      )}
      {tab === 'credits' && (
        <CreditTable rows={dashboard.creditRows} canRetry={canRetry} />
      )}
      {tab === 'mapping' && (
        <ProductMappingWorkspace
          readiness={dashboard.readiness}
          products={mappingProducts}
          codes={mappingCodes}
          canConfigure={canConfigure}
          branchId={branchId}
          active={config?.connectionStatus === 'ACTIVE'}
        />
      )}
      {tab === 'settings' &&
        (canConfigure ? (
          <EtimsConfigurationPanel
            branches={branches}
            configurations={safeConfigs}
            selectedBranchId={branchId}
            capabilities={getEtimsProviderCapabilities({
              providerName: config?.providerName ?? 'mock',
            })}
            providerCredentialsConfigured={isEtimsProviderConfigured(
              config?.providerName ?? 'mock'
            )}
          />
        ) : (
          <section className="app-panel p-6 text-xs text-muted-foreground">
            You do not have permission to change branch fiscal settings.
          </section>
        ))}
    </div>
  );
}

function UnconfiguredOverview({
  branchId,
  canConfigure,
  readiness,
}: {
  branchId?: string;
  canConfigure: boolean;
  readiness: KraOscuBranchReadiness | null;
}) {
  const missing = Math.max(0, readiness.total - readiness.ready);
  return (
    <div className="space-y-4">
      <section className="app-panel flex flex-wrap items-center justify-between gap-4 border-amber-500/30 bg-amber-500/[0.06] p-5">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-500" />
          <div>
            <h2 className="text-base font-semibold">
              eTIMS is not configured for this branch
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Connect this branch before fiscal invoices can be transmitted.
            </p>
          </div>
        </div>
        {canConfigure && (
          <Link
            href={`?tab=settings&branch=${branchId ?? ''}`}
            className="rounded-md bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground"
          >
            Set up eTIMS
          </Link>
        )}
      </section>
      <div>
        <h2 className="text-sm font-semibold">Before you go live</h2>
        <div className="mt-2 grid gap-3 md:grid-cols-2">
          <section className="app-panel p-4">
            <p className="text-sm font-semibold">Fiscal connection</p>
            <dl className="mt-3 flex items-center justify-between text-xs">
              <dt className="text-muted-foreground">Status</dt>
              <dd className="font-semibold text-amber-600">Not configured</dd>
            </dl>
            {canConfigure && (
              <Link
                href={`?tab=settings&branch=${branchId ?? ''}`}
                className="mt-4 inline-flex text-xs font-semibold text-primary"
              >
                Set up connection →
              </Link>
            )}
          </section>
          <ProductReadiness readiness={readiness} compact />
        </div>
      </div>
      {missing > 0 && (
        <p className="text-xs text-muted-foreground">
          Complete the connection and fiscal product mapping before processing
          live fiscal invoices.
        </p>
      )}
    </div>
  );
}

function EnvironmentBadge({ config }: { config?: Configuration }) {
  if (!config || config.environment !== 'production')
    return (
      <StatusBadge variant="warning" size="md">
        TEST — NOT A FISCAL DOCUMENT
      </StatusBadge>
    );
  return (
    <StatusBadge
      variant={
        ['CONNECTED', 'ACTIVE'].includes(config.connectionStatus)
          ? 'success'
          : 'danger'
      }
      size="md"
    >
      {['CONNECTED', 'ACTIVE'].includes(config.connectionStatus)
        ? 'LIVE — KRA TRANSMISSION ACTIVE'
        : 'LIVE SETUP INCOMPLETE'}
    </StatusBadge>
  );
}

function OnboardingWorkspace({
  config,
  readiness,
  branchId,
  canConfigure,
}: {
  config?: Configuration;
  readiness: Dashboard['readiness'];
  branchId?: string;
  canConfigure: boolean;
}) {
  const state = readiness;
  if (!state)
    return (
      <section className="app-panel p-5 text-xs text-muted-foreground">
        Select a branch to view KRA OSCU onboarding.
      </section>
    );
  const steps = [
    [
      'KRA OSCU approval',
      state.approval.status === 'APPROVED' ? 'Complete' : 'Pending',
      'Obtain OSCU sandbox approval through KRA.',
      'View onboarding requirements',
    ],
    [
      'Branch and device configured',
      state.configuration.kraPinConfigured &&
      state.configuration.branchIdConfigured &&
      state.configuration.deviceSerialConfigured
        ? 'Complete'
        : 'Not started',
      'KRA PIN, KRA branch ID, and OSCU device serial are required.',
      'Manage branch registration',
    ],
    [
      'OSCU device initialized',
      state.initialization.status === 'ACTIVE'
        ? 'Complete'
        : state.initialization.status === 'READY'
          ? 'Ready'
          : state.initialization.status === 'ERROR'
            ? 'Error'
            : 'Not started',
      'Initialize the approved OSCU device and securely store the communication key.',
      'Initialize OSCU device',
    ],
    [
      'Fiscal reference data synchronized',
      state.referenceData.status === 'COMPLETE'
        ? 'Complete'
        : state.referenceData.status === 'PARTIAL'
          ? 'Partial'
          : 'Not started',
      'Synchronize KRA classifications and required code tables.',
      'Synchronize data',
    ],
    [
      'Active products fiscally mapped',
      state.products.incomplete === 0 ? 'Complete' : 'Needs attention',
      state.products.incomplete === 0
        ? 'All active products have the required fiscal mapping.'
        : `${state.products.ready} / ${state.products.total} ready; ${state.products.incomplete} incomplete${state.products.registrationErrors ? `; ${state.products.registrationErrors} registration error` : ''}.`,
      'Review products requiring attention',
    ],
    [
      'Sandbox fiscal invoice accepted',
      state.sandboxAcceptance.status === 'ACCEPTED'
        ? 'Complete'
        : state.sandboxAcceptance.status,
      'A certification invoice is only complete after the provider returns an accepted result.',
      'View fiscal invoices',
    ],
    [
      'Production enabled',
      'BLOCKED',
      'Production remains protected until every required verification is recorded.',
      'Review activation requirements',
    ],
  ] as const;
  return (
    <section className="app-panel overflow-hidden">
      <div className="border-b bg-muted/40 px-5 py-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-foreground" />
          <div>
            <h2 className="font-semibold text-foreground">Go-live readiness</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Complete each requirement before enabling live fiscal
              transmission.
            </p>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-emerald-600"
            style={{
              width: `${state.progress.percent}%`,
            }}
          />
        </div>
        {canConfigure &&
          state.provider === 'KRA_OSCU' &&
          branchId &&
          state.initialization.status === 'READY' && (
            <form
              action={initializeEtimsDeviceForm}
              className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/5 p-3"
            >
              <input type="hidden" name="branchId" value={branchId} />
              <p className="text-xs text-muted-foreground">
                This makes the first real request only when you explicitly click
                it after KRA confirms the sandbox URL and device approval.
              </p>
              <button className="mt-2 rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground">
                Initialize approved sandbox device
              </button>
            </form>
          )}
      </div>
      <ol className="divide-y divide-border">
        {steps.map(([title, status, description, action], index) => (
          <li
            key={title}
            className="flex flex-wrap items-start gap-3 px-5 py-4"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-background text-xs font-bold text-foreground">
              {index + 1}
            </span>
            <div className="min-w-[220px] flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">
                  {title}
                </h3>
                <ReadinessStatus status={status} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {description}
              </p>
              {config?.lastStatusCheckAt && index === 2 && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Last checked {formatDateTime(config.lastStatusCheckAt)}
                </p>
              )}
            </div>
            <Link
              href={
                index === 3
                  ? '/dashboard/products?fiscal=attention'
                  : index === 4
                    ? `?tab=invoices&branch=${branchId ?? ''}`
                    : `?tab=settings&branch=${branchId ?? ''}`
              }
              className={`rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted ${!canConfigure && index < 3 ? 'pointer-events-none opacity-50' : ''}`}
            >
              {action}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ReadinessStatus({ status }: { status: string }) {
  return (
    <StatusBadge
      size="sm"
      variant={
        status === 'Complete'
          ? 'success'
          : status === 'Blocked'
            ? 'danger'
            : status === 'Needs attention'
              ? 'warning'
              : 'default'
      }
    >
      {status}
    </StatusBadge>
  );
}

function ProductMappingWorkspace({
  readiness,
  products,
  codes,
  canConfigure,
  branchId,
  active,
}: {
  readiness: Dashboard['readiness'];
  products: Array<{
    id: string;
    name: string;
    sku: string | null;
    etimsItemCode: string | null;
    etimsItemClassificationCode: string | null;
    etimsItemTypeCode: string | null;
    etimsOriginCountryCode: string | null;
    etimsPackagingUnitCode: string | null;
    etimsQuantityUnitCode: string | null;
    etimsTaxCategory: string | null;
    etimsRegistrationStatus: string;
  }>;
  codes: Array<{ type: string; code: string; name: string }>;
  canConfigure: boolean;
  branchId?: string;
  active: boolean;
}) {
  const missing = Math.max(0, readiness.total - readiness.ready);
  const list = (type: string) => codes.filter((item) => item.type === type);
  const fields = [
    [
      'classificationCode',
      'Classification',
      'ITEM_CLASSIFICATION',
      'etimsItemClassificationCode',
    ],
    ['itemTypeCode', 'Item type', 'ITEM_TYPE', 'etimsItemTypeCode'],
    ['originCountryCode', 'Origin', 'COUNTRY', 'etimsOriginCountryCode'],
    [
      'packagingUnitCode',
      'Packaging',
      'PACKAGING_UNIT',
      'etimsPackagingUnitCode',
    ],
    [
      'quantityUnitCode',
      'Quantity unit',
      'QUANTITY_UNIT',
      'etimsQuantityUnitCode',
    ],
    ['taxTypeCode', 'Tax type', 'TAX_TYPE', 'etimsTaxCategory'],
  ] as const;
  return (
    <section className="app-panel overflow-hidden">
      <div className="border-b border-border px-5 py-4">
        <h2 className="font-semibold text-foreground">
          Product mapping readiness
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Mappings use persisted official OSCU codes. Managers must register a
          completely mapped item before it becomes ready.
        </p>
      </div>
      <div className="p-5">
        <p className="text-2xl font-bold tabular-nums">
          {readiness.ready} of {readiness.total} active products ready
        </p>
        <p
          className={`mt-1 text-xs ${missing ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}`}
        >
          {missing
            ? `${missing} products require attention.`
            : 'All active products are fiscally ready.'}
        </p>
        <form className="mt-4 flex gap-2">
          <input
            name="q"
            placeholder="Search products"
            className="h-9 min-w-64 rounded-md border bg-background px-3 text-xs"
          />
          <input type="hidden" name="tab" value="mapping" />
          <button className="rounded-md border px-3 text-xs font-semibold">
            Search
          </button>
        </form>
        <div className="mt-4 space-y-3">
          {products.map((item) => {
            const state = getProductFiscalReadiness(item);
            return (
              <form
                action={saveEtimsProductMapping}
                key={item.id}
                className="rounded-lg border border-border p-3"
              >
                <input type="hidden" name="productId" value={item.id} />
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {item.sku ?? 'No SKU'} · {state.message}
                    </p>
                  </div>
                  <StatusBadge
                    size="sm"
                    variant={
                      state.status === 'READY'
                        ? 'success'
                        : state.status === 'REGISTRATION_ERROR'
                          ? 'danger'
                          : 'warning'
                    }
                  >
                    {state.status.replaceAll('_', ' ')}
                  </StatusBadge>
                </div>
                <div className="grid gap-2 md:grid-cols-4">
                  <label className="grid gap-1 text-[10px] font-semibold uppercase text-muted-foreground">
                    Item code
                    <input
                      name="itemCode"
                      defaultValue={item.etimsItemCode ?? ''}
                      maxLength={20}
                      className="h-9 rounded-md border bg-background px-2 text-xs normal-case"
                    />
                  </label>
                  {fields.map(([name, label, type, key]) => (
                    <label
                      key={name}
                      className="grid gap-1 text-[10px] font-semibold uppercase text-muted-foreground"
                    >
                      {label}
                      <select
                        name={name}
                        defaultValue={item[key] ?? ''}
                        className="h-9 rounded-md border bg-background px-2 text-xs normal-case"
                      >
                        <option value="">Select</option>
                        {list(type).map((option) => (
                          <option key={option.code} value={option.code}>
                            {option.code} · {option.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
                {canConfigure && (
                  <button className="mt-3 rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground">
                    Save mapping
                  </button>
                )}
              </form>
            );
          })}
          {!products.length && (
            <p className="py-8 text-center text-xs text-muted-foreground">
              No active products found.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function ConfiguredOverview({
  dashboard,
  config,
  branchName,
  branchId,
  canConfigure,
  readiness,
}: {
  dashboard: Dashboard;
  config: Configuration;
  branchName?: string;
  branchId?: string;
  canConfigure: boolean;
  readiness: KraOscuBranchReadiness | null;
}) {
  return (
    <div className="space-y-4">
      <Connection
        config={config}
        branchName={branchName}
        canConfigure={canConfigure}
        branchId={branchId}
        readiness={readiness}
      />
      <div className="grid gap-3 lg:grid-cols-2">
        <FiscalConnectionCard
          config={config}
          branchName={branchName}
          branchId={branchId}
          readiness={readiness}
        />
        <ProductReadiness
          readiness={readiness?.products ?? dashboard.readiness}
        />
      </div>
      <Attention
        summary={dashboard.summary}
        readiness={readiness?.products ?? dashboard.readiness}
        branchId={branchId}
        connectionStatus={config.connectionStatus}
      />
      {readiness?.connection.status === 'CONNECTED' &&
        dashboard.rows.length > 0 && (
          <RecentInvoices
            rows={dashboard.rows.slice(0, 5)}
            branchId={branchId}
          />
        )}
    </div>
  );
}

function Connection({
  config,
  branchName,
  canConfigure,
  branchId,
  readiness,
}: {
  config: Configuration;
  branchName?: string;
  canConfigure: boolean;
  branchId?: string;
  readiness: KraOscuBranchReadiness | null;
}) {
  const connected = readiness?.connection.status === 'CONNECTED';
  const failed = readiness?.connection.status === 'ERROR';
  const label = readiness?.nextAction.title ?? 'Configure Direct KRA OSCU';
  const subtitle =
    readiness?.nextAction.description ??
    'Enter the KRA-issued Direct OSCU details to begin readiness checks.';
  return (
    <section
      className={`app-panel flex flex-wrap items-center justify-between gap-4 border-l-4 px-4 py-3 ${connected ? 'border-l-emerald-500 bg-emerald-500/[0.035]' : failed ? 'border-l-red-500 bg-red-500/[0.035]' : 'border-l-amber-500 bg-amber-500/[0.035]'}`}
    >
      <div className="flex items-center gap-3">
        {connected ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <CircleDot
            className={`h-5 w-5 ${failed ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}
          />
        )}
        <div>
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
          {readiness?.connection.lastSuccessfulCommunicationAt && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Last successful verification{' '}
              {formatDateTime(
                readiness.connection.lastSuccessfulCommunicationAt
              )}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <p className="max-w-[240px] text-right text-[11px] text-muted-foreground">
          Direct KRA OSCU ·{' '}
          {readiness?.connection.status.replaceAll('_', ' ') ??
            'NOT CONFIGURED'}
        </p>
        {canConfigure && (
          <Link
            href={`?tab=settings&branch=${branchId ?? ''}`}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
          >
            Open settings
          </Link>
        )}
      </div>
    </section>
  );
}

function FiscalConnectionCard({
  config,
  branchName,
  branchId,
  readiness,
}: {
  config: Configuration;
  branchName?: string;
  branchId?: string;
  readiness: KraOscuBranchReadiness | null;
}) {
  const connected = readiness?.connection.status === 'CONNECTED';
  const failed = readiness?.connection.status === 'ERROR';
  const status = readiness?.connection.status ?? 'NOT_CONFIGURED';
  const deviceSerial = readiness?.configuration.deviceSerial;
  return (
    <section className="app-panel p-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold">Fiscal connection</h2>
          <p
            className={`mt-1 text-xs font-semibold ${connected ? 'text-emerald-600' : failed ? 'text-red-600' : 'text-amber-600'}`}
          >
            ● {status.replaceAll('_', ' ')}
          </p>
        </div>
        <Settings2 className="h-4 w-4 text-muted-foreground" />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-2 text-xs">
        <div>
          <dt className="text-muted-foreground">Environment</dt>
          <dd className="mt-0.5 font-medium">
            {config.environment === 'production' ? 'Production' : 'Sandbox'} ·
            Direct KRA OSCU
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">KRA PIN</dt>
          <dd className="mt-0.5 font-medium">
            {maskPin(config.businessKraPin)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">KRA branch</dt>
          <dd className="mt-0.5 font-medium">
            {readiness?.configuration.branchConfigured
              ? `${config.externalBranchId} · ${branchName}`
              : 'Not configured'}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">OSCU device serial</dt>
          <dd
            className="mt-0.5 truncate font-medium"
            title={deviceSerial ?? undefined}
          >
            {deviceSerial ? shortDevice(deviceSerial) : 'Not configured'}
          </dd>
        </div>
      </dl>
      <Link
        href={`?tab=settings&branch=${branchId ?? ''}`}
        className="mt-4 inline-flex text-xs font-semibold text-primary"
      >
        Manage connection →
      </Link>
    </section>
  );
}

function ProductReadiness({
  readiness,
  compact = false,
}: {
  readiness: Dashboard['readiness'];
  compact?: boolean;
}) {
  const missing = Math.max(0, readiness.total - readiness.ready);
  return (
    <section className={`app-panel ${compact ? 'p-4' : 'p-4'}`}>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold">Product readiness</h2>
          <p className="mt-2 text-xl font-bold tabular-nums">
            {readiness.ready} of {readiness.total} ready
          </p>
          <p
            className={`mt-1 text-xs ${missing ? 'text-amber-600' : 'text-muted-foreground'}`}
          >
            {missing
              ? `${missing} products require fiscal configuration`
              : 'All active products are fiscally ready'}
          </p>
        </div>
        <Box className="h-4 w-4 text-muted-foreground" />
      </div>
      <Link
        href="/dashboard/products?fiscal=attention"
        className="mt-4 inline-flex rounded-md border px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
      >
        Review products →
      </Link>
    </section>
  );
}

function Attention({
  summary,
  readiness,
  branchId,
  connectionStatus,
}: {
  summary: Dashboard['summary'];
  readiness: Dashboard['readiness'];
  branchId?: string;
  connectionStatus: string;
}) {
  const failed = Number(summary.failed);
  const retrying = Number(summary.retrying);
  const missing = Math.max(0, readiness.total - readiness.ready);
  const onboarding = [
    'ONBOARDING_REQUIRED',
    'PORTAL_ONBOARDING_REQUIRED',
  ].includes(connectionStatus);
  const total = failed + retrying + missing + (onboarding ? 1 : 0);
  return (
    <section className="app-panel p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold">Needs attention</h2>
          {total === 0 ? (
            <>
              <p className="mt-2 text-sm font-medium text-emerald-600">
                Everything looks good
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                No eTIMS issues require attention.
              </p>
            </>
          ) : (
            <div className="mt-2 space-y-1 text-xs">
              {onboarding && (
                <p className="text-muted-foreground">
                  OSCU onboarding is incomplete
                </p>
              )}
              {failed > 0 && (
                <p>
                  <span className="font-semibold text-red-600">
                    {failed} failed fiscal{' '}
                    {failed === 1 ? 'invoice' : 'invoices'}
                  </span>{' '}
                  ·{' '}
                  <Link
                    href={`?tab=exceptions&branch=${branchId ?? ''}`}
                    className="font-semibold text-primary"
                  >
                    View exceptions →
                  </Link>
                </p>
              )}
              {retrying > 0 && (
                <p>
                  <span className="font-semibold text-amber-600">
                    {retrying} pending retry
                  </span>{' '}
                  ·{' '}
                  <Link
                    href={`?tab=exceptions&branch=${branchId ?? ''}`}
                    className="font-semibold text-primary"
                  >
                    Review →
                  </Link>
                </p>
              )}
              {missing > 0 && (
                <p>
                  <span className="font-semibold text-amber-600">
                    {missing} products need fiscal configuration
                  </span>{' '}
                  ·{' '}
                  <Link
                    href="/dashboard/products?fiscal=attention"
                    className="font-semibold text-primary"
                  >
                    Review products →
                  </Link>
                </p>
              )}
            </div>
          )}
        </div>
        {total > 0 && (
          <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-600">
            {total} items
          </span>
        )}
      </div>
    </section>
  );
}

function RecentInvoices({
  rows,
  branchId,
}: {
  rows: Dashboard['rows'];
  branchId?: string;
}) {
  return (
    <section className="app-panel overflow-hidden">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h2 className="text-base font-semibold">Recent fiscal invoices</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Latest fiscal activity for this branch.
          </p>
        </div>
        {rows.length > 0 && (
          <Link
            href={`?tab=invoices&branch=${branchId ?? ''}`}
            className="text-xs font-semibold text-primary"
          >
            View all fiscal invoices →
          </Link>
        )}
      </div>
      {!rows.length ? (
        <EmptyState
          className="py-7"
          title="No fiscal invoices yet"
          description="Fiscal invoices will appear here after completed sales are successfully processed."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-xs">
            <thead className="border-b bg-muted/20 text-muted-foreground">
              <tr>
                {[
                  'Receipt',
                  'Customer',
                  'Amount',
                  'Status',
                  'Fiscal reference',
                  'Time',
                ].map((item) => (
                  <th key={item} className="px-4 py-2.5 font-medium">
                    {item}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-2.5 font-semibold">
                    <Link href={`/dashboard/sales/${row.saleId}`}>
                      {row.receiptNo}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    {row.customerName ?? 'Walk-in'}
                  </td>
                  <td className="px-4 py-2.5 font-semibold tabular-nums">
                    {formatCurrency(row.amount)}
                  </td>
                  <td className="px-4 py-2.5">
                    <Status value={row.status} />
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[10px]">
                    {row.reference ?? '—'}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {formatDateTime(row.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: string;
}) {
  return (
    <div className="app-panel px-4 py-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p
        className={`mt-1.5 text-xl font-bold tabular-nums ${tone === 'success' ? 'text-emerald-600' : tone === 'warning' ? 'text-amber-600' : tone === 'error' ? 'text-red-600' : ''}`}
      >
        {Number(value)}
      </p>
    </div>
  );
}
function Money({ label, value }: { label: string; value: number }) {
  return (
    <div className="app-panel px-4 py-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-lg font-bold tabular-nums">
        {formatCurrency(value)}
      </p>
    </div>
  );
}
function Status({ value }: { value: string }) {
  const cls =
    value === 'ACCEPTED'
      ? 'bg-emerald-500/10 text-emerald-700'
      : value === 'FAILED'
        ? 'bg-red-500/10 text-red-700'
        : value === 'CREDITED'
          ? 'bg-muted text-muted-foreground'
          : 'bg-amber-500/10 text-amber-700';
  return (
    <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${cls}`}>
      {value.replaceAll('_', ' ')}
    </span>
  );
}

function InvoiceTable({
  rows,
  canRetry,
  empty,
}: {
  rows: Dashboard['rows'];
  canRetry: boolean;
  empty: string;
}) {
  return (
    <section className="app-panel overflow-hidden">
      <div className="border-b px-4 py-3">
        <h2 className="text-base font-semibold">Fiscal invoices</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-xs">
          <thead className="border-b bg-muted/30">
            <tr>
              {[
                'Receipt',
                'Date / customer',
                'Amount',
                'Tax',
                'Fiscal status',
                'Fiscal/CU invoice',
                'Attempts',
                'Last submission',
                'Actions',
              ].map((item) => (
                <th key={item} className="px-4 py-2.5 font-semibold">
                  {item}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-2.5 font-semibold">{row.receiptNo}</td>
                <td className="px-4 py-2.5">
                  {formatDateTime(row.createdAt)}
                  <span className="mt-0.5 block text-muted-foreground">
                    {row.customerName ?? 'Walk-in'}
                  </span>
                </td>
                <td className="px-4 py-2.5 font-semibold">
                  {formatCurrency(row.amount)}
                </td>
                <td className="px-4 py-2.5">{formatCurrency(row.tax)}</td>
                <td className="px-4 py-2.5">
                  <Status value={row.status} />
                </td>
                <td className="px-4 py-2.5 font-mono text-[10px]">
                  {row.reference ?? '—'}
                </td>
                <td className="px-4 py-2.5 text-center">{row.attempts}</td>
                <td className="px-4 py-2.5">
                  {row.lastSubmissionAt
                    ? formatDateTime(row.lastSubmissionAt)
                    : '—'}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-2">
                    <Link
                      href={`/dashboard/sales/${row.saleId}`}
                      className="rounded-md border px-2.5 py-1.5 font-semibold"
                    >
                      View
                    </Link>
                    {canRetry &&
                      ['FAILED', 'RETRYING', 'PENDING'].includes(
                        row.status
                      ) && <EtimsRetryButton id={row.id} />}
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td
                  colSpan={9}
                  className="px-5 py-10 text-center text-xs text-muted-foreground"
                >
                  {empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Filters({
  branchId,
  params,
  tab,
}: {
  branchId?: string;
  params: Record<string, string | string[] | undefined>;
  tab: string;
}) {
  return (
    <FilterPanel>
      <form>
        <FilterFields>
          <input type="hidden" name="tab" value={tab} />
          <input type="hidden" name="branch" value={branchId} />
          {[
            ['status', 'Status'],
            ['receipt', 'Receipt number'],
            ['customer', 'Customer'],
            ['from', 'From'],
            ['to', 'To'],
          ].map(([name, label]) => (
            <label
              key={name}
              className="grid gap-1 text-[10px] font-semibold uppercase text-muted-foreground"
            >
              {label}
              {name === 'status' ? (
                <select
                  name={name}
                  defaultValue={one(params[name]) ?? 'all'}
                  className="h-10 rounded-md border bg-background px-3 text-xs focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                >
                  <option value="all">All statuses</option>
                  {[
                    'PENDING',
                    'SUBMITTING',
                    'ACCEPTED',
                    'RETRYING',
                    'FAILED',
                    'CREDITED',
                  ].map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              ) : (
                <input
                  name={name}
                  type={name === 'from' || name === 'to' ? 'date' : 'text'}
                  defaultValue={one(params[name]) ?? ''}
                  className="h-10 rounded-md border bg-background px-3 text-xs focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
              )}
            </label>
          ))}
          <button className="h-10 rounded-md bg-primary px-4 text-xs font-bold text-primary-foreground">
            Apply filters
          </button>
        </FilterFields>
      </form>
    </FilterPanel>
  );
}
function Pagination({
  page,
  pages,
  tab,
  branchId,
}: {
  page: number;
  pages: number;
  tab: string;
  branchId?: string;
}) {
  if (pages <= 1) return null;
  return (
    <div className="flex justify-end gap-2">
      <Link
        aria-disabled={page <= 1}
        href={`?tab=${tab}&branch=${branchId ?? ''}&page=${Math.max(1, page - 1)}`}
        className="rounded-md border px-3 py-1.5 text-xs"
      >
        Previous
      </Link>
      <span className="px-2 py-1.5 text-xs text-muted-foreground">
        Page {page} of {pages}
      </span>
      <Link
        aria-disabled={page >= pages}
        href={`?tab=${tab}&branch=${branchId ?? ''}&page=${Math.min(pages, page + 1)}`}
        className="rounded-md border px-3 py-1.5 text-xs"
      >
        Next
      </Link>
    </div>
  );
}
function CreditTable({
  rows,
  canRetry,
}: {
  rows: Dashboard['creditRows'];
  canRetry: boolean;
}) {
  return (
    <section className="app-panel overflow-hidden">
      <div className="border-b px-4 py-3">
        <h2 className="text-base font-semibold">Credit notes</h2>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Fiscal corrections linked to completed returns.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-xs">
          <thead className="border-b bg-muted/30">
            <tr>
              {[
                'Credit note',
                'Original receipt',
                'Amount',
                'Status',
                'Date',
                'Actions',
              ].map((item) => (
                <th key={item} className="px-4 py-2.5">
                  {item}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b">
                <td className="px-4 py-2.5 font-mono">
                  {row.reference ?? row.returnNo}
                </td>
                <td className="px-4 py-2.5">{row.receiptNo}</td>
                <td className="px-4 py-2.5">{formatCurrency(row.amount)}</td>
                <td className="px-4 py-2.5">
                  <Status value={row.status} />
                </td>
                <td className="px-4 py-2.5">
                  {row.lastAttemptAt ? formatDateTime(row.lastAttemptAt) : '—'}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-2">
                    <Link
                      href={`/dashboard/sales/${row.saleId}`}
                      className="rounded border px-2.5 py-1.5"
                    >
                      View
                    </Link>
                    {canRetry &&
                      ['FAILED', 'RETRYING', 'PENDING'].includes(
                        row.status
                      ) && <EtimsCreditRetryButton id={row.id} />}
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-10 text-center text-muted-foreground"
                >
                  No fiscal credit notes yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
