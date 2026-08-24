'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { authClient } from '@/lib/auth-client';
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  Building2,
  Check,
  CheckCircle2,
  Clock3,
  CreditCard,
  Landmark,
  Loader2,
  ShieldCheck,
  Smartphone,
  Users,
  WalletCards,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BUSINESS_FAMILIES,
  DEFAULT_ONBOARDING_DATA,
  FINANCIAL_YEAR_START_OPTIONS,
  ONBOARDING_STEPS,
  REQUIRED_MODULES,
  WORKING_MODULES,
  categoriesFor,
  categoryLabel,
  familyFor,
  recommendedModules,
  type OnboardingDraft,
  type OnboardingStepId,
} from '@/lib/onboarding/config';
import { ReceiptTemplate } from '@/components/receipt/receipt-template';

type FieldErrors = Record<string, string[] | undefined>;

const STEP_LABELS: Record<OnboardingStepId, string> = {
  welcome: 'Welcome',
  'business-details': 'Business',
  'business-type': 'Type',
  operations: 'Operations',
  'main-branch': 'Main branch',
  modules: 'Modules',
  'payments-tax': 'Payments & tax',
  receipt: 'Receipt',
  review: 'Review',
};

const OPERATION_OPTIONS: Array<{
  key: keyof OnboardingDraft;
  title: string;
  description: string;
}> = [
  {
    key: 'sellsProducts',
    title: 'Sell products',
    description: 'Products are part of daily sales.',
  },
  {
    key: 'providesServices',
    title: 'Provide services',
    description: 'Services are sold or recorded.',
  },
  {
    key: 'tracksInventory',
    title: 'Track inventory',
    description: 'Monitor stock levels and movement.',
  },
  {
    key: 'hasEmployees',
    title: 'Manage employees',
    description: 'Staff need controlled access.',
  },
  {
    key: 'multipleLocations',
    title: 'Multiple locations',
    description: 'The business operates in more than one place.',
  },
  {
    key: 'keepsCustomers',
    title: 'Keep customer records',
    description: 'Save customer details and activity.',
  },
  {
    key: 'acceptsCash',
    title: 'Accept cash',
    description: 'Record cash payments.',
  },
  {
    key: 'acceptsMpesa',
    title: 'Accept M-Pesa',
    description: 'Record M-Pesa references manually.',
  },
  {
    key: 'acceptsCard',
    title: 'Accept cards',
    description: 'Record card payments manually.',
  },
  {
    key: 'needsTax',
    title: 'Calculate tax',
    description: 'Apply a configured tax rate.',
  },
  {
    key: 'issuesReceipts',
    title: 'Issue receipts',
    description: 'Print or share supported receipts.',
  },
];

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash', icon: Banknote },
  { id: 'mpesa', label: 'M-Pesa', icon: Smartphone },
  { id: 'card', label: 'Card', icon: CreditCard },
  { id: 'bank_transfer', label: 'Bank transfer', icon: Landmark },
  { id: 'other', label: 'Other', icon: WalletCards },
];

const RECEIPT_DISPLAY_OPTIONS: Array<{
  key:
    | 'receiptShowPhone'
    | 'receiptShowAddress'
    | 'receiptShowCashier'
    | 'receiptShowCustomer'
    | 'receiptShowPayment'
    | 'receiptShowQrCode'
    | 'receiptShowItemSku';
  title: string;
  description: string;
}> = [
  {
    key: 'receiptShowPhone',
    title: 'Business phone',
    description: 'Show a contact number in the header.',
  },
  {
    key: 'receiptShowAddress',
    title: 'Business address',
    description: 'Show the location below the name.',
  },
  {
    key: 'receiptShowCashier',
    title: 'Cashier name',
    description: 'Show who completed the sale.',
  },
  {
    key: 'receiptShowCustomer',
    title: 'Customer name',
    description: 'Show the selected customer or walk-in.',
  },
  {
    key: 'receiptShowPayment',
    title: 'Payment details',
    description: 'Show the payment method and reference.',
  },
  {
    key: 'receiptShowQrCode',
    title: 'Receipt QR code',
    description: 'Show a scan-friendly receipt reference.',
  },
  {
    key: 'receiptShowItemSku',
    title: 'Item codes',
    description: 'Show product codes under line items.',
  },
];

function Field({
  label,
  name,
  value,
  onChange,
  error,
  optional,
  type = 'text',
  placeholder,
  autoComplete,
}: {
  label: string;
  name: keyof OnboardingDraft;
  value: string;
  onChange: (name: keyof OnboardingDraft, value: string) => void;
  error?: string[];
  optional?: boolean;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  const errorId = `${String(name)}-error`;
  return (
    <label className="block min-w-0 text-sm font-semibold text-slate-900">
      <span>
        {label}
        {optional && (
          <span className="ml-1 font-normal text-zinc-500">(optional)</span>
        )}
      </span>
      <input
        name={String(name)}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error?.length)}
        aria-describedby={error?.length ? errorId : undefined}
        onChange={(event) => onChange(name, event.target.value)}
        className="mt-2 h-11 w-full rounded-lg border border-zinc-300 bg-white px-3.5 text-sm text-slate-950 outline-none transition-colors placeholder:text-zinc-400 focus:border-slate-900 focus:ring-4 focus:ring-[#ffda32]/45 aria-[invalid=true]:border-red-500"
      />
      {error?.[0] && (
        <span
          id={errorId}
          className="mt-1.5 block text-xs font-medium text-red-700"
        >
          {error[0]}
        </span>
      )}
    </label>
  );
}

function SelectField({
  label,
  name,
  value,
  onChange,
  children,
  error,
}: {
  label: string;
  name: keyof OnboardingDraft;
  value: string;
  onChange: (name: keyof OnboardingDraft, value: string) => void;
  children: React.ReactNode;
  error?: string[];
}) {
  return (
    <label className="block text-sm font-semibold text-slate-900">
      {label}
      <select
        name={String(name)}
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        aria-invalid={Boolean(error?.length)}
        className="mt-2 h-11 w-full rounded-lg border border-zinc-300 bg-white px-3.5 text-sm outline-none focus:border-slate-900 focus:ring-4 focus:ring-[#ffda32]/45"
      >
        {children}
      </select>
      {error?.[0] && (
        <span className="mt-1.5 block text-xs font-medium text-red-700">
          {error[0]}
        </span>
      )}
    </label>
  );
}

