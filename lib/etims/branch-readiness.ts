import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  etimsBranchSecret,
  etimsConfiguration,
  etimsProviderCode,
  etimsSubmission,
  product,
} from '@/lib/db/schema';

export type KraOscuBranchReadiness = {
  provider: 'KRA_OSCU' | 'OTHER';
  environment: 'sandbox' | 'production';
  configuration: {
    kraPinConfigured: boolean;
    branchIdConfigured: boolean;
    deviceSerialConfigured: boolean;
    deviceSerial: string | null;
  };
  approval: { status: 'PENDING' | 'APPROVED' };
  initialization: { status: 'NOT_STARTED' | 'READY' | 'ACTIVE' | 'ERROR' };
  connection: {
    status:
      | 'NOT_CONFIGURED'
      | 'INITIALIZATION_REQUIRED'
      | 'INITIALIZING'
      | 'CONNECTED'
      | 'ERROR';
    lastSuccessfulCommunicationAt: Date | null;
  };
  referenceData: { status: 'NOT_STARTED' | 'PARTIAL' | 'COMPLETE' };
  products: {
    total: number;
    ready: number;
    incomplete: number;
    registrationErrors: number;
  };
  sandboxAcceptance: {
    status: 'NOT_STARTED' | 'PENDING' | 'ACCEPTED' | 'FAILED';
  };
  production: { enabled: boolean; blockedReasons: string[] };
  progress: { completed: number; total: 6; percent: number };
  nextAction: {
    title: string;
    description: string;
    tab: 'settings' | 'onboarding' | 'mapping' | 'invoices';
  };
};

const isRealDeviceSerial = (value: string | null) =>
  Boolean(value && !/^PESABY-/i.test(value));

export async function getEtimsBranchReadiness(
  organizationId: string,
  branchId: string
): Promise<KraOscuBranchReadiness> {
  const [config] = await db
    .select()
    .from(etimsConfiguration)
    .where(
      and(
        eq(etimsConfiguration.organizationId, organizationId),
        eq(etimsConfiguration.branchId, branchId)
      )
    )
    .limit(1);
  if (!config || config.providerName !== 'KRA_OSCU')
    return build({
      provider: 'OTHER',
      environment: 'sandbox',
      pin: false,
      branch: false,
      device: false,
      approval: false,
      active: false,
      error: false,
      secret: false,
      codes: 0,
      products: { total: 0, ready: 0, errors: 0 },
      accepted: false,
      failed: false,
      last: null,
    });
  const [secret, codeCount, products, accepted, failed] = await Promise.all([
    db
      .select({ id: etimsBranchSecret.secretName })
      .from(etimsBranchSecret)
      .where(
        and(
          eq(etimsBranchSecret.organizationId, organizationId),
          eq(etimsBranchSecret.branchId, branchId),
          eq(etimsBranchSecret.provider, 'KRA_OSCU'),
          eq(etimsBranchSecret.environment, config.environment),
          eq(etimsBranchSecret.secretName, 'cmcKey')
        )
      )
      .limit(1),
    db
      .select({ count: sql<number>`count(*)` })
      .from(etimsProviderCode)
      .where(
        and(
          eq(etimsProviderCode.organizationId, organizationId),
          eq(etimsProviderCode.branchId, branchId),
          eq(etimsProviderCode.provider, 'KRA_OSCU'),
          eq(etimsProviderCode.active, true)
        )
      ),
    db
      .select({
        total: sql<number>`count(*)`,
        ready: sql<number>`count(*) filter (where ${product.etimsRegistrationStatus} = 'REGISTERED')`,
        errors: sql<number>`count(*) filter (where ${product.etimsRegistrationStatus} = 'ERROR')`,
      })
      .from(product)
      .where(
        and(eq(product.orgId, organizationId), eq(product.isActive, true))
      ),
    db
      .select({ id: etimsSubmission.id })
      .from(etimsSubmission)
      .where(
        and(
          eq(etimsSubmission.organizationId, organizationId),
          eq(etimsSubmission.branchId, branchId),
          eq(etimsSubmission.provider, 'KRA_OSCU'),
          eq(etimsSubmission.environment, 'sandbox'),
          inArray(etimsSubmission.status, ['ACCEPTED', 'CREDITED'])
        )
      )
      .limit(1),
    db
      .select({ id: etimsSubmission.id })
      .from(etimsSubmission)
      .where(
        and(
          eq(etimsSubmission.organizationId, organizationId),
          eq(etimsSubmission.branchId, branchId),
          eq(etimsSubmission.provider, 'KRA_OSCU'),
          eq(etimsSubmission.environment, 'sandbox'),
          eq(etimsSubmission.status, 'FAILED')
        )
      )
      .limit(1),
  ]);
  return build({
    provider: 'KRA_OSCU',
    environment: config.environment === 'production' ? 'production' : 'sandbox',
    pin: Boolean(config.businessKraPin),
    branch: Boolean(config.externalBranchId),
    device: isRealDeviceSerial(config.deviceId),
    deviceSerial: isRealDeviceSerial(config.deviceId) ? config.deviceId : null,
    approval: config.kraOscuApprovalStatus === 'APPROVED',
    active: config.connectionStatus === 'ACTIVE' && Boolean(secret),
    error: config.connectionStatus === 'ERROR',
    secret: Boolean(secret),
    codes: Number(codeCount[0]?.count ?? 0),
    products: {
      total: Number(products[0]?.total ?? 0),
      ready: Number(products[0]?.ready ?? 0),
      errors: Number(products[0]?.errors ?? 0),
    },
    accepted: Boolean(accepted[0]),
    failed: Boolean(failed[0]),
    last: config.lastConnectionSuccessAt ?? config.lastSuccessfulStatusCheckAt,
  });
}