function TextareaField({
  label,
  name,
  value,
  onChange,
  error,
  optional,
  placeholder,
}: {
  label: string;
  name: keyof OnboardingDraft;
  value: string;
  onChange: (name: keyof OnboardingDraft, value: string) => void;
  error?: string[];
  optional?: boolean;
  placeholder?: string;
}) {
  const errorId = `${String(name)}-error`;
  return (
    <label className="block min-w-0 text-sm font-semibold text-slate-900">
      <span>
        {label}
        {optional && (
          <span className="ml-1 font-normal text-zinc-500">(optional)</span>
        )}
      </span>
      <textarea
        name={String(name)}
        value={value}
        placeholder={placeholder}
        rows={2}
        aria-invalid={Boolean(error?.length)}
        aria-describedby={error?.length ? errorId : undefined}
        onChange={(event) => onChange(name, event.target.value)}
        className="mt-2 min-h-20 w-full resize-y rounded-lg border border-zinc-300 bg-white px-3.5 py-3 text-sm text-slate-950 outline-none transition-colors placeholder:text-zinc-400 focus:border-slate-900 focus:ring-4 focus:ring-[#ffda32]/45 aria-[invalid=true]:border-red-500"
      />
      {error?.[0] && (
        <span id={errorId} className="mt-1.5 block text-xs font-medium text-red-700">
          {error[0]}
        </span>
      )}
    </label>
  );
}

export function OnboardingContainer({
  initialStep,
  initialData,
  initialRevision,
}: {
  initialStep: OnboardingStepId;
  initialData: OnboardingDraft;
  initialRevision: number;
}) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(
    Math.max(0, ONBOARDING_STEPS.indexOf(initialStep))
  );
  const [maxUnlockedStep, setMaxUnlockedStep] = useState(
    Math.max(0, ONBOARDING_STEPS.indexOf(initialStep))
  );
  const [data, setData] = useState(initialData);
  const [revision, setRevision] = useState(initialRevision);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pageError, setPageError] = useState('');
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [workspaceCreated, setWorkspaceCreated] = useState(false);
  const stepId = ONBOARDING_STEPS[stepIndex];
  const progress = Math.round(
    (stepIndex / (ONBOARDING_STEPS.length - 1)) * 100
  );

  useEffect(() => {
    const current = ONBOARDING_STEPS[stepIndex];
    const url = new URL(window.location.href);
    url.searchParams.set('step', current);
    window.history.replaceState({ onboardingStep: current }, '', url);
    const onPopState = () => {
      const requested = new URL(window.location.href).searchParams.get(
        'step'
      ) as OnboardingStepId | null;
      const index = requested ? ONBOARDING_STEPS.indexOf(requested) : -1;
      if (index >= 0 && index <= maxUnlockedStep) setStepIndex(index);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [maxUnlockedStep, stepIndex]);

  const navigateTo = (index: number) => {
    const nextIndex = Math.max(0, Math.min(index, ONBOARDING_STEPS.length - 1));
    const nextStep = ONBOARDING_STEPS[nextIndex];
    const url = new URL(window.location.href);
    url.searchParams.set('step', nextStep);
    window.history.pushState({ onboardingStep: nextStep }, '', url);
    setStepIndex(nextIndex);
  };

  const update = (
    name: keyof OnboardingDraft,
    value: string | boolean | string[]
  ) => {
    setData((current) => {
      const next = { ...current, [name]: value };
      if (name === 'businessName' && !current.receiptBusinessName)
        next.receiptBusinessName = value as string;
      if (name === 'phone') {
        if (!current.branchPhone) next.branchPhone = value as string;
        if (!current.receiptPhone) next.receiptPhone = value as string;
      }
      if (name === 'region' && !current.branchRegion)
        next.branchRegion = value as string;
      if (name === 'city' && !current.branchCity)
        next.branchCity = value as string;
      return next;
    });
    setErrors((current) => ({ ...current, [name]: undefined }));
    setPageError('');
  };

  const saveStep = async (): Promise<number | false> => {
    setSaving(true);
    setPageError('');
    setErrors({});
    try {
      const synchronizedData =
        stepId === 'operations'
          ? {
              ...data,
              enabledModules: recommendedModules(data),
              paymentMethods: [
                data.acceptsCash && 'cash',
                data.acceptsMpesa && 'mpesa',
                data.acceptsCard && 'card',
              ].filter(Boolean) as string[],
              defaultPaymentMethod: data.acceptsCash
                ? 'cash'
                : data.acceptsMpesa
                  ? 'mpesa'
                  : 'card',
              taxEnabled: data.needsTax,
              pricesIncludeTax: data.needsTax ? data.pricesIncludeTax : false,
              showTaxOnReceipt:
                data.needsTax && data.issuesReceipts
                  ? data.showTaxOnReceipt
                  : false,
            }
          : data;
      const submittedData =
        stepId === 'receipt'
          ? {
              ...synchronizedData,
              receiptBusinessName:
                synchronizedData.receiptBusinessName ||
                synchronizedData.displayName ||
                synchronizedData.businessName,
              receiptPhone:
                synchronizedData.receiptPhone || synchronizedData.phone,
              receiptAddress:
                synchronizedData.receiptAddress ||
                synchronizedData.branchAddress,
              receiptLayout:
                synchronizedData.receiptLayout ??
                DEFAULT_ONBOARDING_DATA.receiptLayout,
              receiptTemplate:
                synchronizedData.receiptTemplate ??
                DEFAULT_ONBOARDING_DATA.receiptTemplate,
              receiptLogoUrl:
                synchronizedData.receiptLogoUrl ??
                DEFAULT_ONBOARDING_DATA.receiptLogoUrl,
              receiptShowPhone:
                synchronizedData.receiptShowPhone ??
                DEFAULT_ONBOARDING_DATA.receiptShowPhone,
              receiptShowAddress:
                synchronizedData.receiptShowAddress ??
                DEFAULT_ONBOARDING_DATA.receiptShowAddress,
              receiptShowCashier:
                synchronizedData.receiptShowCashier ??
                DEFAULT_ONBOARDING_DATA.receiptShowCashier,
              receiptShowCustomer:
                synchronizedData.receiptShowCustomer ??
                DEFAULT_ONBOARDING_DATA.receiptShowCustomer,
              receiptShowPayment:
                synchronizedData.receiptShowPayment ??
                DEFAULT_ONBOARDING_DATA.receiptShowPayment,
              receiptShowQrCode:
                synchronizedData.receiptShowQrCode ??
                DEFAULT_ONBOARDING_DATA.receiptShowQrCode,
              receiptShowItemSku:
                synchronizedData.receiptShowItemSku ??
                DEFAULT_ONBOARDING_DATA.receiptShowItemSku,
            }
          : synchronizedData;
      const response = await fetch('/api/onboarding/save-step', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepId, data: submittedData, revision }),
      });
      const result = await response.json();
      if (!response.ok) {
        setErrors(result.fieldErrors ?? {});
        setPageError(
          result.formErrors?.[0] ??
            result.message ??
            'Check this step and try again.'
        );
        requestAnimationFrame(() =>
          document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
        );
        return false;
      }
      setData(submittedData);
      setRevision(result.revision);
      const serverStepIndex = ONBOARDING_STEPS.indexOf(
        result.currentStep as OnboardingStepId
      );
      setMaxUnlockedStep(
        serverStepIndex >= 0
          ? serverStepIndex
          : Math.min(stepIndex + 1, ONBOARDING_STEPS.length - 1)
      );
      return result.revision as number;
    } catch {
      setPageError(
        'Your progress could not be saved. Check your connection and try again.'
      );
      return false;
    } finally {
      setSaving(false);
    }
  };

  const next = async () => {
    const savedRevision = await saveStep();
    if (!savedRevision) return;
    if (stepId === 'review') {
      setSaving(true);
      try {
        const response = await fetch('/api/onboarding/complete', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ revision: savedRevision }),
        });
        const result = await response.json();
        if (!response.ok) {
          if (result.stepId && ONBOARDING_STEPS.includes(result.stepId))
            navigateTo(ONBOARDING_STEPS.indexOf(result.stepId));
          setPageError(
            result.message ??
              'Workspace creation failed safely. Please try again.'
          );
          return;
        }
        setWorkspaceCreated(true);
      } catch {
        setPageError(
          'Workspace creation failed safely. Check your connection and try again.'
        );
      } finally {
        setSaving(false);
      }
      return;
    }
    navigateTo(Math.min(stepIndex + 1, ONBOARDING_STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const previous = () => {
    setErrors({});
    setPageError('');
    navigateTo(stepIndex - 1);
  };
  const edit = (id: OnboardingStepId) =>
    navigateTo(ONBOARDING_STEPS.indexOf(id));

  const uploadReceiptLogo = async (file?: File) => {
    if (!file) return;
    setLogoUploading(true);
    setPageError('');
    try {
      const body = new FormData();
      body.set('file', file);
      const response = await fetch('/api/onboarding/receipt-logo', {
        method: 'POST',
        credentials: 'include',
        body,
      });
      const result = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !result.url)
        throw new Error(result.error || 'Could not upload logo');
      update('receiptLogoUrl', result.url);
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : 'Could not upload logo'
      );
    } finally {
      setLogoUploading(false);
    }
  };

  const submitLabel = saving
    ? stepId === 'welcome'
      ? 'Preparing setup…'
      : stepId === 'review'
        ? 'Creating workspace…'
        : 'Saving progress…'
    : stepId === 'welcome'
      ? 'Start setup'
      : stepId === 'review'
        ? 'Create my workspace'
        : 'Save & continue';

  const receiptPreview = {
    id: 'preview-sale-001',
    receiptNo: 'PREVIEW-001',
    createdAt: new Date('2026-08-04T10:30:00'),
    subtotal: '2500.00',
    taxAmount: data.taxEnabled ? '400.00' : '0.00',
    discountAmount: '0.00',
    roundingAmount: '0.00',
    total: data.taxEnabled ? '2900.00' : '2500.00',
    paymentMethod: data.defaultPaymentMethod,
    mpesaRef:
      data.defaultPaymentMethod === 'mpesa' ? 'QWE123ABC' : null,
    items: [
      {
        id: 'preview-1',
        productId: 'ITEM-001',
        productName: 'Sample product',
        quantity: 2,
        totalPrice: '1800.00',
      },
      {
        id: 'preview-2',
        productId: 'ITEM-002',
        productName: 'Another item',
        quantity: 1,
        totalPrice: '700.00',
      },
    ],
  };

  const setBusinessFamily = (id: string) => {
    const firstCategory = categoriesFor(id)[0]?.id ?? '';
    setData((current) => ({
      ...current,
      businessFamily: id as OnboardingDraft['businessFamily'],
      businessCategory: firstCategory,
      customBusinessCategory: '',
    }));
    setErrors((current) => ({
      ...current,
      businessFamily: undefined,
      businessCategory: undefined,
      customBusinessCategory: undefined,
    }));
  };

  const setBusinessCategory = (
    _name: keyof OnboardingDraft,
    value: string | boolean | string[]
  ) => {
    const category = String(value);
    setData((current) =>
      category === 'liquor_shop'
        ? {
            ...current,
            businessCategory: category,
            sellsProducts: true,
            providesServices: false,
            tracksInventory: true,
            usesSuppliers: true,
            issuesReceipts: true,
            acceptsCash: true,
            acceptsMpesa: true,
          }
        : { ...current, businessCategory: category }
    );
    setErrors((current) => ({ ...current, businessCategory: undefined }));
    setPageError('');
  };

  if (workspaceCreated) {
    const firstAction = data.enabledModules.includes('products')
      ? { label: 'Add your first product', route: '/dashboard/products' }
      : { label: 'Record your first sale', route: '/dashboard/sales' };
    return (
      <div className="mx-auto max-w-xl py-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.18em] text-[#e42527]">
          Workspace created
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-0.035em] text-slate-950">
          You’re ready to start selling
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          Your business, modules and receipt defaults are saved. Add your first
          records next, then return here anytime from workspace settings.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => router.replace('/dashboard')}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#e42527] px-5 text-sm font-extrabold text-white"
          >
            Go to dashboard <ArrowRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => router.replace(firstAction.route)}
            className="inline-flex min-h-12 items-center justify-center rounded-lg border border-zinc-300 bg-white px-5 text-sm font-extrabold text-slate-950"
          >
            {firstAction.label}
          </button>
        </div>
      </div>
    );
  }

  const renderedStep = (() => {
    if (stepId === 'welcome')
      return (
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-[#ffda32]">
            <Building2 className="h-7 w-7" />
          </div>
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#e42527]">
            Workspace setup
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-[-0.035em] text-slate-950">
            Let’s set up your business
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-zinc-600">
            Tell us how your business operates and Pesaby will prepare the right
            workspace, tools and defaults for you.
          </p>
          <div className="mx-auto mt-6 grid max-w-xl gap-3 text-left sm:grid-cols-3">
            {[
              ['About 10 minutes', Clock3],
              ['Saved each step', ShieldCheck],
              ['Editable later', CheckCircle2],
            ].map(([label, Icon]) => (
              <div
                key={label as string}
                className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-[#fff9ef] p-3 text-sm font-semibold"
              >
                <Icon className="h-5 w-5 text-[#e42527]" />
                {label as string}
              </div>
            ))}
          </div>
          <label className="mx-auto mt-6 flex max-w-xl items-start gap-3 rounded-lg border border-zinc-200 bg-white p-4 text-left text-sm leading-5 text-zinc-700">
            <input
              type="checkbox"
              checked={data.acceptsTerms}
              onChange={(event) => update('acceptsTerms', event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#e42527]"
            />
            <span>
              I agree that Pesaby may use these business details to create and
              operate my workspace. I can update workspace settings later.
            </span>
          </label>
          {errors.acceptsTerms?.[0] && (
            <p className="mx-auto mt-2 max-w-xl text-left text-xs font-semibold text-red-700">
              {errors.acceptsTerms[0]}
            </p>
          )}
          <button
            type="button"
            onClick={async () => {
              await authClient.signOut();
              router.replace('/sign-in');
            }}
            className="mt-6 text-sm font-semibold text-zinc-600 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e42527]"
          >
            Sign out
          </button>
        </div>
      );

    if (stepId === 'business-details')
      return (
        <section>
          <StepTitle
            eyebrow="Business details"
            title="Tell us about your business"
            description="These details become the defaults for your workspace and main location."
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Business name"
              name="businessName"
              value={data.businessName}
              onChange={update}
              error={errors.businessName}
              placeholder="Acme Traders"
              autoComplete="organization"
            />
            <Field
              label="Display name"
              name="displayName"
              value={data.displayName}
              onChange={update}
              error={errors.displayName}
              optional
              placeholder="Name shown to customers"
            />
            <div>
              <SelectField
                label="Country"
                name="country"
                value={data.country}
                onChange={update}
                error={errors.country}
              >
                <option value="KE">Kenya</option>
              </SelectField>
              <p className="mt-1.5 text-xs leading-5 text-zinc-500">
                This workspace currently supports Kenyan currency, tax and
                time-zone defaults.
              </p>
            </div>
            <Field
              label="County or region"
              name="region"
              value={data.region}
              onChange={update}
              error={errors.region}
              placeholder="Nairobi"
              autoComplete="address-level1"
            />
            <Field
              label="City or town"
              name="city"
              value={data.city}
              onChange={update}
              error={errors.city}
              placeholder="Nairobi"
              autoComplete="address-level2"
            />
            <Field
              label="Business phone"
              name="phone"
              value={data.phone}
              onChange={update}
              error={errors.phone}
              placeholder="+254 700 000 000"
              type="tel"
              autoComplete="tel"
            />
            <Field
              label="Business email"
              name="businessEmail"
              value={data.businessEmail}
              onChange={update}
              error={errors.businessEmail}
              optional
              placeholder="hello@business.com"
              type="email"
              autoComplete="email"
            />
            <Field
              label="Website"
              name="website"
              value={data.website}
              onChange={update}
              error={errors.website}
              optional
              placeholder="https://business.com"
              type="url"
            />
            <SelectField
              label="Business size"
              name="businessSize"
              value={data.businessSize}
              onChange={update}
              error={errors.businessSize}
            >
              <option value="solo">Just me</option>
              <option value="small">2–10 people</option>
              <option value="medium">11–50 people</option>
              <option value="large">More than 50 people</option>
            </SelectField>
            <SelectField
              label="Preferred language"
              name="language"
              value={data.language}
              onChange={update}
            >
              <option value="en">English</option>
              <option value="sw">Kiswahili</option>
            </SelectField>
            <SelectField
              label="Time zone"
              name="timezone"
              value={data.timezone}
              onChange={update}
            >
              <option value="Africa/Nairobi">Africa/Nairobi</option>
            </SelectField>
            <SelectField
              label="Default currency"
              name="currency"
              value={data.currency}
              onChange={update}
            >
              <option value="KES">Kenyan shilling (KES)</option>
            </SelectField>
            <SelectField
              label="Financial year starts"
              name="financialYearStart"
              value={data.financialYearStart}
              onChange={update}
              error={errors.financialYearStart}
            >
              {FINANCIAL_YEAR_START_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectField>
            <div className="sm:col-span-2">
              <Field
                label="What does your business sell or provide?"
                name="businessDescription"
                value={data.businessDescription}
                onChange={update}
                error={errors.businessDescription}
                optional
                placeholder="For example, everyday groceries, household goods and delivery services"
              />
            </div>
          </div>
        </section>
      );

    if (stepId === 'business-type')
      return (
        <section>
          <StepTitle
            eyebrow="Business profile"
            title="What kind of business do you run?"
            description="Choose a broad family and then the category that best describes your day-to-day work."
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {BUSINESS_FAMILIES.map(({ id, name, description, icon: Icon }) => {
              const selected = data.businessFamily === id;
              return (
                <button
                  type="button"
                  key={id}
                  aria-pressed={selected}
                  onClick={() => setBusinessFamily(id)}
                  className={cn(
                    'relative flex min-h-32 gap-4 rounded-xl border p-5 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#e42527]',
                    selected
                      ? 'border-slate-950 bg-[#fff4c4]'
                      : 'border-zinc-200 bg-white'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg',
                      selected ? 'bg-[#ffda32]' : 'bg-zinc-100'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block font-extrabold text-slate-950">
                      {name}
                    </span>
                    <span className="mt-1 block text-sm leading-6 text-zinc-600">
                      {description}
                    </span>
                  </span>
                  {selected && (
                    <Check className="absolute right-4 top-4 h-5 w-5 text-[#e42527]" />
                  )}
                </button>
              );
            })}
          </div>
          {errors.businessFamily?.[0] && (
            <p className="mt-2 text-xs font-semibold text-red-700">
              {errors.businessFamily[0]}
            </p>
          )}
          {data.businessFamily && (
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <SelectField
                  label="Business category"
                  name="businessCategory"
                  value={data.businessCategory}
                  onChange={setBusinessCategory}
                  error={errors.businessCategory}
                >
                  <option value="">Select a category</option>
                  {categoriesFor(data.businessFamily).map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </SelectField>
                {data.businessCategory === 'liquor_shop' && (
                  <p className="mt-2 rounded-lg border border-[#e7be16] bg-[#fff8d7] px-3 py-2 text-xs leading-5 text-[#5f4b00]">
                    We’ll prepare a liquor dashboard with checkout, a drinks
                    catalogue, bottle stock, supplier purchasing, reorder
                    alerts, barcode support and sales reporting.
                  </p>
                )}
              </div>
              {data.businessFamily === 'other' && (
                <Field
                  label="Describe your business"
                  name="customBusinessCategory"
                  value={data.customBusinessCategory}
                  onChange={update}
                  error={errors.customBusinessCategory}
                  placeholder="For example, event equipment hire"
                />
              )}
            </div>
          )}
        </section>
      );

    if (stepId === 'operations')
      return (
        <section>
          <StepTitle
            eyebrow="Operations profile"
            title="How does your business work?"
            description="Choose only what applies. These answers shape your modules and settings."
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {OPERATION_OPTIONS.map(({ key, title, description }) => {
              const checked = Boolean(data[key]);
              return (
                <label
                  key={key}
                  className={cn(
                    'cursor-pointer rounded-xl border p-4 transition-colors focus-within:ring-2 focus-within:ring-[#e42527]',
                    checked
                      ? 'border-[#e7be16] bg-[#fff8d7]'
                      : 'border-zinc-200 bg-white'
                  )}
                >
                  <span className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => update(key, event.target.checked)}
                      className="mt-1 h-4 w-4 accent-[#e42527]"
                    />
                    <span>
                      <span className="block text-sm font-extrabold text-slate-950">
                        {title}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-zinc-600">
                        {description}
                      </span>
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </section>
      );

    if (stepId === 'main-branch')
      return (
        <section>
          <StepTitle
            eyebrow="Main branch"
            title="Set up your first location"
            description="Pesaby creates this branch once and gives the workspace owner full access."
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Branch name"
              name="branchName"
              value={data.branchName}
              onChange={update}
              error={errors.branchName}
              placeholder="Main Branch"
            />
            <Field
              label="Branch phone"
              name="branchPhone"
              value={data.branchPhone}
              onChange={update}
              error={errors.branchPhone}
              placeholder="+254 700 000 000"
              type="tel"
            />
            <Field
              label="Address"
              name="branchAddress"
              value={data.branchAddress}
              onChange={update}
              error={errors.branchAddress}
              placeholder="Street and building"
            />
            <Field
              label="County or region"
              name="branchRegion"
              value={data.branchRegion}
              onChange={update}
              error={errors.branchRegion}
              placeholder="Nairobi"
            />
            <Field
              label="City or town"
              name="branchCity"
              value={data.branchCity}
              onChange={update}
              error={errors.branchCity}
              placeholder="Nairobi"
            />
            <SelectField
              label="Time zone"
              name="branchTimezone"
              value={data.branchTimezone}
              onChange={update}
            >
              <option value="Africa/Nairobi">Africa/Nairobi</option>
            </SelectField>
            <div className="sm:col-span-2">
              <Field
                label="Receipt header"
                name="receiptHeader"
                value={data.receiptHeader}
                onChange={update}
                error={errors.receiptHeader}
                optional
                placeholder="Main branch"
              />
            </div>
          </div>
        </section>
      );

    if (stepId === 'modules')
      return (
        <section>
          <StepTitle
            eyebrow="Workspace modules"
            title="Your recommended workspace"
            description="Pesaby has matched these working modules to the operations you selected. Required operational modules stay aligned with those answers."
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {WORKING_MODULES.map((module) => {
              const alwaysRequired = REQUIRED_MODULES.includes(
                module.id as never
              );
              const operationallyRequired =
                (module.id === 'products' && data.sellsProducts) ||
                (module.id === 'inventory' && data.tracksInventory) ||
                (module.id === 'customers' && data.keepsCustomers);
              const incompatible =
                (module.id === 'inventory' && !data.tracksInventory) ||
                (module.id === 'customers' && !data.keepsCustomers);
              const locked =
                alwaysRequired || operationallyRequired || incompatible;
              const checked = data.enabledModules.includes(module.id);
              const status =
                alwaysRequired || operationallyRequired
                  ? 'Required'
                  : module.id === 'pos' && data.sellsProducts
                    ? 'Recommended'
                    : 'Optional';
              return (
                <label
                  key={module.id}
                  className={cn(
                    'rounded-xl border p-4',
                    checked
                      ? 'border-[#e7be16] bg-[#fff8d7]'
                      : 'border-zinc-200',
                    incompatible && 'bg-zinc-50 opacity-65'
                  )}
                >
                  <span className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={locked}
                      onChange={() =>
                        update(
                          'enabledModules',
                          checked
                            ? data.enabledModules.filter(
                                (id) => id !== module.id
                              )
                            : [...data.enabledModules, module.id]
                        )
                      }
                      className="mt-1 h-4 w-4 accent-[#e42527]"
                    />
                    <span>
                      <span className="flex items-center gap-2 text-sm font-extrabold">
                        {module.name}
                        <span className="rounded bg-white px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-500">
                          {incompatible ? 'Not needed' : status}
                        </span>
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-zinc-600">
                        {module.description}
                      </span>
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </section>
      );

    if (stepId === 'payments-tax')
      return (
        <section>
          <StepTitle
            eyebrow="Payments & tax"
            title="Configure how you record money"
            description="These methods are available for manual recording. No payment integration is connected by this step."
          />
          <h3 className="mb-3 text-sm font-extrabold">Payment methods</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            {PAYMENT_METHODS.map(({ id, label, icon: Icon }) => {
              const checked = data.paymentMethods.includes(id);
              return (
                <label
                  key={id}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border p-3',
                    checked
                      ? 'border-[#e7be16] bg-[#fff8d7]'
                      : 'border-zinc-200'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const methods = checked
                        ? data.paymentMethods.filter((method) => method !== id)
                        : [...data.paymentMethods, id];
                      update('paymentMethods', methods);
                      if (id === 'cash') update('acceptsCash', !checked);
                      if (id === 'mpesa') update('acceptsMpesa', !checked);
                      if (id === 'card') update('acceptsCard', !checked);
                      if (!methods.includes(data.defaultPaymentMethod))
                        update('defaultPaymentMethod', methods[0] ?? '');
                    }}
                    className="h-4 w-4 accent-[#e42527]"
                  />
                  <Icon className="h-5 w-5" />
                  <span className="text-sm font-bold">{label}</span>
                </label>
              );
            })}
          </div>
          {errors.paymentMethods?.[0] && (
            <p className="mt-2 text-xs font-semibold text-red-700">
              {errors.paymentMethods[0]}
            </p>
          )}
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <SelectField
              label="Default payment method"
              name="defaultPaymentMethod"
              value={data.defaultPaymentMethod}
              onChange={update}
              error={errors.defaultPaymentMethod}
            >
              {data.paymentMethods.map((id) => (
                <option key={id} value={id}>
                  {PAYMENT_METHODS.find((method) => method.id === id)?.label ??
                    id}
                </option>
              ))}
            </SelectField>
            <label className="flex min-h-12 items-center gap-3 rounded-lg border border-zinc-200 px-4 text-sm font-bold">
              <input
                type="checkbox"
                checked={data.taxEnabled}
                onChange={(event) => {
                  update('taxEnabled', event.target.checked);
                  update('needsTax', event.target.checked);
                }}
                className="h-4 w-4 accent-[#e42527]"
              />
              Apply tax calculations
            </label>
          </div>
          {data.taxEnabled && (
            <div className="mt-5 grid gap-5 rounded-xl bg-[#fff9ef] p-5 sm:grid-cols-2">
              <SelectField
                label="Tax type"
                name="taxName"
                value={data.taxName}
                onChange={update}
                error={errors.taxName}
              >
                <option value="VAT">VAT</option>
                <option value="Turnover Tax">Turnover Tax</option>
                <option value="Withholding Tax">Withholding Tax</option>
                <option value="Other tax">Other tax</option>
              </SelectField>
              <Field
                label="Tax rate (%)"
                name="taxRate"
                value={data.taxRate}
                onChange={update}
                error={errors.taxRate}
                type="number"
              />
              <Field
                label="KRA PIN"
                name="taxIdentifier"
                value={data.taxIdentifier}
                onChange={update}
                error={errors.taxIdentifier}
                placeholder="A000000000Z"
              />
              <label className="flex items-center gap-3 text-sm font-bold">
                <input
                  type="checkbox"
                  checked={data.pricesIncludeTax}
                  onChange={(event) =>
                    update('pricesIncludeTax', event.target.checked)
                  }
                  className="h-4 w-4 accent-[#e42527]"
                />
                Prices already include tax
              </label>
              <p className="sm:col-span-2 text-xs leading-5 text-zinc-600">
                Confirm the selected tax and rate with your tax adviser. Pesaby
                records the tax settings you choose; it does not submit tax
                returns.
              </p>
            </div>
          )}
        </section>
      );

    if (stepId === 'receipt' && !data.issuesReceipts)
      return (
        <section>
          <StepTitle
            eyebrow="Receipt settings"
            title="Receipts are not enabled"
            description="You told us this workspace does not issue receipts. Pesaby will keep receipt controls out of the initial workflow; you can enable them later in settings."
          />
          <div className="rounded-xl border border-[#e7be16] bg-[#fff8d7] p-5 text-sm leading-6 text-[#344054]">
            No receipt configuration is needed for this workspace.
          </div>
        </section>
      );

    if (stepId === 'receipt')
      return (
        <section>
          <StepTitle
            eyebrow="Receipt design"
            title="Make every receipt clear and professional"
            description="Set the details customers need, then check the live printer-style preview before you continue."
          />
          <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-6">
              <div className="grid gap-4 rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 sm:grid-cols-2">
                <Field
                  label="Receipt business name"
                  name="receiptBusinessName"
                  value={
                    data.receiptBusinessName ||
                    data.displayName ||
                    data.businessName
                  }
                  onChange={update}
                  error={errors.receiptBusinessName}
                />
                <Field
                  label="Receipt phone"
                  name="receiptPhone"
                  value={data.receiptPhone || data.phone}
                  onChange={update}
                  error={errors.receiptPhone}
                  type="tel"
                />
                <div className="sm:col-span-2">
                  <TextareaField
                    label="Receipt address"
                    name="receiptAddress"
                    value={data.receiptAddress || data.branchAddress}
                    onChange={update}
                    error={errors.receiptAddress}
                    optional
                  />
                </div>
                <div className="sm:col-span-2">
                  <TextareaField
                    label="Receipt footer"
                    name="receiptFooter"
                    value={data.receiptFooter}
                    onChange={update}
                    error={errors.receiptFooter}
                    optional
                    placeholder="Thank you for shopping with us."
                  />
                </div>
                <SelectField
                  label="Default payment method"
                  name="defaultPaymentMethod"
                  value={data.defaultPaymentMethod}
                  onChange={update}
                  error={errors.defaultPaymentMethod}
                >
                  {data.paymentMethods.map((method) => (
                    <option key={method} value={method}>
                      {PAYMENT_METHODS.find((option) => option.id === method)
                        ?.label ?? method}
                    </option>
                  ))}
                </SelectField>
                <label className="flex min-h-11 items-center gap-3 self-end rounded-lg border border-zinc-200 bg-white px-4 text-sm font-bold">
                  <input
                    type="checkbox"
                    disabled={!data.taxEnabled}
                    checked={data.taxEnabled && data.showTaxOnReceipt}
                    onChange={(event) =>
                      update('showTaxOnReceipt', event.target.checked)
                    }
                    className="h-4 w-4 accent-[#e42527]"
                  />
                  Show {data.taxName || 'tax'} separately
                </label>
              </div>

              <div>
                <h3 className="text-sm font-extrabold text-slate-950">
                  Receipt layout
                </h3>
                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  Choose the format used by your counter and printers.
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {(
                    [
                      [
                        'thermal',
                        'Thermal printer',
                        'Compact format designed for 80 mm receipt printers.',
                      ],
                      [
                        'detailed',
                        'Detailed receipt',
                        'A polished full-page transaction confirmation.',
                      ],
                    ] as const
                  ).map(([value, title, description]) => {
                    const selected = data.receiptLayout === value;
                    return (
                      <label
                        key={value}
                        className={cn(
                          'cursor-pointer rounded-xl border p-4 transition-colors',
                          selected
                            ? 'border-[#e42527] bg-[#fff3f3]'
                            : 'border-zinc-200 hover:bg-zinc-50'
                        )}
                      >
                        <input
                          type="radio"
                          name="receiptLayout"
                          value={value}
                          checked={selected}
                          onChange={() => update('receiptLayout', value)}
                          className="sr-only"
                        />
                        <span className="flex items-center justify-between gap-3">
                          <span className="text-sm font-extrabold text-slate-950">
                            {title}
                          </span>
                          <span
                            className={cn(
                              'flex h-5 w-5 items-center justify-center rounded-full border',
                              selected
                                ? 'border-[#e42527] bg-[#e42527] text-white'
                                : 'border-zinc-300'
                            )}
                          >
                            {selected && <Check className="h-3 w-3" />}
                          </span>
                        </span>
                        <span className="mt-1.5 block text-xs leading-5 text-zinc-600">
                          {description}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {data.receiptLayout === 'thermal' && (
                <div>
                  <h3 className="text-sm font-extrabold text-slate-950">
                    Thermal receipt template
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    Select the visual style for thermal receipts.
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {(
                      [
                        ['classic', 'Classic', 'Simple and familiar.'],
                        ['logo', 'Logo', 'Lead with your brand.'],
                        ['cafe', 'Café', 'Compact store style.'],
                      ] as const
                    ).map(([value, title, description]) => {
                      const selected = data.receiptTemplate === value;
                      return (
                        <label
                          key={value}
                          className={cn(
                            'cursor-pointer rounded-lg border p-3 transition-colors',
                            selected
                              ? 'border-[#e42527] bg-[#fff3f3]'
                              : 'border-zinc-200 hover:bg-zinc-50'
                          )}
                        >
                          <input
                            type="radio"
                            name="receiptTemplate"
                            value={value}
                            checked={selected}
                            onChange={() => update('receiptTemplate', value)}
                            className="sr-only"
                          />
                          <span className="block text-sm font-bold text-slate-950">
                            {title}
                          </span>
                          <span className="mt-1 block text-[11px] leading-4 text-zinc-500">
                            {description}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {data.receiptLayout === 'thermal' &&
                data.receiptTemplate === 'logo' && (
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-950">
                          Business logo
                        </h3>
                        <p className="mt-1 max-w-sm text-xs leading-5 text-zinc-500">
                          PNG, JPG, or WebP up to 2 MB. Transparent or wide logos
                          fit thermal printers best.
                        </p>
                      </div>
                      {data.receiptLogoUrl && (
                        <Image
                          src={data.receiptLogoUrl}
                          alt="Receipt logo preview"
                          width={120}
                          height={48}
                          unoptimized
                          className="h-12 w-[120px] rounded-lg border border-zinc-200 bg-white object-contain p-1"
                        />
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <label className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 text-xs font-bold text-slate-900 hover:bg-zinc-50">
                        {logoUploading && (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        )}
                        {logoUploading
                          ? 'Uploading…'
                          : data.receiptLogoUrl
                            ? 'Replace logo'
                            : 'Upload logo'}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          disabled={logoUploading}
                          onChange={(event) =>
                            uploadReceiptLogo(event.target.files?.[0])
                          }
                          className="sr-only"
                        />
                      </label>
                      {data.receiptLogoUrl && (
                        <button
                          type="button"
                          onClick={() => update('receiptLogoUrl', '')}
                          className="text-xs font-bold text-[#e42527] hover:underline"
                        >
                          Remove logo
                        </button>
                      )}
                    </div>
                  </div>
                )}

              <div>
                <h3 className="text-sm font-extrabold text-slate-950">
                  Receipt appearance
                </h3>
                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  Choose the details customers see on each receipt.
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {RECEIPT_DISPLAY_OPTIONS.map(
                    ({ key, title, description }) => (
                      <label
                        key={key}
                        className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-200 p-3 transition-colors hover:bg-zinc-50"
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(data[key])}
                          onChange={(event) =>
                            update(key, event.target.checked)
                          }
                          className="mt-0.5 h-4 w-4 accent-[#e42527]"
                        />
                        <span>
                          <span className="block text-sm font-bold text-slate-950">
                            {title}
                          </span>
                          <span className="mt-0.5 block text-xs leading-4 text-zinc-500">
                            {description}
                          </span>
                        </span>
                      </label>
                    )
                  )}
                </div>
              </div>
              <p className="text-xs leading-5 text-zinc-500">
                Receipt numbers are generated automatically so every completed
                sale stays traceable and easy to reprint.
              </p>
            </div>

            <div className="self-start overflow-hidden rounded-xl border border-zinc-800 bg-[#181818] shadow-[0_12px_30px_rgba(15,23,42,.16)] lg:sticky lg:top-5">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Live receipt preview
                  </h3>
                  <p className="mt-0.5 text-[11px] text-zinc-400">
                    Matches the receipt used in your POS.
                  </p>
                </div>
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold text-zinc-300">
                  Preview
                </span>
              </div>
              <div className="max-h-[560px] overflow-y-auto bg-zinc-100 p-4">
                <div style={{ zoom: 0.78 }}>
                  <ReceiptTemplate
                    sale={receiptPreview}
                    businessName={
                      data.receiptBusinessName ||
                      data.displayName ||
                      data.businessName
                    }
                    businessPhone={data.receiptPhone || data.phone}
                    businessAddress={
                      data.receiptAddress || data.branchAddress
                    }
                    receiptFooter={
                      data.receiptFooter || 'Thank you for your business.'
                    }
                    cashierName="Alex"
                    customerName="Walk-in"
                    taxName={data.taxName}
                    layout={data.receiptLayout}
                    template={data.receiptTemplate}
                    logoUrl={data.receiptLogoUrl}
                    showPhone={data.receiptShowPhone}
                    showAddress={data.receiptShowAddress}
                    showCashier={data.receiptShowCashier}
                    showCustomer={data.receiptShowCustomer}
                    showPayment={data.receiptShowPayment}
                    showQrCode={data.receiptShowQrCode}
                    showItemSku={data.receiptShowItemSku}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      );

    return (
      <section>
        <StepTitle
          eyebrow="Review"
          title="Check your workspace setup"
          description="Review each section before creation. You can change these settings later."
        />
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            [
              'Business',
              data.businessName,
              `${data.city}, ${data.region} · ${data.currency}`,
              'business-details',
            ],
            [
              'Business profile',
              familyFor(data.businessFamily)?.name ?? 'Not selected',
              categoryLabel(
                data.businessFamily,
                data.businessCategory,
                data.customBusinessCategory
              ),
              'business-type',
            ],
            [
              'Operations',
              data.sellsProducts && data.providesServices
                ? 'Products and services'
                : data.sellsProducts
                  ? 'Products'
                  : 'Services',
              `${data.enabledModules.length} modules matched to your workflow`,
              'operations',
            ],
            [
              'Main branch',
              data.branchName,
              `${data.branchAddress}, ${data.branchCity}`,
              'main-branch',
            ],
            [
              'Modules',
              `${data.enabledModules.length} enabled`,
              data.enabledModules.join(', '),
              'modules',
            ],
            [
              'Payments & tax',
              data.paymentMethods.join(', '),
              data.taxEnabled
                ? `${data.taxName} at ${data.taxRate}%`
                : 'Tax not enabled',
              'payments-tax',
            ],
            [
              'Receipt',
              data.issuesReceipts
                ? data.receiptBusinessName || data.businessName
                : 'Not enabled',
              data.issuesReceipts
                ? data.receiptFooter || 'No footer message'
                : 'Receipt controls stay out of the initial workflow',
              'receipt',
            ],
          ].map(([title, value, description, target]) => (
            <div key={title} className="rounded-xl border border-zinc-200 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.15em] text-[#e42527]">
                    {title}
                  </p>
                  <p className="mt-2 font-extrabold text-slate-950">{value}</p>
                  <p className="mt-1 text-sm leading-5 text-zinc-600">
                    {description}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => edit(target as OnboardingStepId)}
                  className="text-sm font-bold text-slate-700 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e42527]"
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  })();

  return (
    <div className="w-full">
      {stepId !== 'welcome' && (
        <div className="mb-8">
          <div className="flex items-center justify-between gap-4 text-xs font-bold text-zinc-600">
            <span>
              Step {stepIndex + 1} of {ONBOARDING_STEPS.length} —{' '}
              {STEP_LABELS[stepId]}
            </span>
            <span>{progress}%</span>
          </div>
          <div
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-200"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            aria-label="Onboarding progress"
          >
            <div
              className="h-full rounded-full bg-[#ffda32] transition-[width] motion-reduce:transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
      {pageError && (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
        >
          {pageError}
        </div>
      )}
      {renderedStep}
      <div className="mt-8 flex items-center justify-between border-t border-zinc-200 pt-6">
        {stepIndex > 0 ? (
          <button
            type="button"
            onClick={previous}
            disabled={saving}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-bold text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e42527] disabled:opacity-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={next}
          disabled={saving}
          aria-busy={saving}
          className="relative inline-flex min-h-12 min-w-[190px] items-center justify-center gap-2 overflow-hidden rounded-lg bg-[#e42527] px-6 text-sm font-extrabold text-white shadow-[0_7px_18px_rgba(228,37,39,0.18)] outline-none transition hover:bg-[#cf1f22] hover:shadow-[0_9px_22px_rgba(228,37,39,0.24)] active:translate-y-px focus-visible:ring-2 focus-visible:ring-[#e42527] focus-visible:ring-offset-2 disabled:cursor-wait disabled:bg-[#d92326] disabled:shadow-[0_7px_18px_rgba(228,37,39,0.16)]"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} aria-hidden="true" />}
          <span aria-live="polite">{submitLabel}</span>
          {!saving && <ArrowRight className="h-4 w-4" />}
          {saving && (
            <span className="absolute inset-x-0 bottom-0 h-0.5 bg-white/20" aria-hidden="true">
              <span className="onboarding-button-progress block h-full w-1/3 rounded-full bg-white" />
            </span>
          )}
        </button>
      </div>
      <div className="mt-4 flex min-h-5 justify-end" aria-live="polite">
        {saving ? (
          <p className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-600" role="status">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" aria-hidden="true" />
            Saving your setup securely…
          </p>
        ) : stepId !== 'welcome' ? (
          <p className="text-xs text-zinc-500">Progress is saved securely after each completed step.</p>
        ) : null}
      </div>
    </div>
  );
}

function StepTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-7">
      <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#e42527]">
        {eyebrow}
      </p>
      <h1 className="mt-2 text-2xl font-extrabold tracking-[-0.035em] text-slate-950 sm:text-3xl">
        {title}
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
        {description}
      </p>
    </div>
  );
}