function build(input: {
  provider: 'KRA_OSCU' | 'OTHER';
  environment: 'sandbox' | 'production';
  pin: boolean;
  branch: boolean;
  device: boolean;
  deviceSerial?: string | null;
  approval: boolean;
  active: boolean;
  error: boolean;
  secret: boolean;
  codes: number;
  products: { total: number; ready: number; errors: number };
  accepted: boolean;
  failed: boolean;
  last: Date | null;
}): KraOscuBranchReadiness {
  const configurationComplete = input.pin && input.branch && input.device;
  const initialization = input.error
    ? 'ERROR'
    : input.active
      ? 'ACTIVE'
      : configurationComplete && input.approval
        ? 'READY'
        : 'NOT_STARTED';
  const connection = input.error
    ? 'ERROR'
    : input.active
      ? 'CONNECTED'
      : configurationComplete && input.approval
        ? 'INITIALIZATION_REQUIRED'
        : input.provider === 'KRA_OSCU'
          ? 'NOT_CONFIGURED'
          : 'NOT_CONFIGURED';
  const productComplete = input.products.total === input.products.ready;
  const referenceData = input.codes
    ? input.codes > 0
      ? 'COMPLETE'
      : 'NOT_STARTED'
    : 'NOT_STARTED';
  const sandboxAcceptance = input.accepted
    ? 'ACCEPTED'
    : input.failed
      ? 'FAILED'
      : input.active
        ? 'PENDING'
        : 'NOT_STARTED';
  const completed =
    Number(input.approval) +
    Number(configurationComplete) +
    Number(input.active) +
    Number(referenceData === 'COMPLETE') +
    Number(productComplete) +
    Number(sandboxAcceptance === 'ACCEPTED');
  const blockedReasons = [
    !input.approval && 'KRA OSCU approval is required.',
    !configurationComplete &&
      'KRA PIN, branch ID, and OSCU device serial are required.',
    !input.active &&
      'OSCU initialization and secure communication key storage are required.',
    referenceData !== 'COMPLETE' &&
      'KRA fiscal reference data must be synchronized.',
    !productComplete && 'All active products must be fiscally ready.',
    sandboxAcceptance !== 'ACCEPTED' &&
      'A sandbox fiscal invoice must be accepted.',
  ].filter(Boolean) as string[];
  const nextAction = !input.approval
    ? {
        title: 'Complete KRA OSCU onboarding',
        description:
          'KRA OSCU approval is required before this branch can be initialized.',
        tab: 'settings' as const,
      }
    : !configurationComplete
      ? {
          title: 'Configure OSCU device',
          description: 'Add the KRA-approved branch ID and OSCU device serial.',
          tab: 'settings' as const,
        }
      : !input.active
        ? {
            title: 'Initialize OSCU device',
            description:
              'The branch is configured and ready for sandbox initialization.',
            tab: 'onboarding' as const,
          }
        : !productComplete
          ? {
              title: 'Complete product fiscal mapping',
              description: `${input.products.total - input.products.ready} active products require eTIMS fiscal configuration.`,
              tab: 'mapping' as const,
            }
          : !input.accepted
            ? {
                title: 'Submit sandbox certification invoice',
                description:
                  'The OSCU connection is active and products are ready.',
                tab: 'invoices' as const,
              }
            : {
                title: 'Sandbox ready',
                description:
                  'The branch is connected and ready for fiscal testing.',
                tab: 'invoices' as const,
              };
  return {
    provider: input.provider,
    environment: input.environment,
    configuration: {
      kraPinConfigured: input.pin,
      branchIdConfigured: input.branch,
      deviceSerialConfigured: input.device,
      deviceSerial: input.deviceSerial ?? null,
    },
    approval: { status: input.approval ? 'APPROVED' : 'PENDING' },
    initialization: { status: initialization },
    connection: {
      status: connection,
      lastSuccessfulCommunicationAt: input.last,
    },
    referenceData: { status: referenceData },
    products: {
      total: input.products.total,
      ready: input.products.ready,
      incomplete: input.products.total - input.products.ready,
      registrationErrors: input.products.errors,
    },
    sandboxAcceptance: { status: sandboxAcceptance },
    production: { enabled: false, blockedReasons },
    progress: {
      completed,
      total: 6,
      percent: Math.round((completed / 6) * 100),
    },
    nextAction,
  };
}
