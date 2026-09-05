'use client';

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
  useDeferredValue,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import {
  cancelAgeVerification,
  createSale,
  syncOfflineSale,
  type CartItem,
} from '@/app/actions/sales';
import {
  cancelMpesaPayment,
  findManualMpesaPayment,
  getFinalizedMpesaSale,
  getManualMpesaOptions,
  getMpesaPaymentStatus,
  initiateMpesaPaybillPayment,
  initiateMpesaPayment,
  setManualMpesaPayerPhone,
} from '@/app/actions/mpesa';
import { createCustomer } from '@/app/actions/customers';
import {
  authorizeAutomaticCashDrawerOpen,
  claimAutomaticReceiptPrint,
} from '@/app/actions/operations';
import {
  validateCoupon,
  quoteAutomaticDiscount,
} from '@/app/actions/promotions';
import {
  quoteCheckoutRewards,
  refreshCustomerRewards,
} from '@/app/actions/rewards';
import {
  getAirtelMoneyPaymentStatus,
  initiateAirtelMoneyPayment,
} from '@/app/actions/airtel-money';
import {
  listActiveCardTerminals,
  markCardAttemptForReconciliation,
  prepareCardPaymentAttempt,
  type ActiveCardTerminal,
} from '@/app/actions/card-payments';
import {
  discardHeldSale,
  holdSaleOnServer,
  listHeldSales,
  resumeHeldSaleFromServer,
  type HeldSaleRecord,
} from '@/app/actions/held-sales';
import { formatCurrency, formatDateTime, normalizeBarcode } from '@/lib/utils';
import { cn } from '@/lib/utils';
import {
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  CheckCircle2,
  X,
  Package,
  Printer,
  History,
  PauseCircle,
  AlertTriangle,
  ShieldCheck,
  Search,
  Building2,
  Smartphone,
  Copy,
  Zap,
  Banknote,
  UserRoundPlus,
  BadgePercent,
  Pencil,
  ChevronDown,
  ArrowLeft,
  Download,
  MoreHorizontal,
  Share2,
  WalletCards,
  UserRound,
  BadgeCheck,
  Monitor,
  MapPin,
  CloudOff,
  RefreshCw,
  Info,
  HandCoins,
} from 'lucide-react';
import type {
  Product,
  ProductPackage,
  PharmacyProduct,
  Customer,
  Sale,
  SaleItem,
} from '@/lib/db/schema';
import { notify } from '@/lib/notify';
import { CompactScrollArea } from '@/components/ui/compact-scroll-area';
import { LoadingSpinner as Loader2 } from '@/components/ui/page-loader';
import { PaymentSummaryEditIcon } from '@/components/ui/payment-summary-edit-icon';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { calculateMpesaAmount } from '@/lib/mpesa/amount';
import {
  adoptLegacyOfflineSales,
  cacheOfflineCatalogue,
  listOfflineSales,
  readOfflineCatalogue,
  saveOfflineSale,
  updateOfflineSale,
  type OfflineSaleRecord,
} from '@/lib/pos/offline-store';
import {
  bindPosConnectivityEvents,
  checkoutAlreadyQueued,
  createProvisionalReceiptNo,
  isConnectivityFailure,
  offlineWorkspaceStorageKey,
  shouldSynchronizeOfflineSale,
  summarizeOfflineQueue,
} from '@/lib/pos/offline-policy';
import { useWorkspace } from '@/lib/context/workspace-context';
import { getProductTerminology } from '@/lib/products/terminology';
import {
  browserPrintReceipt,
  captureReceiptHtml,
  directPrintReceipt,
  getReceiptPrinterErrorCopy,
  hasConfiguredReceiptPrinter,
  openQzCashDrawer,
  type ReceiptPrinterSettings,
} from '@/lib/printing/receipt-print-service';
import { canAutomaticallyOpenCashDrawer } from '@/lib/printing/cash-drawer-policy';

const RefundDialog = dynamic(
  () => import('./refund-dialog').then((module) => module.RefundDialog),
  { ssr: false }
);
const ReceiptReprint = dynamic(
  () => import('./receipt-reprint').then((module) => module.ReceiptReprint),
  { ssr: false }
);
const SalesHistoryModal = dynamic(
  () =>
    import('./sales-history-modal').then((module) => module.SalesHistoryModal),
  { ssr: false }
);
const OrdersModal = dynamic(
  () => import('./orders-modal').then((module) => module.OrdersModal),
  { ssr: false }
);
const ReceiptTemplate = dynamic(
  () =>
    import('@/components/receipt/receipt-template').then(
      (module) => module.ReceiptTemplate
    ),
  { ssr: false }
);

type PosProduct = Product & {
  packages: ProductPackage[];
  pharmacy?: PharmacyProduct | null;
  cafe?: CafePosMenuItem | null;
};
type CafeModifierOption = { id: string; name: string; priceAdjustment: number };
type CafeModifierGroup = {
  id: string;
  name: string;
  selectionType: string;
  minimumSelections: number;
  maximumSelections: number;
  options: CafeModifierOption[];
};
type CafePosMenuItem = {
  productId: string;
  inventoryMode: string;
  preparationRequired: boolean;
  available: boolean;
  availabilityReason: string | null;
  blockingIngredients: string[];
  availabilityBySize: Array<{
    packageId: string | null;
    available: boolean;
    blockingIngredients: string[];
  }>;
  modifierGroups: CafeModifierGroup[];
};
type CafePosExperience = {
  configuration: {
    enabledOrderTypes: Array<'takeaway' | 'dine_in' | 'delivery'>;
    defaultOrderType: 'takeaway' | 'dine_in' | 'delivery';
    tablesEnabled: boolean;
    preparationEnabled: boolean;
  };
  tables: Array<{ id: string; name: string; status: string }>;
  menuItems: CafePosMenuItem[];
};
type PosCustomer = Customer & { pointsBalance?: number; bonusBalance?: number };
type RewardQuote = Awaited<ReturnType<typeof quoteCheckoutRewards>>;

interface POSTerminalProps {
  standalone?: boolean;
  organizationId: string;
  products: PosProduct[];
  categories: Array<{
    id: string;
    name: string;
    requiresAgeVerification?: boolean | null;
  }>;
  requiresAgeVerification?: boolean;
  pharmacyMode?: boolean;
  cafeMode?: boolean;
  cafeExperience?: CafePosExperience | null;
  customers: PosCustomer[];
  settings: {
    displayName: string;
    receiptBusinessName: string;
    receiptPhone: string;
    receiptAddress: string;
    receiptFooter: string;
    receiptLayout: 'detailed' | 'thermal';
    receiptTemplate: 'classic' | 'logo' | 'cafe';
    receiptLogoUrl: string;
    taxEnabled: boolean;
    taxRate: number;
    taxName: string;
    pricesIncludeTax: boolean;
    paymentMethods: string[];
    showTaxOnReceipt: boolean;
    receiptShowPhone: boolean;
    receiptShowAddress: boolean;
    receiptShowCashier: boolean;
    receiptShowCustomer: boolean;
    receiptShowPayment: boolean;
    receiptShowQrCode: boolean;
    receiptShowItemSku: boolean;
    receiptShowShipping?: boolean;
    receiptShowCoupon?: boolean;
    receiptShowBonus?: boolean;
    receiptPrintingMode: 'direct' | 'browser';
    receiptPrinterName: string;
    receiptPaperWidth: 58 | 80;
    receiptAutoPrint: boolean;
    receiptPrintCustomerCopy: boolean;
    receiptPrintCopies: number;
    receiptCashDrawerPulse: boolean;
  };
  startCheckout?: boolean;
  checkoutOnly?: boolean;
  hasActiveShift?: boolean;
  canDiscount?: boolean;
  canRefund?: boolean;
  canHold?: boolean;
  canRedeemRewards?: boolean;
  canApproveRestricted?: boolean;
  canOverrideAgeVerification?: boolean;
  receiptContext?: {
    cashierName?: string;
    registerName?: string | null;
    locationName?: string | null;
  };
  offlineContext?: {
    sessionId: string | null;
    branchId: string;
    terminalId: string | null;
  };
}

interface ReceiptData {
  saleId: string;
  receiptNo: string;
  cafeOrder?: {
    orderNumber: number;
    orderType?: string;
    tableId?: string | null;
    tableName?: string | null;
    preparationStatus?: string;
  } | null;
  items: Array<CartItem & { saleItemId: string }>;
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  discountAmount: number;
  roundingAmount: number;
  total: number;
  paymentMethod: string;
  mpesaRef?: string;
  mpesaMode?: 'stk' | 'till' | 'paybill';
  mpesaPhone?: string;
  mpesaMerchant?: string;
  mpesaAccountReference?: string | null;
  change: number;
  idempotencyKey: string;
  ageVerified: boolean;
  completedAt: Date;
  amountReceived?: number;
  discountType?: 'fixed' | 'percentage';
  discountValue?: number;
  customerName: string;
  customerEmail?: string | null;
  couponCode?: string | null;
  couponAmount?: number;
  bonusRedeemed?: number;
  etims?: {
    status: string;
    message?: string;
    environment?: string;
    invoiceNumber?: string | null;
    controlNumber?: string | null;
    receiptNumber?: string | null;
    internalReference?: string | null;
    qrData?: string | null;
    verificationData?: string | null;
    showOnReceipt?: boolean;
  };
  offline?: {
    status: 'PENDING' | 'SYNCED';
    provisionalReceiptNo: string;
  };
}

type HeldSale = HeldSaleRecord;

type MpesaStatus =
  | 'idle'
  | 'initiating'
  | 'pending'
  | 'success'
  | 'cancelled'
  | 'failed'
  | 'timeout';
type SummaryEditor = 'tax' | 'coupon' | 'discount' | 'shipping' | null;

function createIdempotencyKey() {
  return crypto.randomUUID();
}

function formatMpesaAmount(value: number, decimals = true) {
  return `KES ${value.toLocaleString('en-KE', { minimumFractionDigits: decimals ? 2 : 0, maximumFractionDigits: decimals ? 2 : 0 })}`;
}

function maskKenyanPhone(value: string) {
  const digits = value.replace(/\D/g, '');
  const normalized = digits.startsWith('254')
    ? digits
    : digits.startsWith('0')
      ? `254${digits.slice(1)}`
      : `254${digits}`;
  return normalized.length >= 12
    ? `+254 ${normalized.slice(3, 6)} *** ${normalized.slice(-3)}`
    : value;
}

function normalizeKenyanPhoneDraft(value: string) {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('254')) return digits.slice(0, 12);
  if (digits.startsWith('0')) return `254${digits.slice(1)}`.slice(0, 12);
  return `254${digits}`.slice(0, 12);
}

function formatKenyanPhoneInput(value: string) {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  if (!digits.startsWith('254')) return value;
  const national = digits.slice(3, 12);
  return [
    '+254',
    national.slice(0, 3),
    national.slice(3, 6),
    national.slice(6, 9),
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * Shared design tokens. Centralising these keeps every surface (cards, pills,
 * inputs, buttons) visually consistent instead of one-off hex values scattered
 * through the JSX.
 */
const ui = {
  card: 'rounded-2xl border border-[#e4e7ec] bg-white shadow-[0_8px_30px_-18px_rgba(16,24,40,.35)] dark:border-white/10 dark:bg-[#161616]',
  panel:
    'rounded-2xl border border-[#e4e7ec] bg-[#fbfbfc] shadow-sm dark:border-white/10 dark:bg-[#131313]',
  subtleBtn:
    'rounded-lg border border-[#d8dce3] bg-white px-3 py-2 text-xs font-medium text-[#344054] transition-colors hover:bg-[#f9fafb] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-transparent dark:text-[#d0d5dd] dark:hover:bg-white/5',
  input:
    'w-full rounded-lg border border-[#d0d5dd] bg-white px-3 py-2 text-sm text-[#101828] outline-none transition-all placeholder:text-[#98a2b3] focus:border-[#d7a400] focus:ring-4 focus:ring-[#f2b705]/[0.14] disabled:bg-[#f9fafb] disabled:text-[#98a2b3] dark:border-white/10 dark:bg-[#1c1c1c] dark:text-[#f2f2f2]',
  label:
    'mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#667085] dark:text-[#8b8b8b]',
  divider: 'border-[#e4e7ec] dark:border-white/10',
  primary: '#F2B705',
  primaryHover: '#E0A800',
  primaryInk: '#241D00',
};

type PosPaymentMethod =
  | 'cash'
  | 'mpesa'
  | 'airtel_money'
  | 'card'
  | 'bank_transfer'
  | 'credit';

function PaymentBrand({
  method,
  compact = false,
}: {
  method: PosPaymentMethod;
  compact?: boolean;
}) {
  if (method === 'cash')
    return (
      <span
        className={cn(
          'flex items-center justify-center overflow-hidden bg-[#f5b800] text-[#241d00]',
          compact ? 'h-11 w-16 rounded-md' : 'h-full w-full rounded-[7px]'
        )}
      >
        <span
          className={cn(
            'flex items-center font-extrabold tracking-tight',
            compact ? 'gap-1 text-[11px]' : 'gap-2 text-base'
          )}
        >
          <Banknote
            className={compact ? 'h-4 w-4' : 'h-6 w-6'}
            aria-hidden="true"
          />
          <span>Cash</span>
        </span>
      </span>
    );
  if (method === 'mpesa')
    return (
      <span
        className={cn(
          'flex items-center justify-center px-5',
          compact
            ? 'h-11 w-16 rounded-md bg-white'
            : 'h-full w-full rounded-[7px] bg-[#08ad35]'
        )}
      >
        <Image
          src="/payment-logos/mpesa.svg"
          alt="M-Pesa"
          width={150}
          height={80}
          className={cn(
            'w-auto object-contain',
            compact ? 'h-8' : 'h-8 brightness-0 invert'
          )}
        />
      </span>
    );
  if (method === 'airtel_money')
    return (
      <span
        className={cn(
          'flex items-center justify-center bg-[#e40000] px-5',
          compact ? 'h-11 w-16 rounded-md' : 'h-full w-full rounded-[7px]'
        )}
      >
        <Image
          src="/payment-logos/airtel-money.svg"
          alt="Airtel Money"
          width={150}
          height={55}
          className={cn('w-auto object-contain', compact ? 'h-8' : 'h-9')}
        />
      </span>
    );
  if (method === 'bank_transfer')
    return (
      <span
        className={cn(
          'flex items-center justify-center bg-[#092c4c] text-white',
          compact ? 'h-11 w-16 rounded-md' : 'h-full w-full rounded-[10px]'
        )}
      >
        <Building2 className={compact ? 'h-6 w-6' : 'h-10 w-10'} />
      </span>
    );
  if (method === 'credit')
    return (
      <span
        className={cn(
          'flex items-center justify-center bg-[#fff4cc] text-[#7a5b00]',
          compact ? 'h-11 w-16 rounded-md' : 'h-full w-full rounded-[7px]'
        )}
      >
        <span
          className={cn(
            'flex items-center font-extrabold',
            compact ? 'gap-1 text-[10px]' : 'gap-2 text-sm'
          )}
        >
          <HandCoins className={compact ? 'h-4 w-4' : 'h-6 w-6'} />
          <span>Credit</span>
        </span>
      </span>
    );
  return (
    <span
      className={cn(
        'flex items-center justify-center gap-2.5 px-5',
        compact
          ? 'h-11 w-16 rounded-md bg-white'
          : 'h-full w-full rounded-[7px] bg-[#2056a0]'
      )}
    >
      <Image
        src="/payment-logos/visa.svg"
        alt="Visa"
        width={70}
        height={40}
        className={cn(
          'w-auto object-contain',
          compact ? 'h-4' : 'h-5 brightness-0 invert'
        )}
      />
      <Image
        src="/payment-logos/mastercard-color.svg"
        alt="Mastercard"
        width={48}
        height={30}
        style={{ width: 'auto' }}
        className={cn('object-contain', compact ? 'h-4' : 'h-5')}
      />
    </span>
  );
}

function ReceiptMeta({
  mark,
  label,
  value,
}: {
  mark: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 py-0.5">
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase leading-none tracking-[0.08em] text-[#667085] dark:text-[#a8a8a8]">
        {mark}
        {label}
      </p>
      <p
        className="mt-2 truncate text-[13px] font-semibold leading-none text-[#101828] dark:text-white"
        title={value}
        aria-label={value}
      >
        {value}
      </p>
    </div>
  );
}

export function POSTerminal({
  standalone = false,
  organizationId,
  products,
  categories,
  customers,
  settings,
  requiresAgeVerification = false,
  pharmacyMode = false,
  cafeMode = false,
  cafeExperience = null,
  startCheckout = false,
  checkoutOnly = false,
  hasActiveShift = false,
  canDiscount = false,
  canRefund = false,
  canHold = false,
  canRedeemRewards = false,
  canApproveRestricted = false,
  canOverrideAgeVerification = false,
  receiptContext,
  offlineContext,
}: POSTerminalProps) {
  const { config } = useWorkspace();
  const productTerms = getProductTerminology(
    config?.businessType,
    config?.businessCategory
  );
  const router = useRouter();
  const cartStorageKey = offlineWorkspaceStorageKey(organizationId, 'cart');
  const checkoutStorageKey = offlineWorkspaceStorageKey(
    organizationId,
    'checkout-id'
  );
  const mpesaStorageKey = offlineWorkspaceStorageKey(organizationId, 'mpesa');
  const [catalogProducts, setCatalogProducts] = useState(products);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cafeOrderType, setCafeOrderType] = useState<
    'takeaway' | 'dine_in' | 'delivery'
  >(cafeExperience?.configuration.defaultOrderType ?? 'takeaway');
  const [cafeTableId, setCafeTableId] = useState('');
  const [cafeCustomizer, setCafeCustomizer] = useState<{
    product: PosProduct;
    packageId: string | null;
    selected: Record<string, string[]>;
    notes: string;
    editLineId?: string;
  } | null>(null);
  const [cartHydrated, setCartHydrated] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>(
    'fixed'
  );
  const [couponCode, setCouponCode] = useState('');
  const [couponValue, setCouponValue] = useState(0);
  const [shippingCost, setShippingCost] = useState(0);
  const [roundoffEnabled, setRoundoffEnabled] = useState(true);
  const [summaryEditor, setSummaryEditor] = useState<SummaryEditor>(null);
  const [summaryDraftType, setSummaryDraftType] = useState<
    'fixed' | 'percentage'
  >('fixed');
  const [summaryDraftValue, setSummaryDraftValue] = useState('');
  const [couponDraftCode, setCouponDraftCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PosPaymentMethod>('cash');
  const [creditDueDate, setCreditDueDate] = useState('');
  const [paymentReceiver, setPaymentReceiver] = useState('');
  const [cardTerminals, setCardTerminals] = useState<ActiveCardTerminal[]>([]);
  const [cardTerminalsLoading, setCardTerminalsLoading] = useState(false);
  const [selectedCardTerminalId, setSelectedCardTerminalId] = useState('');
  const [cardResult, setCardResult] = useState<
    'idle' | 'approved' | 'declined'
  >('idle');
  const [cardApproved, setCardApproved] = useState(false);
  const [cardBrand, setCardBrand] = useState<
    'visa' | 'mastercard' | 'amex' | 'other' | ''
  >('');
  const [cardLast4, setCardLast4] = useState('');
  const [cardEntryMode, setCardEntryMode] = useState<
    'chip' | 'contactless' | 'swipe' | 'manual' | ''
  >('');
  const [cardAttemptId, setCardAttemptId] = useState('');
  const [cardRecovery, setCardRecovery] = useState(false);
  const [paymentNote, setPaymentNote] = useState('');
  const [saleNote, setSaleNote] = useState('');
  const [staffNote, setStaffNote] = useState('');
  const [mpesaRef, setMpesaRef] = useState('');
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [airtelPhone, setAirtelPhone] = useState('');
  const [airtelRequestId, setAirtelRequestId] = useState('');
  const [airtelStatus, setAirtelStatus] = useState<
    'idle' | 'initiating' | 'pending' | 'success' | 'failed'
  >('idle');
  const [airtelMessage, setAirtelMessage] = useState('');
  const [mpesaFlow, setMpesaFlow] = useState<'stk' | 'paybill'>('stk');
  const [mpesaAccountReference, setMpesaAccountReference] = useState('');
  const [mpesaShortcode, setMpesaShortcode] = useState('');
  const [mpesaAccountType, setMpesaAccountType] = useState<'paybill' | 'till'>(
    'paybill'
  );
  const [mpesaManualAccounts, setMpesaManualAccounts] = useState<
    Array<{ shortcode: string; accountType: 'paybill' | 'till' }>
  >([]);
  const [mpesaMerchantName, setMpesaMerchantName] = useState<string | null>(
    null
  );
  const [mpesaRequestId, setMpesaRequestId] = useState('');
  const [mpesaStatus, setMpesaStatus] = useState<MpesaStatus>('idle');
  const [mpesaMessage, setMpesaMessage] = useState('');
  const manualMpesaStartRef = useRef<() => void>(() => undefined);
  const cancelMpesaIntentRef = useRef<() => Promise<boolean>>(async () => true);
  const switchPaymentMethodRef = useRef<
    (method: PosPaymentMethod) => Promise<void>
  >(async () => undefined);
  const confirmedMpesaExitRef = useRef<() => Promise<void>>(
    async () => undefined
  );
  const [amountPaid, setAmountPaid] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [rewardQuote, setRewardQuote] = useState<RewardQuote | null>(null);
  const [automaticDiscount, setAutomaticDiscount] = useState(0);
  const [automaticDiscountName, setAutomaticDiscountName] = useState('');
  const [rewardQuoteLoading, setRewardQuoteLoading] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState('');
  const [bonusToUse, setBonusToUse] = useState('');
  const [prescriptionReference, setPrescriptionReference] = useState('');
  const [prescriberReference, setPrescriberReference] = useState('');
  const [patientReference, setPatientReference] = useState('');
  const [prescriptionIssuedAt, setPrescriptionIssuedAt] = useState('');
  const [prescriptionExpiresAt, setPrescriptionExpiresAt] = useState('');
  const [pharmacyNotes, setPharmacyNotes] = useState('');
  const [customerMenuOpen, setCustomerMenuOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [newCustomerAddress, setNewCustomerAddress] = useState('');
  const [newCustomerCity, setNewCustomerCity] = useState('');
  const [newCustomerCountry, setNewCustomerCountry] = useState('Kenya');
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [availableCustomers, setAvailableCustomers] = useState(customers || []);
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [showReceiptReprint, setShowReceiptReprint] = useState(false);
  const [showSalesHistory, setShowSalesHistory] = useState(false);
  const [showHoldDialog, setShowHoldDialog] = useState(false);
  const [holdReference, setHoldReference] = useState('');
  const [showVoidDialog, setShowVoidDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showHeldSales, setShowHeldSales] = useState(false);
  const [heldSales, setHeldSales] = useState<HeldSale[]>([]);
  const [heldSalesLoading, setHeldSalesLoading] = useState(false);
  const [heldSaleActionId, setHeldSaleActionId] = useState<string | null>(null);
  const [refundSale, setRefundSale] = useState<
    (Sale & { items: SaleItem[] }) | null
  >(null);
  const [ageVerified, setAgeVerified] = useState(false);
  const [showAgeVerification, setShowAgeVerification] = useState(false);
  const [ageIdType, setAgeIdType] = useState<
    'national_id' | 'passport' | 'driving_licence' | 'other'
  >('national_id');
  const [ageIdReference, setAgeIdReference] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [ageVerificationMode, setAgeVerificationMode] = useState<
    'VERIFIED' | 'OVERRIDDEN'
  >('VERIFIED');
  const [ageOverrideReason, setAgeOverrideReason] = useState('');
  const [checkoutOpen, setCheckoutOpen] = useState(startCheckout);
  const [checkoutStep, setCheckoutStep] = useState<'customer' | 'payment'>(
    startCheckout ? 'payment' : 'customer'
  );
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [mpesaExitConfirmation, setMpesaExitConfirmation] = useState<{
    open: boolean;
    destination: string;
    busy: boolean;
  }>({ open: false, destination: '', busy: false });
  const [scanMessage, setScanMessage] = useState('');
  const [receiptPaperWidth, setReceiptPaperWidth] = useState<58 | 80>(
    settings.receiptPaperWidth
  );
  const [receiptOptionsOpen, setReceiptOptionsOpen] = useState(false);
  const [receiptPrinted, setReceiptPrinted] = useState(false);
  const [receiptPrinting, setReceiptPrinting] = useState(false);
  const autoPrintedReceiptRef = useRef('');
  const retryReceiptPrintRef = useRef<() => void>(() => undefined);
  const [offlineSales, setOfflineSales] = useState<OfflineSaleRecord[]>([]);
  const [offlineQueueHydrated, setOfflineQueueHydrated] = useState(false);
  const [offlineSyncing, setOfflineSyncing] = useState(false);
  const offlineSyncRunningRef = useRef(false);

  useEffect(() => {
    document.body.classList.toggle('pos-receipt-active', Boolean(receipt));
    return () => document.body.classList.remove('pos-receipt-active');
  }, [receipt]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const continueToPaymentRef = useRef<HTMLButtonElement>(null);
  const cashReceivedInputRef = useRef<HTMLInputElement>(null);
  const barcodeBufferRef = useRef<string>('');
  const barcodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const barcodeFirstKeyAtRef = useRef(0);
  const barcodeLastKeyAtRef = useRef(0);
  const lastScanRef = useRef<{ barcode: string; at: number } | null>(null);
  const checkoutIdempotencyKeyRef = useRef<string>('');
  const mpesaToastIdRef = useRef<string | number | null>(null);
  const autoFinalizeRef = useRef<() => void>(() => undefined);
  const autoFinalizingRef = useRef(false);
  const processCheckoutRef = useRef<
    (verified?: boolean, serverAlreadyConfirmed?: boolean) => Promise<unknown>
  >(async () => undefined);
  // Kept in a ref because the global keyboard handler is registered before the
  // checkout action itself is declared below.
  const completeCheckoutRef = useRef<() => void>(() => undefined);
  // `total` is calculated later in this component, while keyboard shortcuts
  // are registered above it. The ref lets the shortcut always read the latest
  // total without referencing that block-scoped value too early.
  const totalRef = useRef(0);
  const ageVerificationConfirmRef = useRef<HTMLButtonElement>(null);
  const [isOnline, setIsOnline] = useState(true);
  const mpesaLocksBasket =
    paymentMethod === 'mpesa' &&
    ['initiating', 'pending', 'success'].includes(mpesaStatus);

  // After a cashier advances with the mouse, put focus on the next action so
  // the Enter key continues the same checkout flow without an extra click.
  useEffect(() => {
    if (!checkoutOpen || receipt) return;

    const frame = window.requestAnimationFrame(() => {
      if (checkoutStep === 'customer') continueToPaymentRef.current?.focus();
      if (checkoutStep === 'payment' && paymentMethod === 'cash')
        cashReceivedInputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [checkoutOpen, checkoutStep, paymentMethod, receipt]);

  useEffect(() => {
    try {
      let saved = window.localStorage.getItem(cartStorageKey);
      if (!saved) {
        const legacyCart = window.localStorage.getItem('pos-active-cart');
        if (legacyCart) {
          const parsed = JSON.parse(legacyCart) as CartItem[];
          const allowedProductIds = new Set(products.map((item) => item.id));
          if (
            parsed.length > 0 &&
            parsed.every((item) => allowedProductIds.has(item.productId))
          ) {
            saved = legacyCart;
            window.localStorage.setItem(cartStorageKey, legacyCart);
            const legacyCheckout = window.localStorage.getItem(
              'pos-active-checkout-id'
            );
            const legacyMpesa = window.localStorage.getItem('pos-active-mpesa');
            if (legacyCheckout)
              window.localStorage.setItem(checkoutStorageKey, legacyCheckout);
            if (legacyMpesa)
              window.localStorage.setItem(mpesaStorageKey, legacyMpesa);
            window.localStorage.removeItem('pos-active-cart');
            window.localStorage.removeItem('pos-active-checkout-id');
            window.localStorage.removeItem('pos-active-mpesa');
          }
        }
      }
      if (saved) setCart(JSON.parse(saved) as CartItem[]);
      checkoutIdempotencyKeyRef.current =
        window.localStorage.getItem(checkoutStorageKey) || '';
    } catch {
      /* ignore malformed local state */
    }
    setCartHydrated(true);
  }, [cartStorageKey, checkoutStorageKey, mpesaStorageKey, products]);

  useEffect(() => {
    if (!cartHydrated) return;
    window.localStorage.setItem(cartStorageKey, JSON.stringify(cart));
  }, [cart, cartHydrated, cartStorageKey]);

  const refreshHeldSales = useCallback(async () => {
    if (
      !canHold ||
      !hasActiveShift ||
      typeof navigator === 'undefined' ||
      !navigator.onLine
    )
      return;
    setHeldSalesLoading(true);
    try {
      setHeldSales(await listHeldSales());
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : 'Could not load held sales'
      );
    } finally {
      setHeldSalesLoading(false);
    }
  }, [canHold, hasActiveShift]);

  useEffect(() => {
    void refreshHeldSales();
  }, [refreshHeldSales]);

  useEffect(() => {
    setIsOnline(navigator.onLine);
  }, []);

  useEffect(() => {
    if (!cartHydrated) return;
    try {
      const saved = JSON.parse(
        window.localStorage.getItem(mpesaStorageKey) || 'null'
      ) as {
        requestId?: string;
        idempotencyKey?: string;
        flow?: 'stk' | 'paybill';
        accountReference?: string;
        shortcode?: string;
        accountType?: 'paybill' | 'till';
      } | null;
      if (saved?.requestId && cart.length) {
        checkoutIdempotencyKeyRef.current = saved.idempotencyKey || '';
        setMpesaRequestId(saved.requestId);
        setMpesaFlow(saved.flow || 'stk');
        setMpesaAccountReference(saved.accountReference || '');
        setMpesaShortcode(saved.shortcode || '');
        setMpesaAccountType(saved.accountType || 'paybill');
        setPaymentMethod('mpesa');
        setMpesaStatus('pending');
        setMpesaMessage('Reconnecting to the active M-Pesa checkout…');
        setCheckoutOpen(true);
      }
    } catch {
      window.localStorage.removeItem(mpesaStorageKey);
    }
    // Restore once; subsequent basket updates must not restart an old request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartHydrated, mpesaStorageKey]);

  const refreshOfflineSales = useCallback(async () => {
    const records = await listOfflineSales(organizationId);
    setOfflineSales(records);
    return records;
  }, [organizationId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await adoptLegacyOfflineSales(
          organizationId,
          products.map((item) => item.id)
        );
        // Reading before replacing the snapshot verifies that the browser cache
        // remains usable across a reload. Fresh server data wins whenever it is
        // available; the durable queue is then reserved from visible stock.
        const [cached, records] = await Promise.all([
          readOfflineCatalogue<
            PosProduct,
            POSTerminalProps['categories'][number],
            Customer,
            POSTerminalProps['settings']
          >(organizationId),
          listOfflineSales(organizationId),
        ]);
        if (cancelled) return;
        const activeCheckoutId =
          window.localStorage.getItem(checkoutStorageKey);
        if (
          checkoutAlreadyQueued(
            activeCheckoutId,
            records.map((record) => record.id)
          )
        ) {
          // This basket is already represented by a durable queued sale.
          window.localStorage.removeItem(cartStorageKey);
          window.localStorage.removeItem(checkoutStorageKey);
          checkoutIdempotencyKeyRef.current = '';
          setCart([]);
        }
        const baseProducts = products.length
          ? products
          : (cached?.products ?? []);
        const reserved = new Map<string, number>();
        for (const record of records) {
          if (record.status === 'SYNCED') continue;
          for (const item of record.payload.items)
            reserved.set(
              item.productId,
              (reserved.get(item.productId) ?? 0) +
                item.quantity * (item.baseUnitQuantity ?? 1)
            );
        }
        setCatalogProducts(
          baseProducts.map((item) => ({
            ...item,
            stock: Math.max(0, item.stock - (reserved.get(item.id) ?? 0)),
          }))
        );
        if (!customers.length && cached?.customers?.length)
          setAvailableCustomers(cached.customers);
        setOfflineSales(records);
        await cacheOfflineCatalogue(organizationId, {
          products: baseProducts,
          categories: categories.length
            ? categories
            : (cached?.categories ?? []),
          customers: customers.length ? customers : (cached?.customers ?? []),
          settings,
        });
      } catch {
        // Checkout still refuses an offline sale if durable storage itself fails.
      } finally {
        if (!cancelled) setOfflineQueueHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    cartStorageKey,
    categories,
    checkoutStorageKey,
    customers,
    organizationId,
    products,
    settings,
  ]);

  const synchronizeOfflineQueue = useCallback(async () => {
    if (
      offlineSyncRunningRef.current ||
      typeof navigator === 'undefined' ||
      !navigator.onLine
    )
      return;
    offlineSyncRunningRef.current = true;
    setOfflineSyncing(true);
    let accepted = 0;
    let failed = 0;
    try {
      const records = await listOfflineSales(organizationId);
      for (const record of records) {
        if (!shouldSynchronizeOfflineSale(record.status) || !navigator.onLine)
          continue;
        await updateOfflineSale(record.id, organizationId, {
          status: 'SYNCING',
          attemptCount: record.attemptCount + 1,
          lastError: undefined,
        });
        try {
          const result = await syncOfflineSale(record.payload);
          await updateOfflineSale(record.id, organizationId, {
            status: 'SYNCED',
            official: {
              saleId: result.saleId,
              receiptNo: result.receiptNo,
              tax: result.tax,
              rounding: result.rounding,
              total: result.total,
              items: result.items,
            },
          });
          setReceipt((current) => {
            if (!current || current.idempotencyKey !== record.id)
              return current;
            return {
              ...current,
              saleId: result.saleId,
              receiptNo: result.receiptNo,
              taxAmount: result.tax,
              roundingAmount: result.rounding,
              total: result.total,
              items: current.items.map((item) => ({
                ...item,
                saleItemId:
                  result.items.find(
                    (saved) => saved.productId === item.productId
                  )?.saleItemId ?? item.saleItemId,
              })),
              offline: {
                status: 'SYNCED',
                provisionalReceiptNo: record.provisionalReceiptNo,
              },
              etims: {
                status: result.etims.status,
                message:
                  'message' in result.etims ? result.etims.message : undefined,
                showOnReceipt:
                  'receiptDetailsEnabled' in result.etims
                    ? result.etims.receiptDetailsEnabled
                    : false,
                ...('submission' in result.etims && result.etims.submission
                  ? {
                      environment: result.etims.submission.environment,
                      invoiceNumber: result.etims.submission.invoiceNumber,
                      controlNumber: result.etims.submission.controlNumber,
                      receiptNumber: result.etims.submission.receiptNumber,
                      internalReference:
                        result.etims.submission.internalReference,
                      qrData: result.etims.submission.qrData,
                      verificationData:
                        result.etims.submission.verificationData,
                    }
                  : {}),
              },
            };
          });
          accepted += 1;
        } catch (error) {
          await updateOfflineSale(record.id, organizationId, {
            status: 'FAILED',
            lastError:
              error instanceof Error ? error.message : 'Synchronization failed',
          });
          failed += 1;
        }
      }
      await refreshOfflineSales();
      if (accepted)
        notify.success(
          `${accepted} offline sale${accepted === 1 ? '' : 's'} synchronized`
        );
      if (failed)
        notify.error(
          `${failed} offline sale${failed === 1 ? '' : 's'} need${failed === 1 ? 's' : ''} review`
        );
    } finally {
      offlineSyncRunningRef.current = false;
      setOfflineSyncing(false);
    }
  }, [organizationId, refreshOfflineSales]);

  useEffect(() => {
    // The queue starts directly from the connectivity event. The synchronization
    // lock keeps this and the state-driven fallback from submitting twice.
    return bindPosConnectivityEvents(
      window,
      setIsOnline,
      synchronizeOfflineQueue
    );
  }, [synchronizeOfflineQueue]);

  useEffect(() => {
    if (!offlineQueueHydrated || !isOnline) return;
    void synchronizeOfflineQueue();
  }, [isOnline, offlineQueueHydrated, synchronizeOfflineQueue]);

  useEffect(() => {
    if (isOnline || paymentMethod === 'cash') return;
    setPaymentMethod('cash');
    setMpesaStatus('idle');
    setMpesaMessage('');
    setMpesaRef('');
  }, [isOnline, paymentMethod]);

  useEffect(() => {
    if (paymentMethod !== 'card') return;
    let active = true;
    setCardTerminalsLoading(true);
    void listActiveCardTerminals()
      .then((terminals) => {
        if (!active) return;
        setCardTerminals(terminals);
        setSelectedCardTerminalId((current) =>
          terminals.some((terminal) => terminal.id === current)
            ? current
            : (terminals[0]?.id ?? '')
        );
      })
      .catch((error) => {
        if (active)
          notify.error(
            error instanceof Error
              ? error.message
              : 'Could not load card terminals'
          );
      })
      .finally(() => active && setCardTerminalsLoading(false));
    return () => {
      active = false;
    };
  }, [paymentMethod]);

  useEffect(() => {
    if (paymentMethod !== 'mpesa' || mpesaPhone.trim()) return;
    const savedPhone = availableCustomers
      .find((entry) => entry.id === selectedCustomer)
      ?.phone?.trim();
    if (savedPhone) setMpesaPhone(savedPhone);
  }, [availableCustomers, selectedCustomer, paymentMethod, mpesaPhone]);

  useEffect(() => {
    if (paymentMethod !== 'mpesa' || mpesaFlow !== 'paybill' || mpesaRequestId)
      return;
    let active = true;
    void getManualMpesaOptions()
      .then((result) => {
        if (!active) return;
        setMpesaManualAccounts(result.accounts);
        setMpesaAccountType(result.defaultMode);
        setMpesaMerchantName(result.merchantName);
      })
      .catch((error) =>
        notify.error('Could not load branch M-Pesa accounts', {
          description:
            error instanceof Error
              ? error.message
              : 'Check the branch payment configuration.',
        })
      );
    return () => {
      active = false;
    };
  }, [paymentMethod, mpesaFlow, mpesaRequestId]);

  useEffect(() => {
    if (!mpesaRequestId || mpesaStatus !== 'pending' || !isOnline) return;
    let cancelled = false;
    const applyResult = (result: {
      status: string;
      amount?: number | string;
      message?: string | null;
      receiptNumber?: string | null;
      saleId?: string | null;
    }) => {
      if (cancelled) return;
      const nextStatus: MpesaStatus =
        result.status === 'CONFIRMED' && result.saleId
          ? 'success'
          : ['SENDING_STK'].includes(result.status)
            ? 'initiating'
            : [
                  'AWAITING_CUSTOMER',
                  'AWAITING_CONFIRMATION',
                  'CONFIRMED',
                ].includes(result.status)
              ? 'pending'
              : result.status === 'EXPIRED'
                ? 'timeout'
                : result.status === 'CANCELLED'
                  ? 'cancelled'
                  : result.status === 'FAILED'
                    ? 'failed'
                    : (result.status as MpesaStatus);
      setMpesaStatus(nextStatus);
      setMpesaMessage(result.message || '');
      if (
        nextStatus === 'failed' ||
        nextStatus === 'timeout' ||
        nextStatus === 'cancelled'
      ) {
        window.localStorage.removeItem(mpesaStorageKey);
        notify.error(
          nextStatus === 'timeout'
            ? 'M-Pesa payment not confirmed'
            : nextStatus === 'cancelled'
              ? 'M-Pesa payment cancelled'
              : 'M-Pesa payment failed',
          {
            id: mpesaToastIdRef.current ?? undefined,
            description:
              result.message || 'No payment confirmation was received.',
          }
        );
        mpesaToastIdRef.current = null;
      }
      if (nextStatus === 'success' && result.receiptNumber) {
        setMpesaRef(result.receiptNumber);
        notify.success('M-Pesa payment received', {
          id: mpesaToastIdRef.current ?? undefined,
          description: result.amount
            ? `${formatMpesaAmount(Number(result.amount))} confirmed.`
            : 'Payment confirmed by Safaricom.',
        });
        mpesaToastIdRef.current = null;
        if (!autoFinalizingRef.current) {
          autoFinalizingRef.current = true;
          window.setTimeout(() => autoFinalizeRef.current(), 500);
        }
      }
    };
    const poll = async () => {
      try {
        applyResult(await getMpesaPaymentStatus(mpesaRequestId));
      } catch (error) {
        if (!cancelled)
          setMpesaMessage(
            error instanceof Error
              ? error.message
              : 'Could not check M-Pesa status'
          );
      }
    };
    void poll();
    const events = new EventSource(
      `/api/mpesa/status/${encodeURIComponent(mpesaRequestId)}`
    );
    events.onmessage = (event) => {
      try {
        applyResult(
          JSON.parse(event.data) as {
            status: string;
            amount?: number | string;
            message?: string | null;
            receiptNumber?: string | null;
            saleId?: string | null;
          }
        );
      } catch {
        /* polling remains available */
      }
    };
    const timer = window.setInterval(() => {
      if (navigator.onLine) void poll();
    }, 8_000);
    return () => {
      cancelled = true;
      events.close();
      window.clearInterval(timer);
    };
  }, [mpesaRequestId, mpesaStatus, isOnline, mpesaStorageKey]);

  // Checkout is already mounted in this terminal. Measure the local transition in
  // development without making a network request part of the cashier's Pay action.
  const openCheckout = useCallback(() => {
    if (!hasActiveShift) {
      notify.error('Start your shift before taking payment');
      return;
    }
    performance.mark('pos-pay-click');
    setCheckoutOpen(true);
    setCheckoutStep('customer');
    requestAnimationFrame(() => {
      performance.mark('pos-checkout-visible');
      performance.measure(
        'pos-pay-to-checkout-visible',
        'pos-pay-click',
        'pos-checkout-visible'
      );
    });
  }, [hasActiveShift]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && paymentDialogOpen) {
        event.preventDefault();
        if (
          paymentMethod === 'mpesa' &&
          mpesaRequestId &&
          ['initiating', 'pending'].includes(mpesaStatus)
        ) {
          confirmedMpesaExitRef.current = async () => {
            if (await cancelMpesaIntentRef.current())
              setPaymentDialogOpen(false);
          };
          setMpesaExitConfirmation({
            open: true,
            destination: 'payment details',
            busy: false,
          });
        } else if (paymentMethod === 'mpesa')
          void cancelMpesaIntentRef.current().then((cancelled) => {
            if (cancelled) setPaymentDialogOpen(false);
          });
        else setPaymentDialogOpen(false);
        return;
      }
      if (event.key === 'Escape' && checkoutOpen) {
        if (
          paymentMethod === 'mpesa' &&
          mpesaRequestId &&
          ['initiating', 'pending'].includes(mpesaStatus)
        ) {
          confirmedMpesaExitRef.current = async () => {
            if (await cancelMpesaIntentRef.current()) setCheckoutOpen(false);
          };
          setMpesaExitConfirmation({
            open: true,
            destination: 'the basket',
            busy: false,
          });
        } else if (paymentMethod === 'mpesa')
          void cancelMpesaIntentRef.current().then((cancelled) => {
            if (cancelled) setCheckoutOpen(false);
          });
        else setCheckoutOpen(false);
        return;
      }
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key === 'Enter' &&
        cart.length > 0 &&
        !receipt
      ) {
        event.preventDefault();
        openCheckout();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
      if (
        event.key === 'Enter' &&
        !event.repeat &&
        !event.defaultPrevented &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !event.isComposing &&
        !checkoutOpen &&
        cart.length > 0 &&
        hasActiveShift &&
        !receipt &&
        !barcodeBufferRef.current
      ) {
        const target = event.target as HTMLElement | null;
        const isEditable =
          target?.isContentEditable ||
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName ?? '');

        // A focused button already receives its native Enter click. This
        // shortcut covers the rest of the basket without stealing search or
        // barcode-scanner input.
        if (!isEditable && target?.tagName !== 'BUTTON') {
          event.preventDefault();
          openCheckout();
          return;
        }
      }
      if (
        event.key === 'Enter' &&
        !event.repeat &&
        !event.defaultPrevented &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !event.isComposing &&
        checkoutOpen &&
        !receipt &&
        !processing &&
        !paymentDialogOpen &&
        !showAgeVerification
      ) {
        const target = event.target as HTMLElement | null;
        const isEditable =
          target?.isContentEditable ||
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName ?? '');
        const isButton = target?.tagName === 'BUTTON';

        if (checkoutStep === 'customer' && !isEditable && !isButton) {
          event.preventDefault();
          if (paymentMethod === 'cash' && !amountPaid)
            setAmountPaid(String(totalRef.current));
          setCheckoutStep('payment');
          return;
        }

        // Enter completes a cash sale from the payment screen, including when
        // the cashier is typing in the dedicated tendered-amount field.
        const isCashTenderField = target?.id === 'cash-received';
        if (
          checkoutStep === 'payment' &&
          paymentMethod === 'cash' &&
          ((!isEditable && !isButton) || isCashTenderField) &&
          parseFloat(amountPaid || '0') >= totalRef.current
        ) {
          event.preventDefault();
          completeCheckoutRef.current();
          return;
        }
      }
      if (checkoutOpen && checkoutStep === 'payment' && !receipt) {
        const paymentShortcut = (
          { F3: 'cash', F4: 'mpesa', F5: 'card', F6: 'airtel_money' } as const
        )[event.key as 'F3' | 'F4' | 'F5' | 'F6'];
        if (
          paymentShortcut &&
          settings.paymentMethods.includes(paymentShortcut) &&
          (isOnline || paymentShortcut === 'cash')
        ) {
          event.preventDefault();
          void switchPaymentMethodRef.current(paymentShortcut);
        }
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [
    cart.length,
    checkoutOpen,
    checkoutStep,
    receipt,
    settings.paymentMethods,
    openCheckout,
    paymentMethod,
    mpesaStatus,
    mpesaRequestId,
    isOnline,
    paymentDialogOpen,
    mpesaLocksBasket,
    amountPaid,
    processing,
    showAgeVerification,
    hasActiveShift,
  ]);

  const addToCart = useCallback(
    (
      product: PosProduct,
      selectedPackage?: ProductPackage,
      selectedModifiers: Array<{
        id: string;
        name: string;
        priceAdjustment: number;
      }> = [],
      lineNotes?: string
    ) => {
      if (
        paymentMethod === 'mpesa' &&
        ['initiating', 'pending', 'success'].includes(mpesaStatus)
      ) {
        notify.error(
          'Finish the current M-Pesa payment before changing the basket'
        );
        return;
      }
      const unitsPerSale = selectedPackage?.baseUnitQuantity ?? 1;
      const availablePackages = Math.floor(product.stock / unitsPerSale);
      if (availablePackages <= 0) {
        notify.error(`${product.name} is out of stock`);
        return;
      }
      setCart((previousCart) => {
        const modifierOptionIds = selectedModifiers
          .map((option) => option.id)
          .sort();
        const lineKey = `${product.id}:${selectedPackage?.id ?? 'base'}:${modifierOptionIds.join(',')}`;
        const existing = previousCart.find(
          (item) =>
            (item.lineId ??
              `${item.productId}:${item.packageId ?? 'base'}:${(item.modifierOptionIds ?? []).slice().sort().join(',')}`) ===
            lineKey
        );
        const price =
          Number(selectedPackage?.sellingPrice ?? product.sellingPrice) +
          selectedModifiers.reduce(
            (sum, option) => sum + option.priceAdjustment,
            0
          );
        const packageName = selectedPackage?.name;
        if (existing) {
          if (existing.quantity >= availablePackages) {
            notify.error(
              `Only ${availablePackages} ${packageName ?? product.unit} in stock`
            );
            return previousCart;
          }
          return previousCart.map((item) =>
            (item.lineId ??
              `${item.productId}:${item.packageId ?? 'base'}:${(item.modifierOptionIds ?? []).slice().sort().join(',')}`) ===
            lineKey
              ? {
                  ...item,
                  quantity: item.quantity + 1,
                  totalPrice: (item.quantity + 1) * price,
                }
              : item
          );
        }
        return [
          ...previousCart,
          {
            lineId: lineKey,
            productId: product.id,
            productName: packageName
              ? `${product.name} (${packageName})`
              : product.name,
            quantity: 1,
            unitPrice: price,
            totalPrice: price,
            packageId: selectedPackage?.id,
            packageName,
            baseUnitQuantity: unitsPerSale,
            modifierOptionIds,
            modifierNames: selectedModifiers.map((option) => option.name),
            lineNotes: lineNotes?.trim() || undefined,
          },
        ];
      });
    },
    [paymentMethod, mpesaStatus]
  );

  const startCafeItem = useCallback(
    (product: PosProduct, selectedPackage?: ProductPackage) => {
      const cafe = product.cafe;
      if (!cafeMode || !cafe) return addToCart(product, selectedPackage);
      if (!cafe.available) {
        notify.error(
          cafe.availabilityReason ||
            (cafe.blockingIngredients.length
              ? `Unavailable: insufficient ${cafe.blockingIngredients.join(', ')}`
              : `${product.name} is sold out`)
        );
        return;
      }
      const needsSize = !selectedPackage && product.packages.length > 0;
      const needsModifiers = cafe.modifierGroups.length > 0;
      if (!needsSize && !needsModifiers)
        return addToCart(product, selectedPackage);
      const initialSelected = Object.fromEntries(
        cafe.modifierGroups.map((group) => [group.id, [] as string[]])
      );
      setCafeCustomizer({
        product,
        packageId: selectedPackage?.id ?? null,
        selected: initialSelected,
        notes: '',
      });
    },
    [addToCart, cafeMode]
  );

  const editCafeCartLine = useCallback(
    (item: CartItem) => {
      const selectedProduct = catalogProducts.find(
        (product) => product.id === item.productId
      );
      if (!selectedProduct?.cafe) return;
      const selectedIds = new Set(item.modifierOptionIds ?? []);
      setCafeCustomizer({
        product: selectedProduct,
        packageId: item.packageId ?? null,
        selected: Object.fromEntries(
          selectedProduct.cafe.modifierGroups.map((group) => [
            group.id,
            group.options
              .filter((option) => selectedIds.has(option.id))
              .map((option) => option.id),
          ])
        ),
        notes: item.lineNotes ?? '',
        editLineId: item.lineId ?? item.productId,
      });
    },
    [catalogProducts]
  );

  const confirmCafeCustomizer = useCallback(() => {
    if (!cafeCustomizer?.product.cafe) return;
    const { product, selected, editLineId } = cafeCustomizer;
    const cafeMenuItem = product.cafe!;
    const selectedPackage = cafeCustomizer.packageId
      ? product.packages.find((item) => item.id === cafeCustomizer.packageId)
      : undefined;
    if (product.packages.length && !selectedPackage) {
      notify.error('Choose a size');
      return;
    }
    const selectedModifiers: CafeModifierOption[] = [];
    for (const group of cafeMenuItem.modifierGroups) {
      const ids = selected[group.id] ?? [];
      if (ids.length < group.minimumSelections) {
        notify.error(
          `Choose at least ${group.minimumSelections} option${group.minimumSelections === 1 ? '' : 's'} for ${group.name}`
        );
        return;
      }
      if (ids.length > group.maximumSelections) {
        notify.error(
          `Choose no more than ${group.maximumSelections} options for ${group.name}`
        );
        return;
      }
      selectedModifiers.push(
        ...group.options.filter((option) => ids.includes(option.id))
      );
    }
    if (editLineId) {
      const modifierOptionIds = selectedModifiers
        .map((option) => option.id)
        .sort();
      const lineId = `${product.id}:${selectedPackage?.id ?? 'base'}:${modifierOptionIds.join(',')}`;
      const unitPrice =
        Number(selectedPackage?.sellingPrice ?? product.sellingPrice) +
        selectedModifiers.reduce(
          (sum, option) => sum + option.priceAdjustment,
          0
        );
      setCart((current) =>
        current.map((item) =>
          (item.lineId ?? item.productId) === editLineId
            ? {
                ...item,
                lineId,
                packageId: selectedPackage?.id,
                packageName: selectedPackage?.name,
                productName: selectedPackage
                  ? `${product.name} (${selectedPackage.name})`
                  : product.name,
                baseUnitQuantity: selectedPackage?.baseUnitQuantity ?? 1,
                unitPrice,
                totalPrice: unitPrice * item.quantity,
                modifierOptionIds,
                modifierNames: selectedModifiers.map((option) => option.name),
                lineNotes: cafeCustomizer.notes.trim() || undefined,
              }
            : item
        )
      );
    } else {
      addToCart(
        product,
        selectedPackage,
        selectedModifiers,
        cafeCustomizer.notes
      );
    }
    setCafeCustomizer(null);
  }, [addToCart, cafeCustomizer]);

  const handleBarcodeScan = useCallback(
    (rawBarcode: string) => {
      const barcode = normalizeBarcode(rawBarcode);
      if (!barcode) return false;
      const matches = catalogProducts.flatMap((product) => {
        const candidates: Array<{
          product: PosProduct;
          selectedPackage?: ProductPackage;
        }> = [];
        if (
          normalizeBarcode(product.barcode ?? '') === barcode &&
          product.isActive
        )
          candidates.push({ product });
        for (const selectedPackage of product.packages)
          if (
            normalizeBarcode(selectedPackage.barcode ?? '') === barcode &&
            selectedPackage.isActive
          )
            candidates.push({ product, selectedPackage });
        return candidates;
      });
      if (matches.length === 0) {
        setScanMessage(
          `No ${productTerms.singularLower} found for barcode ${barcode}. Add the barcode to the ${productTerms.singularLower} first.`
        );
        notify.error(
          `No ${productTerms.singularLower} found for barcode ${barcode}`,
          {
            description:
              'Register the item once, then future scans will add it to the basket.',
            action: {
              label: `Register ${productTerms.singularLower}`,
              onClick: () =>
                router.push(
                  `/dashboard/products/new?barcode=${encodeURIComponent(barcode)}`
                ),
            },
          }
        );
        return false;
      }
      if (matches.length > 1) {
        setScanMessage(
          `Barcode ${barcode} is assigned to more than one ${productTerms.singularLower}. Correct the ${productTerms.singularLower} records before selling.`
        );
        notify.error(
          `Duplicate barcode detected. Ask a manager to correct the ${productTerms.pluralLower}.`
        );
        return false;
      }
      const { product, selectedPackage } = matches[0];
      if (product.stock < (selectedPackage?.baseUnitQuantity ?? 1)) {
        setScanMessage(`${product.name} is out of stock.`);
        notify.error(`${product.name} is out of stock`);
        return false;
      }
      startCafeItem(product, selectedPackage);
      setSearch('');
      setSelectedCategory('');
      setScanMessage(
        `${product.name}${selectedPackage ? ` (${selectedPackage.name})` : ''} added to basket.`
      );
      return true;
    },
    [catalogProducts, productTerms, router, startCafeItem]
  );

  const SCANNER_INACTIVITY_MS = 450;

  const availableCategories = useMemo(() => {
    const categoryIds = new Set(
      catalogProducts.map((product) => product.categoryId).filter(Boolean)
    );
    return categories.filter(
      (category) => category.name.trim() && categoryIds.has(category.id)
    );
  }, [catalogProducts, categories]);

  const categoryImages = useMemo(() => {
    const images = new Map<string, string>();
    for (const product of catalogProducts) {
      if (
        product.categoryId &&
        product.imageUrl &&
        !images.has(product.categoryId)
      ) {
        images.set(product.categoryId, product.imageUrl);
      }
    }
    return images;
  }, [catalogProducts]);

  const categoryProductCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const product of catalogProducts) {
      if (product.categoryId)
        counts.set(
          product.categoryId,
          (counts.get(product.categoryId) ?? 0) + 1
        );
    }
    return counts;
  }, [catalogProducts]);

  const allCategoryImage = useMemo(
    () => catalogProducts.find((product) => product.imageUrl)?.imageUrl ?? null,
    [catalogProducts]
  );

  // USB scanners type rapidly like a keyboard and normally finish with Enter.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const editable =
        target?.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName ?? '');
      if (receipt || processing || checkoutOpen || editable) return;

      if (e.key === 'Enter' && barcodeBufferRef.current) {
        e.preventDefault();
        const barcode = normalizeBarcode(barcodeBufferRef.current);
        const scanDuration = Date.now() - barcodeFirstKeyAtRef.current;
        barcodeBufferRef.current = '';
        barcodeFirstKeyAtRef.current = 0;
        if (!barcode || barcode.length < 5 || scanDuration > 1_500) return;
        const now = Date.now();
        if (
          lastScanRef.current &&
          lastScanRef.current.barcode === barcode &&
          now - lastScanRef.current.at < 350
        )
          return;
        lastScanRef.current = { barcode, at: now };

        handleBarcodeScan(barcode);
        return;
      }

      // Collect barcode characters (numbers, usually 5-20 chars)
      if (
        e.key.length === 1 &&
        /[0-9a-zA-Z]/.test(e.key) &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        const now = Date.now();
        if (now - barcodeLastKeyAtRef.current > 120) {
          barcodeBufferRef.current = '';
          barcodeFirstKeyAtRef.current = now;
        }
        if (!barcodeBufferRef.current) barcodeFirstKeyAtRef.current = now;
        barcodeLastKeyAtRef.current = now;
        barcodeBufferRef.current += e.key;

        // Clear buffer after 2 seconds without input
        if (barcodeTimeoutRef.current) clearTimeout(barcodeTimeoutRef.current);
        barcodeTimeoutRef.current = setTimeout(() => {
          barcodeBufferRef.current = '';
          barcodeFirstKeyAtRef.current = 0;
        }, SCANNER_INACTIVITY_MS);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (barcodeTimeoutRef.current) clearTimeout(barcodeTimeoutRef.current);
    };
  }, [receipt, processing, checkoutOpen, handleBarcodeScan]);

  const productsById = useMemo(
    () => new Map(catalogProducts.map((product) => [product.id, product])),
    [catalogProducts]
  );
  const cartQuantityByProductId = useMemo(() => {
    const totals = new Map<string, number>();
    for (const item of cart)
      totals.set(
        item.productId,
        (totals.get(item.productId) ?? 0) + item.quantity
      );
    return totals;
  }, [cart]);
  const categoryRestrictionById = new Map(
    categories.map((item) => [item.id, item.requiresAgeVerification])
  );
  const containsAgeRestrictedItem = cart.some((line) => {
    const item = products.find((candidate) => candidate.id === line.productId);
    return (
      item?.requiresAgeVerification ??
      (item?.categoryId
        ? categoryRestrictionById.get(item.categoryId)
        : null) ??
      requiresAgeVerification
    );
  });
  const prescriptionRequired = cart.some(
    (item) => productsById.get(item.productId)?.pharmacy?.prescriptionRequired
  );
  const containsRestrictedMedicine = cart.some(
    (item) => productsById.get(item.productId)?.pharmacy?.restrictedItem
  );
  const deferredSearch = useDeferredValue(search.trim().toLocaleLowerCase());

  const filteredProducts = useMemo(
    () =>
      catalogProducts.filter(
        (p) =>
          p.isActive &&
          p.stock > 0 &&
          (!selectedCategory || p.categoryId === selectedCategory) &&
          (!deferredSearch ||
            p.name.toLocaleLowerCase().includes(deferredSearch) ||
            (p.brand ?? '').toLocaleLowerCase().includes(deferredSearch) ||
            (p.pharmacy?.genericName ?? '')
              .toLocaleLowerCase()
              .includes(deferredSearch) ||
            (p.pharmacy?.manufacturer ?? '')
              .toLocaleLowerCase()
              .includes(deferredSearch) ||
            (p.pharmacy?.internalCode ?? '')
              .toLocaleLowerCase()
              .includes(deferredSearch) ||
            (p.sku ?? '').toLocaleLowerCase().includes(deferredSearch) ||
            (p.barcode ?? '').toLocaleLowerCase().includes(deferredSearch))
      ),
    [catalogProducts, deferredSearch, selectedCategory]
  );

  const updateQty = (lineKey: string, delta: number) => {
    if (mpesaLocksBasket)
      return notify.error(
        'The basket is locked while M-Pesa payment is in progress'
      );
    setCart(
      (prev) =>
        prev
          .map((i) => {
            if ((i.lineId ?? i.productId) !== lineKey) return i;
            const newQty = i.quantity + delta;
            if (newQty <= 0) return null;
            const product = productsById.get(i.productId);
            const unitsPerSale = i.baseUnitQuantity ?? 1;
            if (product && newQty * unitsPerSale > product.stock) {
              notify.error(
                `Only ${Math.floor(product.stock / unitsPerSale)} ${i.packageName ?? product.unit} in stock`
              );
              return i;
            }
            return { ...i, quantity: newQty, totalPrice: newQty * i.unitPrice };
          })
          .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (lineKey: string) => {
    if (mpesaLocksBasket)
      return notify.error(
        'The basket is locked while M-Pesa payment is in progress'
      );
    setCart((prev) =>
      prev.filter((i) => (i.lineId ?? i.productId) !== lineKey)
    );
  };

  const subtotal = cart.reduce((sum, i) => sum + i.totalPrice, 0);
  const TAX_RATE = settings.taxEnabled ? settings.taxRate / 100 : 0;
  const taxAmount = settings.taxEnabled
    ? settings.pricesIncludeTax
      ? subtotal - subtotal / (1 + TAX_RATE)
      : subtotal * TAX_RATE
    : 0;
  const grossBeforeDiscount = settings.pricesIncludeTax
    ? subtotal
    : subtotal + taxAmount;

  // Tax remains server-authoritative. Manual discounts and coupon reductions are
  // combined into the single audited discount amount accepted by checkout.
  let manualDiscountAmount = 0;
  if (discountType === 'percentage') {
    manualDiscountAmount = canDiscount
      ? Math.min((discount / 100) * grossBeforeDiscount, grossBeforeDiscount)
      : 0;
  } else {
    manualDiscountAmount = canDiscount
      ? Math.min(discount, grossBeforeDiscount)
      : 0;
  }
  const couponAmount = canDiscount
    ? Math.min(
        Math.max(0, couponValue),
        Math.max(0, grossBeforeDiscount - manualDiscountAmount)
      )
    : 0;
  const discountAmount = Math.min(
    automaticDiscount + manualDiscountAmount + couponAmount,
    grossBeforeDiscount
  );

  useEffect(() => {
    if (!isOnline || cart.length === 0) {
      setAutomaticDiscount(0);
      setAutomaticDiscountName('');
      return;
    }
    const subtotalForCampaign = cart.reduce((s, i) => s + i.totalPrice, 0);
    void quoteAutomaticDiscount({ subtotal: subtotalForCampaign })
      .then((q) => {
        setAutomaticDiscount(q?.discountAmount ?? 0);
        setAutomaticDiscountName(q?.campaignName ?? '');
      })
      .catch(() => {
        setAutomaticDiscount(0);
        setAutomaticDiscountName('');
      });
  }, [cart, isOnline]);

  const unroundedTotal = Number(
    (grossBeforeDiscount + shippingCost - discountAmount).toFixed(2)
  );
  const appliesRoundoff = roundoffEnabled;
  const totalBeforeRewards = appliesRoundoff
    ? calculateMpesaAmount(unroundedTotal).amount
    : unroundedTotal;
  const requestedPoints = pointsToRedeem.trim() ? Number(pointsToRedeem) : 0;
  const requestedBonus = bonusToUse.trim() ? Number(bonusToUse) : 0;
  const pointsError =
    !rewardQuote || requestedPoints === 0
      ? ''
      : !Number.isInteger(requestedPoints) || requestedPoints < 0
        ? 'Enter a whole, positive point amount'
        : requestedPoints < rewardQuote.minimumRedemptionPoints
          ? `Minimum redemption is ${rewardQuote.minimumRedemptionPoints.toLocaleString()} points`
          : requestedPoints > rewardQuote.pointsBalance
            ? 'This customer does not have enough points'
            : requestedPoints > rewardQuote.maximumPoints
              ? `Maximum for this sale is ${rewardQuote.maximumPoints.toLocaleString()} points`
              : '';
  const bonusError =
    !rewardQuote || requestedBonus === 0
      ? ''
      : !Number.isFinite(requestedBonus) || requestedBonus < 0
        ? 'Enter a valid bonus amount'
        : requestedBonus > rewardQuote.bonusBalance
          ? 'This customer does not have enough bonus'
          : requestedBonus > rewardQuote.maximumBonus
            ? `Maximum for this sale is ${formatCurrency(rewardQuote.maximumBonus)}`
            : '';
  const combinationError = Boolean(
    requestedPoints &&
    requestedBonus &&
    rewardQuote &&
    !rewardQuote.allowPointsWithBonus
  );
  const appliedPoints = pointsError || combinationError ? 0 : requestedPoints;
  const loyaltyRedemptionValue = rewardQuote
    ? appliedPoints * rewardQuote.pointValue
    : 0;
  const appliedBonus = bonusError || combinationError ? 0 : requestedBonus;
  const rewardReduction = Number(
    (loyaltyRedemptionValue + appliedBonus).toFixed(2)
  );
  const rewardAdjustedUnrounded = Math.max(
    0,
    Number((unroundedTotal - rewardReduction).toFixed(2))
  );
  const total = appliesRoundoff
    ? calculateMpesaAmount(rewardAdjustedUnrounded).amount
    : rewardAdjustedUnrounded;
  useEffect(() => {
    totalRef.current = total;
  }, [total]);
  const roundingAmount = appliesRoundoff
    ? calculateMpesaAmount(rewardAdjustedUnrounded).roundingAmount
    : 0;
  const change =
    paymentMethod === 'cash'
      ? Math.max(0, parseFloat(amountPaid || '0') - total)
      : 0;
  const offlineQueueSummary = summarizeOfflineQueue(
    offlineSales.map((item) => item.status)
  );
  const showOfflineStatus =
    !isOnline ||
    offlineQueueSummary.pending > 0 ||
    offlineQueueSummary.failed > 0 ||
    offlineSyncing;

  useEffect(() => {
    setPointsToRedeem('');
    setBonusToUse('');
    setRewardQuote(null);
  }, [selectedCustomer]);

  useEffect(() => {
    if (!selectedCustomer || cart.length === 0 || !isOnline) {
      setRewardQuote(null);
      return;
    }
    let active = true;
    const timeout = window.setTimeout(() => {
      setRewardQuoteLoading(true);
      void quoteCheckoutRewards({
        customerId: selectedCustomer,
        lines: cart.map(({ productId, quantity, packageId }) => ({
          productId,
          quantity,
          packageId,
        })),
        discountAmount,
      })
        .then((quote) => {
          if (active) setRewardQuote(quote);
        })
        .catch((error) => {
          if (active) {
            setRewardQuote(null);
            notify.error(
              error instanceof Error
                ? error.message
                : 'Could not load customer rewards'
            );
          }
        })
        .finally(() => {
          if (active) setRewardQuoteLoading(false);
        });
    }, 180);
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [selectedCustomer, cart, discountAmount, isOnline]);

  const openSummaryEditor = (editor: Exclude<SummaryEditor, null>) => {
    if (mpesaLocksBasket)
      return notify.error(
        'The order is locked while M-Pesa payment is in progress'
      );
    if ((editor === 'coupon' || editor === 'discount') && !canDiscount) {
      return notify.error(
        'Your role does not have permission to apply discounts'
      );
    }
    if (editor === 'discount') {
      setSummaryDraftType(discountType);
      setSummaryDraftValue(discount > 0 ? String(discount) : '');
    } else if (editor === 'coupon') {
      setSummaryDraftType('fixed');
      setSummaryDraftValue(couponValue > 0 ? String(couponValue) : '');
      setCouponDraftCode(couponCode);
    } else if (editor === 'shipping') {
      setSummaryDraftValue(shippingCost > 0 ? String(shippingCost) : '');
    }
    setSummaryEditor(editor);
  };

  const applySummaryAdjustment = async () => {
    if (summaryEditor === 'shipping') {
      const value =
        summaryDraftValue.trim() === '' ? 0 : Number(summaryDraftValue);
      if (!Number.isFinite(value) || value < 0)
        return notify.error('Enter a valid shipping cost');
      setShippingCost(value);
      setSummaryEditor(null);
      notify.success(
        value > 0 ? 'Shipping cost applied' : 'Shipping cost removed'
      );
      return;
    }
    if (summaryEditor === 'discount') {
      const value = Number(summaryDraftValue);
      if (!Number.isFinite(value) || value < 0)
        return notify.error('Enter a valid value');
      if (summaryDraftType === 'percentage' && value > 100)
        return notify.error('Percentage discount cannot exceed 100%');
      setDiscountType(summaryDraftType);
      setDiscount(value);
      setSummaryEditor(null);
      notify.success(value > 0 ? 'Discount applied' : 'Discount removed');
    } else if (summaryEditor === 'coupon') {
      if (!couponDraftCode.trim()) return notify.error('Enter a coupon code');
      try {
        const coupon = await validateCoupon(
          couponDraftCode,
          Math.max(0, grossBeforeDiscount - manualDiscountAmount)
        );
        setCouponCode(coupon.code);
        setCouponValue(coupon.amount);
        setSummaryEditor(null);
        notify.success(
          `${coupon.name} applied — you save ${formatCurrency(coupon.amount)}`
        );
      } catch (error) {
        notify.error(
          error instanceof Error ? error.message : 'Coupon could not be applied'
        );
      }
    }
  };

  const removeAppliedPromotion = (kind: 'discount' | 'coupon') => {
    if (mpesaLocksBasket)
      return notify.error(
        'The order is locked while M-Pesa payment is in progress'
      );
    if (kind === 'discount') {
      setDiscount(0);
      notify.success('Discount removed');
      return;
    }
    setCouponCode('');
    setCouponValue(0);
    notify.success('Coupon removed');
  };

  const saveCashCheckoutOffline = async (
    verified: boolean,
    queueId: string
  ) => {
    if (paymentMethod !== 'cash')
      throw new Error('Offline checkout supports cash only');
    if (cafeMode)
      throw new Error(
        'Café checkout requires an online connection so prices, modifiers and ingredient stock can be verified'
      );
    if (!offlineContext?.sessionId)
      throw new Error(
        'This register has no cached open shift for offline selling'
      );
    if (prescriptionRequired || containsRestrictedMedicine)
      throw new Error(
        'Prescription and restricted medicines require an online approval workflow'
      );
    const offlineCreatedAt = new Date();
    const provisionalReceiptNo = createProvisionalReceiptNo(
      offlineCreatedAt,
      queueId
    );
    const record: OfflineSaleRecord = {
      id: queueId,
      organizationId,
      status: 'PENDING',
      provisionalReceiptNo,
      createdAt: offlineCreatedAt.toISOString(),
      updatedAt: offlineCreatedAt.toISOString(),
      attemptCount: 0,
      payload: {
        queueId,
        provisionalReceiptNo,
        offlineCreatedAt: offlineCreatedAt.toISOString(),
        sessionId: offlineContext.sessionId,
        customerId: selectedCustomer || undefined,
        items: cart,
        subtotal,
        discountAmount,
        shippingAmount: shippingCost,
        roundoffEnabled,
        total,
        amountReceived: parseFloat(amountPaid || '0'),
        ageVerified: containsAgeRestrictedItem ? verified : false,
      },
    };
    await saveOfflineSale(record);
    await refreshOfflineSales();
    setReceipt({
      saleId: `offline-${queueId}`,
      receiptNo: provisionalReceiptNo,
      items: cart.map((item) => ({
        ...item,
        saleItemId: `offline-${queueId}-${item.productId}`,
      })),
      subtotal,
      taxAmount,
      discountAmount,
      shippingAmount: shippingCost,
      roundingAmount: 0,
      total,
      paymentMethod: 'cash',
      change: parseFloat(amountPaid || '0') - total,
      idempotencyKey: queueId,
      ageVerified: containsAgeRestrictedItem ? verified : false,
      completedAt: offlineCreatedAt,
      amountReceived: parseFloat(amountPaid || '0'),
      discountType:
        discountAmount > 0
          ? couponAmount > 0
            ? 'fixed'
            : discountType
          : undefined,
      discountValue:
        discountAmount > 0
          ? couponAmount > 0
            ? discountAmount
            : discount
          : undefined,
      customerName:
        availableCustomers.find((customer) => customer.id === selectedCustomer)
          ?.name || 'Walk-in customer',
      customerEmail: availableCustomers.find(
        (customer) => customer.id === selectedCustomer
      )?.email,
      offline: { status: 'PENDING', provisionalReceiptNo },
      etims: {
        status: 'PENDING',
        message: 'Fiscal submission will begin after this sale synchronizes.',
        showOnReceipt: false,
      },
    });
    setCatalogProducts((current) =>
      current.map((product) => {
        const sold = cart.find((item) => item.productId === product.id);
        return sold
          ? {
              ...product,
              stock: Math.max(
                0,
                product.stock - sold.quantity * (sold.baseUnitQuantity ?? 1)
              ),
            }
          : product;
      })
    );
    setCart([]);
    window.localStorage.removeItem(cartStorageKey);
    window.localStorage.removeItem(checkoutStorageKey);
    notify.success('Offline cash sale saved on this register', {
      description: `${provisionalReceiptNo} · synchronization pending`,
    });
  };

  const processCheckout = async (
    verified = ageVerified,
    serverAlreadyConfirmed = false
  ) => {
    if (cafeMode && cafeOrderType === 'dine_in' && !cafeTableId)
      return notify.error('Choose a table for this dine-in order');
    if (!hasActiveShift)
      return notify.error('Start your shift before completing a sale');
    if (cart.length === 0) return notify.error('Cart is empty');
    if (pointsError || bonusError || combinationError)
      return notify.error(
        pointsError ||
          bonusError ||
          'Loyalty points and bonus cannot be combined'
      );
    if (
      (requestedPoints || requestedBonus) &&
      (!selectedCustomer || !canRedeemRewards)
    )
      return notify.error(
        !selectedCustomer
          ? 'Select a customer before using rewards'
          : 'Reward redemption permission denied'
      );
    if ((requestedPoints || requestedBonus) && !isOnline)
      return notify.error('Reward redemption requires an online connection');
    if (prescriptionRequired && !prescriptionReference.trim())
      return notify.error('Enter the prescription reference');
    if (containsRestrictedMedicine && !canApproveRestricted)
      return notify.error(
        'An authorized pharmacist or manager must complete this sale'
      );
    if (
      paymentMethod === 'mpesa' &&
      ((!serverAlreadyConfirmed && mpesaStatus !== 'success') ||
        !mpesaRequestId ||
        !mpesaRef)
    )
      return notify.error('Wait for M-Pesa payment confirmation');
    if (paymentMethod === 'card' && cardResult !== 'approved')
      return notify.error('Confirm the physical terminal result first');
    if (paymentMethod === 'card' && !selectedCardTerminalId)
      return notify.error('Choose an active card terminal');
    if (paymentMethod === 'card' && !mpesaRef.trim())
      return notify.error('Authorization code required', {
        description: 'Enter the approval code shown by the physical terminal.',
      });
    if (paymentMethod === 'card' && !cardApproved)
      return notify.error('Confirm the card terminal shows APPROVED');
    if (paymentMethod === 'airtel_money' && !mpesaRef)
      return notify.error('Enter the Airtel Money transaction reference');
    if (paymentMethod === 'bank_transfer' && !mpesaRef)
      return notify.error('Enter the confirmed bank transfer reference');
    if (paymentMethod === 'credit' && !selectedCustomer)
      return notify.error('Select a customer before creating a credit sale');
    if (paymentMethod === 'credit' && !creditDueDate)
      return notify.error('Select when the customer payment is due');
    if (paymentMethod === 'cash' && parseFloat(amountPaid || '0') < total) {
      return notify.error('Amount received is too low', {
        description: `${formatCurrency(total)} is required to complete this sale.`,
      });
    }

    // Check for low stock items
    const lowStockItems = cart.filter((item) => {
      const product = catalogProducts.find((p) => p.id === item.productId);
      return (
        product &&
        product.stock - item.quantity * (item.baseUnitQuantity ?? 1) <
          product.minStock
      );
    });

    if (lowStockItems.length > 0) {
      notify.warning(
        `${lowStockItems.length} item(s) will go below minimum stock level after this sale`
      );
    }

    setProcessing(true);

    // Generate idempotency key on first attempt
    if (!checkoutIdempotencyKeyRef.current) {
      checkoutIdempotencyKeyRef.current = createIdempotencyKey();
      window.localStorage.setItem(
        checkoutStorageKey,
        checkoutIdempotencyKeyRef.current
      );
    }

    if (!isOnline) {
      try {
        await saveCashCheckoutOffline(
          verified,
          checkoutIdempotencyKeyRef.current
        );
      } catch (error) {
        notify.error(
          error instanceof Error
            ? error.message
            : 'Could not save this offline sale'
        );
      } finally {
        setProcessing(false);
      }
      return;
    }

    const saleToastId = paymentMethod === 'cash' ? undefined : notify.loading('Completing sale…', {
      description:
        paymentMethod === 'mpesa'
          ? 'Confirming payment and saving the receipt.'
          : 'Saving payment and updating inventory.',
    });
    let persistedCardAttemptId = cardAttemptId;
    try {
      let approvedCardAttemptId = persistedCardAttemptId;
      if (paymentMethod === 'card' && !approvedCardAttemptId) {
        const attempt = await prepareCardPaymentAttempt({
          terminalId: selectedCardTerminalId,
          amount: total,
          authorizationCode: mpesaRef,
          reference: paymentReceiver || undefined,
          cardBrand: cardBrand || undefined,
          last4: cardLast4 || undefined,
          entryMode: cardEntryMode || undefined,
          approvedConfirmation: true,
          idempotencyKey: checkoutIdempotencyKeyRef.current,
        });
        approvedCardAttemptId = attempt.id;
        persistedCardAttemptId = attempt.id;
        setCardAttemptId(attempt.id);
      }
      const completed =
        paymentMethod === 'mpesa' && serverAlreadyConfirmed
          ? await getFinalizedMpesaSale(mpesaRequestId)
          : await createSale({
              customerId: selectedCustomer || undefined,
              items: cart,
              subtotal,
              discountAmount,
              shippingAmount: shippingCost,
              roundoffEnabled,
              total,
              paymentMethod,
              paymentReference:
                paymentMethod === 'card' ? undefined : mpesaRef || undefined,
              cardPaymentAttemptId:
                paymentMethod === 'card' ? approvedCardAttemptId : undefined,
              mpesaPaymentRequestId:
                paymentMethod === 'mpesa' ? mpesaRequestId : undefined,
              amountReceived:
                paymentMethod === 'cash'
                  ? parseFloat(amountPaid || '0')
                  : undefined,
              creditDueDate:
                paymentMethod === 'credit'
                  ? new Date(`${creditDueDate}T12:00:00`)
                  : undefined,
              paymentReceiver: paymentReceiver || undefined,
              paymentNote: paymentNote || undefined,
              saleNote: saleNote || undefined,
              staffNote: staffNote || undefined,
              idempotencyKey: checkoutIdempotencyKeyRef.current,
              ageVerified: containsAgeRestrictedItem ? verified : undefined,
              ageVerification:
                containsAgeRestrictedItem && verified
                  ? {
                      status: ageVerificationMode,
                      idType:
                        ageVerificationMode === 'VERIFIED'
                          ? ageIdType
                          : undefined,
                      idReference:
                        ageVerificationMode === 'VERIFIED'
                          ? ageIdReference.trim() || undefined
                          : undefined,
                      overrideReason:
                        ageVerificationMode === 'OVERRIDDEN'
                          ? ageOverrideReason.trim()
                          : undefined,
                    }
                  : undefined,
              pointsToRedeem: appliedPoints || undefined,
              bonusToUse: appliedBonus || undefined,
              pharmacy:
                prescriptionRequired || containsRestrictedMedicine
                  ? {
                      prescriptionReference:
                        prescriptionReference.trim() || undefined,
                      prescriberReference:
                        prescriberReference.trim() || undefined,
                      patientReference: patientReference.trim() || undefined,
                      issuedAt: prescriptionIssuedAt
                        ? new Date(prescriptionIssuedAt)
                        : undefined,
                      expiresAt: prescriptionExpiresAt
                        ? new Date(prescriptionExpiresAt)
                        : undefined,
                      notes: pharmacyNotes.trim() || undefined,
                    }
                  : undefined,
              cafe: cafeMode
                ? {
                    orderType: cafeOrderType,
                    tableId:
                      cafeOrderType === 'dine_in' ? cafeTableId : undefined,
                    lines: cart.map((item) => ({
                      productId: item.productId,
                      packageId: item.packageId,
                      quantity: item.quantity,
                      modifierOptionIds: item.modifierOptionIds,
                      notes: item.lineNotes,
                    })),
                  }
                : undefined,
            });
      const {
        saleId,
        receiptNo,
        tax,
        rounding: returnedRounding,
        total: returnedTotal,
        items: savedItems,
        etims,
      } = completed;
      const completedMpesaDetails =
        'mpesaDetails' in completed ? completed.mpesaDetails : undefined;
      const completedCafeOrder =
        'cafeOrder' in completed ? completed.cafeOrder : null;
      setReceipt({
        saleId,
        receiptNo,
        cafeOrder: completedCafeOrder
          ? {
              ...completedCafeOrder,
              orderType: cafeOrderType,
              tableId: cafeTableId || null,
              tableName:
                cafeExperience?.tables.find((table) => table.id === cafeTableId)
                  ?.name ?? null,
            }
          : null,
        items: cart.map((item, itemIndex) => {
          const savedItem = savedItems[itemIndex];
          if (!savedItem)
            throw new Error(
              `Receipt item was not saved for ${item.productName}`
            );
          return { ...item, saleItemId: savedItem.saleItemId };
        }),
        subtotal,
        taxAmount: tax || taxAmount,
        discountAmount,
        shippingAmount: shippingCost,
        roundingAmount: returnedRounding ?? roundingAmount,
        total: returnedTotal || total,
        paymentMethod,
        mpesaMode:
          paymentMethod === 'mpesa'
            ? (completedMpesaDetails?.mode as
                | 'stk'
                | 'till'
                | 'paybill'
                | undefined)
            : undefined,
        mpesaPhone:
          paymentMethod === 'mpesa' ? completedMpesaDetails?.phone : undefined,
        mpesaMerchant: paymentMethod === 'mpesa' ? mpesaShortcode : undefined,
        mpesaAccountReference:
          paymentMethod === 'mpesa'
            ? completedMpesaDetails?.accountReference
            : undefined,
        mpesaRef: mpesaRef || undefined,
        change:
          paymentMethod === 'cash'
            ? parseFloat(amountPaid || '0') - (returnedTotal || total)
            : 0,
        idempotencyKey: checkoutIdempotencyKeyRef.current,
        ageVerified: containsAgeRestrictedItem ? verified : false,
        completedAt: new Date(),
        amountReceived:
          paymentMethod === 'cash' ? parseFloat(amountPaid || '0') : undefined,
        discountType:
          discountAmount > 0
            ? couponAmount > 0
              ? 'fixed'
              : discountType
            : undefined,
        discountValue:
          discountAmount > 0
            ? couponAmount > 0
              ? discountAmount
              : discount
            : undefined,
        customerName:
          availableCustomers.find(
            (customer) => customer.id === selectedCustomer
          )?.name || 'Walk-in customer',
        customerEmail: availableCustomers.find(
          (customer) => customer.id === selectedCustomer
        )?.email,
        etims: {
          status: etims.status,
          message: 'message' in etims ? etims.message : undefined,
          showOnReceipt:
            'receiptDetailsEnabled' in etims
              ? etims.receiptDetailsEnabled
              : false,
          ...('submission' in etims && etims.submission
            ? {
                environment: etims.submission.environment,
                invoiceNumber: etims.submission.invoiceNumber,
                controlNumber: etims.submission.controlNumber,
                receiptNumber: etims.submission.receiptNumber,
                internalReference: etims.submission.internalReference,
                qrData: etims.submission.qrData,
                verificationData: etims.submission.verificationData,
              }
            : {}),
        },
      });
      if (paymentMethod === 'mpesa') {
        window.localStorage.removeItem(mpesaStorageKey);
        window.localStorage.removeItem(cartStorageKey);
      }
      setCatalogProducts((current) =>
        current.map((product) => {
          const sold = cart.find((item) => item.productId === product.id);
          return sold
            ? {
                ...product,
                stock: Math.max(
                  0,
                  product.stock - sold.quantity * (sold.baseUnitQuantity ?? 1)
                ),
              }
            : product;
        })
      );
      setCart([]);
      if (selectedCustomer) {
        // The sale has committed at this point. Updating the optional loyalty
        // display must not leave the cashier on the processing screen.
        void refreshCustomerRewards(selectedCustomer)
          .then((latestRewards) => {
            setAvailableCustomers((current) =>
              current.map((customer) =>
                customer.id === selectedCustomer
                  ? {
                      ...customer,
                      loyaltyPoints: latestRewards.pointsBalance,
                      pointsBalance: latestRewards.pointsBalance,
                      bonusBalance: latestRewards.bonusBalance,
                    }
                  : customer
              )
            );
          })
          .catch(() => undefined);
      }
      setPointsToRedeem('');
      setBonusToUse('');
      setRewardQuote(null);
      window.localStorage.removeItem(cartStorageKey);
      window.localStorage.removeItem(checkoutStorageKey);

      const paymentSuccessTitle =
        paymentMethod === 'cash'
          ? 'Cash payment completed'
          : paymentMethod === 'mpesa'
            ? 'M-Pesa payment received'
            : paymentMethod === 'card'
              ? 'Card payment recorded'
              : paymentMethod === 'airtel_money'
                ? 'Airtel Money payment recorded'
                : paymentMethod === 'credit'
                  ? 'Customer balance created'
                  : 'Payment recorded';
      const paymentSuccessDescription =
        paymentMethod === 'cash'
          ? `${formatCurrency(parseFloat(amountPaid || '0'))} received · Receipt #${receiptNo}`
          : `${formatCurrency(total)} confirmed · Receipt #${receiptNo}`;
      notify.success(paymentSuccessTitle, {
        id: saleToastId,
        description:
          etims.status === 'ACCEPTED'
            ? `${paymentSuccessDescription} · eTIMS accepted`
            : paymentSuccessDescription,
      });
    } catch (err) {
      autoFinalizingRef.current = false;
      if (paymentMethod === 'card' && persistedCardAttemptId) {
        setCardRecovery(true);
        notify.error('Card may already be charged', {
          id: saleToastId,
          description:
            'The terminal approval is saved. Retry saving this sale or send it to reconciliation—do not charge the card again.',
        });
        return;
      }
      if (paymentMethod === 'cash' && isConnectivityFailure(err)) {
        notify.dismiss(saleToastId);
        try {
          await saveCashCheckoutOffline(
            verified,
            checkoutIdempotencyKeyRef.current
          );
          return;
        } catch (offlineError) {
          notify.error(
            offlineError instanceof Error
              ? offlineError.message
              : 'Could not save this offline sale'
          );
          return;
        }
      }
      notify.error('Sale failed', {
        id: saleToastId,
        description:
          err instanceof Error
            ? err.message
            : 'The sale could not be processed.',
      });
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    processCheckoutRef.current = processCheckout;
  });

  const confirmAgeVerification = useCallback(() => {
    if (
      ageVerificationMode === 'OVERRIDDEN' &&
      ageOverrideReason.trim().length < 3
    ) {
      notify.error('Enter a reason for the supervisor override');
      return;
    }
    if (!ageConfirmed) {
      notify.error('Confirm that the customer meets the required legal age');
      return;
    }
    setAgeVerified(true);
    setShowAgeVerification(false);

    // Confirmation deliberately continues the sale the cashier just initiated.
    // M-Pesa still waits for a successful payment confirmation before checkout.
    if (paymentMethod !== 'mpesa' || mpesaStatus === 'success') {
      void processCheckoutRef.current(true);
    } else if (mpesaFlow === 'paybill') {
      window.setTimeout(() => manualMpesaStartRef.current(), 0);
    }
  }, [
    ageConfirmed,
    ageOverrideReason,
    ageVerificationMode,
    mpesaStatus,
    paymentMethod,
    mpesaFlow,
  ]);

  const dismissAgeVerification = useCallback(async () => {
    setShowAgeVerification(false);
    const checkoutId = checkoutIdempotencyKeyRef.current;
    if (!checkoutId) return;
    try {
      await cancelAgeVerification({ checkoutId });
    } catch (cause) {
      notify.error(
        cause instanceof Error
          ? cause.message
          : 'Unable to record the cancelled age check'
      );
    }
  }, []);

  useEffect(() => {
    if (!showAgeVerification) return;

    const handleAgeVerificationKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        void dismissAgeVerification();
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        confirmAgeVerification();
      }
    };

    window.addEventListener('keydown', handleAgeVerificationKeyDown);
    const frame = window.requestAnimationFrame(() =>
      ageVerificationConfirmRef.current?.focus()
    );

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('keydown', handleAgeVerificationKeyDown);
    };
  }, [confirmAgeVerification, dismissAgeVerification, showAgeVerification]);

  useEffect(() => {
    if (!summaryEditor) return;

    const handleSummaryEditorKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setSummaryEditor(null);
      }
    };

    window.addEventListener('keydown', handleSummaryEditorKeyDown);
    return () =>
      window.removeEventListener('keydown', handleSummaryEditorKeyDown);
  }, [summaryEditor]);

  useEffect(() => {
    autoFinalizeRef.current = () => void processCheckout(ageVerified, true);
  });

  const handleCheckout = () => {
    if (!hasActiveShift)
      return notify.error('Start your shift before completing a sale');
    if (paymentMethod === 'mpesa' && mpesaStatus !== 'success')
      return notify.error('Send the M-Pesa prompt and wait for confirmation');
    if (containsAgeRestrictedItem && !ageVerified) {
      setShowAgeVerification(true);
      return;
    }
    void processCheckout();
  };
  useEffect(() => {
    completeCheckoutRef.current = handleCheckout;
  });

  const handleMpesaPrompt = async () => {
    if (cafeMode && cafeOrderType === 'dine_in' && !cafeTableId)
      return notify.error('Choose a table for this dine-in order');
    if (containsAgeRestrictedItem && !ageVerified) {
      setShowAgeVerification(true);
      return;
    }
    if (!mpesaPhone.trim())
      return notify.error('Enter the customer M-Pesa phone number');
    if (prescriptionRequired && !prescriptionReference.trim())
      return notify.error('Enter the prescription reference');
    if (containsRestrictedMedicine && !canApproveRestricted)
      return notify.error(
        'An authorized pharmacist or manager must complete this sale'
      );
    if (
      !checkoutIdempotencyKeyRef.current ||
      mpesaStatus === 'failed' ||
      mpesaStatus === 'timeout' ||
      mpesaStatus === 'cancelled'
    )
      checkoutIdempotencyKeyRef.current = createIdempotencyKey();
    setMpesaStatus('initiating');
    setMpesaMessage('Sending the payment prompt…');
    setMpesaRef('');
    mpesaToastIdRef.current = notify.loading('Sending M-Pesa prompt...', {
      description: 'Waiting for Safaricom to accept the request.',
    });
    try {
      const response = await initiateMpesaPayment({
        phone: mpesaPhone,
        items: cart.map(({ productId, quantity, packageId }) => ({
          productId,
          quantity,
          packageId,
        })),
        discountAmount,
        shippingAmount: shippingCost,
        roundoffEnabled,
        idempotencyKey: checkoutIdempotencyKeyRef.current,
        ageVerified,
        ageVerificationStatus: ageVerificationMode,
        ageOverrideReason:
          ageVerificationMode === 'OVERRIDDEN'
            ? ageOverrideReason.trim()
            : undefined,
        customerId: selectedCustomer || undefined,
        pointsToRedeem: appliedPoints || undefined,
        bonusToUse: appliedBonus || undefined,
        pharmacy:
          prescriptionRequired || containsRestrictedMedicine
            ? {
                prescriptionReference:
                  prescriptionReference.trim() || undefined,
                prescriberReference: prescriberReference.trim() || undefined,
                patientReference: patientReference.trim() || undefined,
                issuedAt: prescriptionIssuedAt
                  ? new Date(prescriptionIssuedAt)
                  : undefined,
                expiresAt: prescriptionExpiresAt
                  ? new Date(prescriptionExpiresAt)
                  : undefined,
                notes: pharmacyNotes.trim() || undefined,
              }
            : undefined,
        cafe: cafeMode
          ? {
              orderType: cafeOrderType,
              tableId: cafeOrderType === 'dine_in' ? cafeTableId : undefined,
              lines: cart.map((item) => ({
                productId: item.productId,
                packageId: item.packageId,
                quantity: item.quantity,
                modifierOptionIds: item.modifierOptionIds,
                notes: item.lineNotes,
              })),
            }
          : undefined,
      });
      setMpesaRequestId(response.id);
      window.localStorage.setItem(
        mpesaStorageKey,
        JSON.stringify({
          requestId: response.id,
          idempotencyKey: checkoutIdempotencyKeyRef.current,
          flow: 'stk',
        })
      );
      setMpesaStatus(
        response.status === 'CONFIRMED'
          ? 'success'
          : response.status === 'FAILED'
            ? 'failed'
            : 'pending'
      );
      setMpesaMessage(
        response.message || 'Check the customer phone and enter the M-Pesa PIN.'
      );
      notify.loading('Waiting for M-Pesa confirmation...', {
        id: mpesaToastIdRef.current ?? undefined,
        description: 'Ask the customer to enter their M-Pesa PIN.',
      });
      if (response.status === 'success' && response.receiptNumber)
        setMpesaRef(response.receiptNumber);
    } catch (error) {
      setMpesaStatus('failed');
      setMpesaMessage(
        error instanceof Error
          ? error.message
          : 'Could not send the M-Pesa prompt'
      );
      notify.error('Could not send M-Pesa prompt', {
        id: mpesaToastIdRef.current ?? undefined,
        description:
          error instanceof Error
            ? error.message
            : 'Please retry the payment request.',
      });
      mpesaToastIdRef.current = null;
    }
  };

  const handlePaybillPayment = async (
    manualMode: 'till' | 'paybill' = mpesaAccountType
  ) => {
    if (cafeMode && cafeOrderType === 'dine_in' && !cafeTableId)
      return notify.error('Choose a table for this dine-in order');
    if (containsAgeRestrictedItem && !ageVerified) {
      setShowAgeVerification(true);
      return;
    }
    if (prescriptionRequired && !prescriptionReference.trim())
      return notify.error('Enter the prescription reference');
    if (containsRestrictedMedicine && !canApproveRestricted)
      return notify.error(
        'An authorized pharmacist or manager must complete this sale'
      );
    if (
      !checkoutIdempotencyKeyRef.current ||
      mpesaStatus === 'failed' ||
      mpesaStatus === 'timeout' ||
      mpesaStatus === 'cancelled'
    )
      checkoutIdempotencyKeyRef.current = createIdempotencyKey();
    setMpesaStatus('initiating');
    setMpesaMessage('Preparing Till / PayBill payment details…');
    setMpesaRef('');
    try {
      const response = await initiateMpesaPaybillPayment({
        phone: mpesaPhone,
        manualMode,
        items: cart.map(({ productId, quantity, packageId }) => ({
          productId,
          quantity,
          packageId,
        })),
        discountAmount,
        shippingAmount: shippingCost,
        roundoffEnabled,
        idempotencyKey: checkoutIdempotencyKeyRef.current,
        ageVerified,
        ageVerificationStatus: ageVerificationMode,
        ageOverrideReason:
          ageVerificationMode === 'OVERRIDDEN'
            ? ageOverrideReason.trim()
            : undefined,
        customerId: selectedCustomer || undefined,
        pointsToRedeem: appliedPoints || undefined,
        bonusToUse: appliedBonus || undefined,
        pharmacy:
          prescriptionRequired || containsRestrictedMedicine
            ? {
                prescriptionReference:
                  prescriptionReference.trim() || undefined,
                prescriberReference: prescriberReference.trim() || undefined,
                patientReference: patientReference.trim() || undefined,
                issuedAt: prescriptionIssuedAt
                  ? new Date(prescriptionIssuedAt)
                  : undefined,
                expiresAt: prescriptionExpiresAt
                  ? new Date(prescriptionExpiresAt)
                  : undefined,
                notes: pharmacyNotes.trim() || undefined,
              }
            : undefined,
        cafe: cafeMode
          ? {
              orderType: cafeOrderType,
              tableId: cafeOrderType === 'dine_in' ? cafeTableId : undefined,
              lines: cart.map((item) => ({
                productId: item.productId,
                packageId: item.packageId,
                quantity: item.quantity,
                modifierOptionIds: item.modifierOptionIds,
                notes: item.lineNotes,
              })),
            }
          : undefined,
      });
      setMpesaRequestId(response.id);
      window.localStorage.setItem(
        mpesaStorageKey,
        JSON.stringify({
          requestId: response.id,
          idempotencyKey: checkoutIdempotencyKeyRef.current,
          flow: 'paybill',
          accountReference: response.accountReference,
          shortcode: response.shortcode,
          accountType: response.accountType,
        })
      );
      setMpesaStatus(
        response.status === 'CONFIRMED'
          ? 'success'
          : response.status === 'FAILED'
            ? 'failed'
            : 'pending'
      );
      setMpesaMessage(response.message || 'Awaiting payment confirmation');
      setMpesaAccountReference(response.accountReference || '');
      setMpesaShortcode(response.shortcode);
      setMpesaAccountType(response.accountType);
      if (response.status === 'success' && response.receiptNumber)
        setMpesaRef(response.receiptNumber);
    } catch (error) {
      setMpesaStatus('failed');
      const rawMessage = error instanceof Error ? error.message : '';
      const message = rawMessage.includes('No active Till or PayBill')
        ? 'No Till or PayBill is configured for this branch.'
        : rawMessage.includes('M-Pesa is not enabled')
          ? 'Manual M-Pesa payments are disabled.'
          : rawMessage || 'Unable to load M-Pesa payment details.';
      setMpesaMessage(message);
      notify.error(message);
    }
  };

  const changeManualMpesaMode = async (manualMode: 'till' | 'paybill') => {
    if (manualMode === mpesaAccountType) return;
    if (!(await cancelActiveMpesaIntent())) return;
    setMpesaAccountType(manualMode);
    await handlePaybillPayment(manualMode);
  };

  const openManualMpesaFlow = async () => {
    notify.dismiss('pesaby:error:Enter a valid M-Pesa phone number.:');
    notify.dismiss('pesaby:error:Enter the customer M-Pesa phone number:');
    setMpesaMessage('');
    await switchMpesaFlow('paybill');
  };

  useEffect(() => {
    manualMpesaStartRef.current = () => void handlePaybillPayment();
  });

  const copyManualPaymentValue = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    notify.success(`${label} copied`);
  };

  const saveOptionalManualPhone = async () => {
    if (!mpesaRequestId) return;
    try {
      await setManualMpesaPayerPhone(mpesaRequestId, mpesaPhone);
    } catch (error) {
      notify.error('Could not save payer phone', {
        description: error instanceof Error ? error.message : 'Try again.',
      });
    }
  };

  const checkMpesaStatusNow = async () => {
    if (!mpesaRequestId) return;
    try {
      const result = await getMpesaPaymentStatus(mpesaRequestId);
      if (result.status === 'CONFIRMED' && result.saleId)
        setMpesaStatus('success');
      else if (
        [
          'SENDING_STK',
          'AWAITING_CUSTOMER',
          'AWAITING_CONFIRMATION',
          'FINALIZING',
        ].includes(result.status)
      )
        setMpesaStatus('pending');
      else if (result.status === 'EXPIRED') setMpesaStatus('timeout');
      else if (result.status === 'CANCELLED') setMpesaStatus('cancelled');
      else if (result.status === 'FAILED') setMpesaStatus('failed');
      setMpesaMessage(result.message || '');
      if (result.receiptNumber) setMpesaRef(result.receiptNumber);
      if (
        result.status === 'CONFIRMED' &&
        result.saleId &&
        result.receiptNumber &&
        !autoFinalizingRef.current
      ) {
        autoFinalizingRef.current = true;
        notify.success('M-Pesa payment received', {
          description: `${formatMpesaAmount(Number(result.amount))} confirmed.`,
        });
        window.setTimeout(() => autoFinalizeRef.current(), 500);
      }
    } catch (error) {
      notify.error('Could not check M-Pesa status', {
        description:
          error instanceof Error ? error.message : 'Try again shortly.',
      });
    }
  };

  const prepareNewMpesaPrompt = async () => {
    if (mpesaStatus === 'timeout' && mpesaRequestId) {
      await checkMpesaStatusNow();
      const latest = await getMpesaPaymentStatus(mpesaRequestId);
      if (latest.status === 'CONFIRMED' || latest.status === 'FINALIZING')
        return;
    }
    resetMpesaPrompt(false);
  };

  const findManualPayment = async () => {
    if (!mpesaRequestId) return;
    try {
      const result = await findManualMpesaPayment(mpesaRequestId);
      if (result.status === 'confirmed') {
        setMpesaRef(result.receiptNumber || '');
        setMpesaStatus('success');
        notify.success('M-Pesa payment received', {
          description: `${formatMpesaAmount(result.amount)} confirmed.`,
        });
        if (!autoFinalizingRef.current) {
          autoFinalizingRef.current = true;
          window.setTimeout(() => autoFinalizeRef.current(), 500);
        }
      } else if (result.status === 'amount_mismatch') {
        const overpaid = result.received > result.expected;
        setMpesaMessage(
          overpaid
            ? `Customer overpaid by ${formatMpesaAmount(result.received - result.expected)}. Send this payment to M-Pesa reconciliation or refund handling.`
            : `Payment amount does not match. Expected ${formatMpesaAmount(result.expected)}; received ${formatMpesaAmount(result.received)}.`
        );
        notify.error(
          overpaid
            ? `Customer overpaid by ${formatMpesaAmount(result.received - result.expected)}`
            : 'Payment amount does not match',
          {
            description: `Expected ${formatMpesaAmount(result.expected)} · Received ${formatMpesaAmount(result.received)}`,
          }
        );
      } else if (result.status === 'ambiguous') {
        setMpesaMessage(
          'Multiple possible payments found. A manager must resolve them in M-Pesa reconciliation.'
        );
        notify.error('Multiple possible payments found', {
          description:
            'Open M-Pesa reconciliation to select the correct transaction.',
        });
      } else {
        setMpesaMessage(
          'Payment not found yet. We have not received Safaricom confirmation.'
        );
        notify.info('Payment not found yet', {
          description:
            'Check again after the customer receives their M-Pesa message.',
        });
      }
    } catch (error) {
      notify.error('Could not find M-Pesa payment', {
        description:
          error instanceof Error ? error.message : 'Try again shortly.',
      });
    }
  };

  const sendAirtelPrompt = async () => {
    if (!airtelPhone.trim())
      return notify.error('Enter the customer Airtel Money phone number');
    setAirtelStatus('initiating');
    setAirtelMessage('Sending payment request…');
    setMpesaRef('');
    try {
      const result = await initiateAirtelMoneyPayment({
        phone: airtelPhone,
        amount: total,
      });
      setAirtelRequestId(result.requestId);
      setAirtelStatus(result.status);
      setAirtelMessage(result.message);
      if (result.reference) setMpesaRef(result.reference);
      notify.success(
        result.status === 'success'
          ? 'Airtel Money payment received'
          : 'Airtel Money prompt sent'
      );
    } catch (error) {
      setAirtelStatus('failed');
      const message =
        error instanceof Error
          ? error.message
          : 'Could not send Airtel Money prompt';
      setAirtelMessage(message);
      notify.error(message);
    }
  };

  const checkAirtelStatus = async () => {
    if (!airtelRequestId) return;
    try {
      const result = await getAirtelMoneyPaymentStatus(airtelRequestId);
      setAirtelStatus(result.status);
      setAirtelMessage(result.message);
      if (result.reference) setMpesaRef(result.reference);
      if (result.status === 'success')
        notify.success('Airtel Money payment confirmed');
      else if (result.status === 'pending')
        notify.info('Payment is still awaiting customer approval');
      else notify.error(result.message || 'Airtel Money payment failed');
    } catch (error) {
      notify.error(
        error instanceof Error
          ? error.message
          : 'Could not check Airtel Money payment'
      );
    }
  };

  const resetMpesaPrompt = (changePhone = false) => {
    setMpesaRequestId('');
    setMpesaStatus('idle');
    setMpesaMessage('');
    setMpesaRef('');
    checkoutIdempotencyKeyRef.current = '';
    window.localStorage.removeItem(mpesaStorageKey);
    if (changePhone) setMpesaPhone('');
  };

  const cancelActiveMpesaIntent = async () => {
    if (!mpesaRequestId) {
      resetMpesaPrompt(false);
      return true;
    }
    if (mpesaStatus === 'success') {
      notify.error('This M-Pesa payment is already confirmed', {
        description: 'Wait while Pesaby completes the sale.',
      });
      return false;
    }
    try {
      await cancelMpesaPayment(mpesaRequestId);
      resetMpesaPrompt(false);
      mpesaToastIdRef.current = null;
      return true;
    } catch (error) {
      notify.error('Could not switch payment method', {
        description:
          error instanceof Error
            ? error.message
            : 'Check the M-Pesa payment status and try again.',
      });
      await checkMpesaStatusNow();
      return false;
    }
  };

  const requestMpesaExitConfirmation = (
    destination: string,
    action: () => Promise<void>
  ) => {
    confirmedMpesaExitRef.current = action;
    setMpesaExitConfirmation({ open: true, destination, busy: false });
  };

  const switchPaymentMethod = async (
    nextMethod: PosPaymentMethod,
    confirmed = false
  ) => {
    if (nextMethod === paymentMethod) return;
    if (
      !confirmed &&
      paymentMethod === 'mpesa' &&
      mpesaRequestId &&
      ['initiating', 'pending'].includes(mpesaStatus)
    ) {
      const label =
        nextMethod === 'cash'
          ? 'Cash'
          : nextMethod === 'card'
            ? 'Card'
            : nextMethod === 'airtel_money'
              ? 'Airtel Money'
              : nextMethod === 'bank_transfer'
                ? 'Bank transfer'
                : 'another payment method';
      requestMpesaExitConfirmation(label, () =>
        switchPaymentMethod(nextMethod, true)
      );
      return;
    }
    if (paymentMethod === 'mpesa' && !(await cancelActiveMpesaIntent())) return;
    setMpesaRef('');
    setCardApproved(false);
    setCardResult('idle');
    setCardAttemptId('');
    setCardRecovery(false);
    if (nextMethod === 'cash' && !amountPaid) setAmountPaid(String(total));
    setPaymentMethod(nextMethod);
    setPaymentDialogOpen(true);
  };

  const switchMpesaFlow = async (
    nextFlow: 'stk' | 'paybill',
    confirmed = false
  ) => {
    if (nextFlow === mpesaFlow) return;
    if (
      !confirmed &&
      mpesaRequestId &&
      ['initiating', 'pending'].includes(mpesaStatus)
    ) {
      requestMpesaExitConfirmation(
        nextFlow === 'stk' ? 'Safaricom Prompt' : 'Till / PayBill',
        () => switchMpesaFlow(nextFlow, true)
      );
      return;
    }
    if (!(await cancelActiveMpesaIntent())) return;
    setMpesaFlow(nextFlow);
    if (nextFlow === 'paybill') await handlePaybillPayment();
  };

  const returnToCustomerStep = async (confirmed = false) => {
    if (
      !confirmed &&
      paymentMethod === 'mpesa' &&
      mpesaRequestId &&
      ['initiating', 'pending'].includes(mpesaStatus)
    ) {
      requestMpesaExitConfirmation('customer details', () =>
        returnToCustomerStep(true)
      );
      return;
    }
    if (paymentMethod === 'mpesa' && !(await cancelActiveMpesaIntent())) return;
    setCheckoutStep('customer');
  };

  const changeMpesaPhone = async (confirmed = false) => {
    if (
      !confirmed &&
      mpesaRequestId &&
      ['initiating', 'pending'].includes(mpesaStatus)
    ) {
      requestMpesaExitConfirmation('a different phone number', () =>
        changeMpesaPhone(true)
      );
      return;
    }
    if (!(await cancelActiveMpesaIntent())) return;
    setMpesaPhone('');
    setAirtelPhone('');
    setAirtelRequestId('');
    setAirtelStatus('idle');
    setAirtelMessage('');
  };

  useEffect(() => {
    cancelMpesaIntentRef.current = cancelActiveMpesaIntent;
    switchPaymentMethodRef.current = switchPaymentMethod;
  });

  const confirmMpesaExit = async () => {
    setMpesaExitConfirmation((current) => ({ ...current, busy: true }));
    await confirmedMpesaExitRef.current();
    setMpesaExitConfirmation({ open: false, destination: '', busy: false });
  };

  const handleNewSale = () => {
    setCart([]);
    setDiscount(0);
    setShippingCost(0);
    setRoundoffEnabled(true);
    setCouponCode('');
    setCouponValue(0);
    setMpesaRef('');
    setMpesaPhone('');
    setMpesaFlow('stk');
    setMpesaAccountReference('');
    setMpesaShortcode('');
    setMpesaAccountType('paybill');
    setMpesaRequestId('');
    setMpesaStatus('idle');
    setMpesaMessage('');
    setAmountPaid('');
    setPaymentReceiver('');
    setPaymentNote('');
    setSaleNote('');
    setStaffNote('');
    setPaymentDialogOpen(false);
    setSelectedCustomer('');
    setPrescriptionReference('');
    setPrescriberReference('');
    setPharmacyNotes('');
    setPaymentMethod('cash');
    setCreditDueDate('');
    setAgeVerified(false);
    setAgeConfirmed(false);
    setAgeIdReference('');
    setAgeVerificationMode('VERIFIED');
    setAgeOverrideReason('');
    setReceipt(null);
    setReceiptPrinted(false);
    setReceiptOptionsOpen(false);
    setSearch('');
    setCheckoutOpen(false);
    setCheckoutStep('customer');
    checkoutIdempotencyKeyRef.current = ''; // Reset for new sale
    autoFinalizingRef.current = false;
    window.localStorage.removeItem(cartStorageKey);
    window.localStorage.removeItem(checkoutStorageKey);
    window.localStorage.removeItem(mpesaStorageKey);
  };

  const openVoidDialog = () => {
    if (cart.length === 0) return;
    setShowVoidDialog(true);
  };

  const voidCurrentSale = () => {
    if (cart.length === 0) return;
    setCart([]);
    setDiscount(0);
    setShippingCost(0);
    setRoundoffEnabled(true);
    setCouponCode('');
    setCouponValue(0);
    setAmountPaid('');
    setMpesaRef('');
    setCheckoutOpen(false);
    setCheckoutStep('customer');
    checkoutIdempotencyKeyRef.current = '';
    window.localStorage.removeItem(cartStorageKey);
    window.localStorage.removeItem(checkoutStorageKey);
    setShowVoidDialog(false);
    notify.success('Current order voided');
  };

  const resetRegister = () => {
    handleNewSale();
    setShowResetDialog(false);
    notify.success('Register reset');
  };

  const openResetDialog = () => {
    if (cart.length === 0 && !checkoutOpen) {
      resetRegister();
      return;
    }
    setShowResetDialog(true);
  };

  const openHeldOrders = () => {
    if (!canHold) {
      setShowSalesHistory(true);
      return;
    }
    if (!hasActiveShift) {
      notify.error('Start a shift before viewing held sales');
      return;
    }
    setShowHeldSales(true);
    void refreshHeldSales();
  };

  const printerSettings = useMemo<ReceiptPrinterSettings>(
    () => ({
      mode: settings.receiptPrintingMode,
      printerName: settings.receiptPrinterName,
      paperWidth: receiptPaperWidth,
      autoPrint: settings.receiptAutoPrint,
      customerCopy: settings.receiptPrintCustomerCopy,
      copies: settings.receiptPrintCustomerCopy
        ? settings.receiptPrintCopies
        : 1,
      cashDrawerPulse: settings.receiptCashDrawerPulse,
    }),
    [
      receiptPaperWidth,
      settings.receiptAutoPrint,
      settings.receiptCashDrawerPulse,
      settings.receiptPrintCopies,
      settings.receiptPrintCustomerCopy,
      settings.receiptPrinterName,
      settings.receiptPrintingMode,
    ]
  );

  const handleBrowserPrintReceipt = useCallback(() => {
    const paper = document.querySelector<HTMLElement>(
      '.receipt-preview-origin .receipt-paper'
    );
    if (!paper) return notify.error('Receipt preview is unavailable');
    try {
      browserPrintReceipt(captureReceiptHtml(paper), receiptPaperWidth);
      notify.info('Print dialog opened', {
        description: 'Choose a printer in the browser dialog to continue.',
      });
    } catch {
      notify.error('Could not open the print dialog');
    }
  }, [receiptPaperWidth]);

  const handlePrintReceipt = useCallback(
    async (automatic = false) => {
      const paper = document.querySelector<HTMLElement>(
        '.receipt-preview-origin .receipt-paper'
      );
      if (!paper) return notify.error('Receipt preview is unavailable');
      if (printerSettings.mode === 'browser')
        return handleBrowserPrintReceipt();
      if (!hasConfiguredReceiptPrinter(printerSettings)) {
        notify.info('No receipt printer configured', {
          description:
            'Configure the receipt printer for this terminal before printing.',
          cancel: {
            label: 'Printer settings',
            onClick: () => {
              window.location.href = '/dashboard/admin/devices';
            },
          },
        });
        return;
      }
      setReceiptPrinting(true);
      const toastId = notify.loading('Printing receipt…', {
        description:
          printerSettings.printerName ||
          'Connecting to the configured thermal printer.',
      });
      try {
        if (automatic && receipt) {
          const claim = await claimAutomaticReceiptPrint(receipt.saleId);
          if (!claim.shouldPrint) return;
        }
        await directPrintReceipt(captureReceiptHtml(paper), printerSettings);
        setReceiptPrinted(true);
        notify.success('Receipt printed', {
          id: toastId,
          description: `Submitted to ${printerSettings.printerName}.`,
        });
        if (
          automatic &&
          receipt &&
          canAutomaticallyOpenCashDrawer({
            paymentMethod: receipt.paymentMethod,
            saleStatus: 'completed',
            printingMode: printerSettings.mode,
            cashDrawerPulseEnabled: printerSettings.cashDrawerPulse,
            isOfflineProvisional: Boolean(receipt.offline),
            hasActiveRegisteredTerminal: Boolean(offlineContext?.terminalId),
            hasOpenShift: Boolean(offlineContext?.sessionId),
          })
        ) {
          try {
            const authorization = await authorizeAutomaticCashDrawerOpen(
              receipt.saleId
            );
            if (!authorization.shouldPulse) return;
            if (authorization.transport === 'raw-tcp') {
              const response = await fetch('/api/printing/raw-tcp/drawer', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ saleId: receipt.saleId }),
              });
              if (!response.ok) throw new Error(await response.text());
            } else if (authorization.printerName)
              await openQzCashDrawer(authorization.printerName);
          } catch (drawerError) {
            const copy = getReceiptPrinterErrorCopy(drawerError);
            notify.error('Sale completed, but the drawer did not open', {
              description: `${copy.description} Ask a manager to open it manually.`,
            });
          }
        }
      } catch (error) {
        const copy = getReceiptPrinterErrorCopy(error);
        notify.error(copy.title, {
          id: toastId,
          description: copy.description,
          action: {
            label: 'Try again',
            onClick: () => retryReceiptPrintRef.current(),
          },
        });
      } finally {
        setReceiptPrinting(false);
      }
    },
    [handleBrowserPrintReceipt, offlineContext, printerSettings, receipt]
  );

  useEffect(() => {
    retryReceiptPrintRef.current = () => void handlePrintReceipt();
  }, [handlePrintReceipt]);

  useEffect(() => {
    if (
      !receipt ||
      !settings.receiptAutoPrint ||
      settings.receiptPrintingMode !== 'direct' ||
      autoPrintedReceiptRef.current === receipt.saleId
    )
      return;
    autoPrintedReceiptRef.current = receipt.saleId;
    const timer = window.setTimeout(() => void handlePrintReceipt(true), 250);
    return () => window.clearTimeout(timer);
  }, [
    handlePrintReceipt,
    receipt,
    settings.receiptAutoPrint,
    settings.receiptPrintingMode,
  ]);

  const handleDownloadReceipt = useCallback(async () => {
    if (!receipt) return;
    try {
      const paper = document.querySelector<HTMLElement>(
        '.receipt-preview-origin .receipt-paper'
      );
      if (!paper) return notify.error('Receipt preview is unavailable');

      // Render the exact receipt component in an isolated, unscaled host. This
      // keeps Download independent from screen-only preview scaling while using
      // the same live receipt DOM (including its logo and generated QR image).
      const exportHost = document.createElement('div');
      const exportPaper = paper.cloneNode(true) as HTMLElement;
      exportHost.setAttribute('aria-hidden', 'true');
      exportHost.style.cssText =
        'position:fixed;left:-10000px;top:0;z-index:-1;background:#fff;zoom:1;transform:none;';
      exportPaper.style.width = `${receiptPaperWidth}mm`;
      exportPaper.style.maxWidth = `${receiptPaperWidth}mm`;
      exportPaper.style.margin = '0';
      exportPaper.style.zoom = '1';
      exportPaper.style.transform = 'none';
      exportHost.appendChild(exportPaper);
      document.body.appendChild(exportHost);

      if (document.fonts?.ready) await document.fonts.ready;
      await Promise.all(
        Array.from(exportPaper.querySelectorAll('img')).map((image) =>
          image.complete
            ? Promise.resolve()
            : new Promise<void>((resolve) => {
                image.addEventListener('load', () => resolve(), { once: true });
                image.addEventListener('error', () => resolve(), {
                  once: true,
                });
              })
        )
      );

      // Capture the same thermal receipt component used by preview and print.
      // The sale is never re-created or mutated during export.
      try {
        const [{ jsPDF }, html2canvasModule] = await Promise.all([
          import('jspdf'),
          import('html2canvas'),
        ]);
        const exportHeight = exportPaper.scrollHeight;
        // Keep large receipts sharp without allowing very long sales to create
        // an oversized canvas that locks up the browser.
        const renderScale = Math.max(
          1,
          Math.min(2, 12000 / Math.max(exportHeight, 1))
        );
        const canvas = await html2canvasModule.default(exportPaper, {
          backgroundColor: '#ffffff',
          scale: renderScale,
          useCORS: true,
          logging: false,
          width: exportPaper.offsetWidth,
          height: exportHeight,
          windowWidth: exportPaper.offsetWidth,
          windowHeight: exportHeight,
        });
        const paperWidthMm = receiptPaperWidth;
        const paperHeightMm = (canvas.height / canvas.width) * paperWidthMm;
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: [paperWidthMm, paperHeightMm],
          compress: true,
        });
        pdf.addImage(
          canvas.toDataURL('image/png'),
          'PNG',
          0,
          0,
          paperWidthMm,
          paperHeightMm,
          undefined,
          'FAST'
        );
        pdf.save(`${receipt.receiptNo}.pdf`);
        notify.success('Receipt PDF downloaded');
      } finally {
        exportHost.remove();
      }
    } catch {
      notify.error('Could not download receipt');
    }
  }, [receipt, receiptPaperWidth]);

  const handleShareReceipt = useCallback(async () => {
    if (!receipt) return;
    const provisional =
      receipt.offline?.status === 'PENDING'
        ? 'PROVISIONAL OFFLINE RECEIPT · synchronization pending · not an official or fiscal receipt · '
        : '';
    const text = `${provisional}Receipt ${receipt.receiptNo} · ${formatCurrency(receipt.total)} · ${receipt.paymentMethod}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `Receipt ${receipt.receiptNo}`, text });
        return;
      }
      await navigator.clipboard.writeText(text);
      notify.success('Receipt details copied');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      notify.error('Could not share receipt details');
    }
  }, [receipt]);

  const openHoldDialog = () => {
    if (!canHold || cart.length === 0 || heldSaleActionId) return;
    setHoldReference(
      `HLD-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`
    );
    setShowHoldDialog(true);
  };

  const holdSale = async () => {
    if (!canHold || cart.length === 0) return;
    const reference =
      holdReference.trim() || `HLD-${Date.now().toString(36).toUpperCase()}`;
    if (!isOnline)
      return notify.error(
        'Reconnect to hold this sale on the shared register queue'
      );
    const requestId = createIdempotencyKey();
    setHeldSaleActionId(requestId);
    try {
      const saved = await holdSaleOnServer({
        idempotencyKey: requestId,
        items: cart,
        discountValue: discountAmount,
        discountType: 'fixed',
        customerId: selectedCustomer || undefined,
        note: reference,
      });
      setHeldSales((previous) => [
        saved,
        ...previous.filter((item) => item.id !== saved.id),
      ]);
      setCart([]);
      setDiscount(0);
      setShippingCost(0);
      setRoundoffEnabled(true);
      setCouponCode('');
      setCouponValue(0);
      setSelectedCustomer('');
      setAmountPaid('');
      setMpesaRef('');
      setCheckoutOpen(false);
      setShowHoldDialog(false);
      setHoldReference('');
      checkoutIdempotencyKeyRef.current = '';
      window.localStorage.removeItem(cartStorageKey);
      window.localStorage.removeItem(checkoutStorageKey);
      notify.success('Sale held for this branch', {
        description: 'It can be resumed from another authorized register.',
      });
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : 'Could not hold this sale'
      );
    } finally {
      setHeldSaleActionId(null);
    }
  };

  const resumeHeldSale = async (heldSale: HeldSale) => {
    if (!isOnline)
      return notify.error('Reconnect before resuming a shared held sale');
    setHeldSaleActionId(heldSale.id);
    try {
      const result = await resumeHeldSaleFromServer(heldSale.id);
      setCart(result.heldSale.cart);
      setDiscount(result.heldSale.discount);
      setDiscountType(result.heldSale.discountType);
      setShippingCost(0);
      setRoundoffEnabled(true);
      setCouponCode('');
      setCouponValue(0);
      setSelectedCustomer(result.heldSale.customerId);
      setHeldSales((previous) =>
        previous.filter((sale) => sale.id !== heldSale.id)
      );
      setShowHeldSales(false);
      setCheckoutOpen(false);
      checkoutIdempotencyKeyRef.current = '';
      window.localStorage.removeItem(checkoutStorageKey);
      notify.success(
        result.priceChanged
          ? 'Held sale restored with current prices'
          : 'Held sale restored'
      );
    } catch (error) {
      notify.error(
        error instanceof Error
          ? error.message
          : 'Could not resume this held sale'
      );
      await refreshHeldSales();
    } finally {
      setHeldSaleActionId(null);
    }
  };

  const deleteHeldSale = async (heldSale: HeldSale) => {
    if (!isOnline)
      return notify.error('Reconnect before discarding a shared held sale');
    setHeldSaleActionId(heldSale.id);
    try {
      await discardHeldSale(heldSale.id);
      setHeldSales((previous) =>
        previous.filter((sale) => sale.id !== heldSale.id)
      );
      notify.success('Held sale discarded');
    } catch (error) {
      notify.error(
        error instanceof Error
          ? error.message
          : 'Could not discard this held sale'
      );
    } finally {
      setHeldSaleActionId(null);
    }
  };

  const handleCreateCustomer = async () => {
    if (!newCustomerName.trim()) {
      notify.error('Customer name is required');
      return;
    }
    if (!newCustomerPhone.trim()) {
      notify.error('Customer phone is required');
      return;
    }

    setCreatingCustomer(true);
    try {
      const customerAddress = [
        newCustomerAddress.trim(),
        newCustomerCity.trim(),
        newCustomerCountry.trim(),
      ]
        .filter(Boolean)
        .join(', ');
      const { id } = await createCustomer({
        name: newCustomerName,
        phone: newCustomerPhone,
        email: newCustomerEmail || undefined,
        address: customerAddress || undefined,
      });

      // Add new customer to list
      const newCust = {
        id,
        name: newCustomerName,
        phone: newCustomerPhone || null,
        email: newCustomerEmail || null,
        address: customerAddress || null,
        kraPin: null,
        customerType: 'individual',
        vatRegistered: false,
        loyaltyPoints: 0,
        userId: '',
        orgId: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setAvailableCustomers([...availableCustomers, newCust]);
      setSelectedCustomer(id);

      // Reset form
      setNewCustomerName('');
      setNewCustomerPhone('');
      setNewCustomerEmail('');
      setNewCustomerAddress('');
      setNewCustomerCity('');
      setNewCustomerCountry('Kenya');
      setShowNewCustomer(false);

      notify.success('Customer created successfully');
    } catch (err) {
      notify.error(
        err instanceof Error ? err.message : 'Failed to create customer'
      );
    } finally {
      setCreatingCustomer(false);
    }
  };

  const inputCls = ui.input;
  const activeCustomer = availableCustomers.find(
    (customer) => customer.id === selectedCustomer
  );

  // Show refund dialog if refund sale is set
  if (showRefundDialog && receipt && receipt.offline?.status !== 'PENDING') {
    const saleWithItems: Sale & { items: SaleItem[] } = {
      ...receipt,
      id: receipt.saleId,
      subtotal: receipt.subtotal.toString(),
      taxAmount: receipt.taxAmount.toString(),
      discountAmount: receipt.discountAmount.toString(),
      shippingAmount: receipt.shippingAmount.toString(),
      roundingAmount: receipt.roundingAmount.toString(),
      total: receipt.total.toString(),
      loyaltyPointsEarned: 0,
      loyaltyPointsRedeemed: 0,
      loyaltyRedemptionValue: '0',
      bonusRedeemed: '0',
      rewardEligibleSpend: '0',
      rewardEarningRateSnapshot: null,
      rewardPointValueSnapshot: null,
      customerId: selectedCustomer || null,
      amountReceived:
        receipt.paymentMethod === 'cash'
          ? String(parseFloat(amountPaid || '0'))
          : null,
      change: receipt.change.toString(),
      mpesaRef: receipt.mpesaRef || null,
      idempotencyKey: receipt.idempotencyKey,
      ageVerified: receipt.ageVerified,
      ageVerifiedAt: receipt.ageVerified ? receipt.completedAt : null,
      ageVerifiedBy: null,
      branchId: null,
      posSessionId: null,
      terminalId: null,
      quotationId: null,
      origin: receipt.offline ? 'offline' : 'online',
      provisionalReceiptNo: receipt.offline?.provisionalReceiptNo ?? null,
      offlineCreatedAt: receipt.offline ? receipt.completedAt : null,
      syncedAt: receipt.offline?.status === 'SYNCED' ? new Date() : null,
      status: 'completed',
      userId: '',
      orgId: '',
      createdAt: receipt.completedAt,
      items: receipt.items.map((item) => ({
        id: item.saleItemId,
        saleId: receipt.saleId,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        packageId: item.packageId ?? null,
        packageName: item.packageName ?? null,
        baseUnitQuantity: item.baseUnitQuantity ?? 1,
        unitPrice: item.unitPrice.toString(),
        totalPrice: item.totalPrice.toString(),
        unitCostAtSale: '0',
        totalCost: '0',
        rewardEligibleAmount: '0',
        userId: '',
        orgId: '',
      })),
    };

    return (
      <RefundDialog
        sale={saleWithItems}
        onClose={() => setShowRefundDialog(false)}
        onSuccess={(returnedItems) => {
          setCatalogProducts((current) =>
            current.map((product) => {
              const returned = returnedItems.find(
                (item) => item.productId === product.id
              );
              return returned
                ? { ...product, stock: product.stock + returned.quantity }
                : product;
            })
          );
          setShowRefundDialog(false);
          handleNewSale();
          notify.success('Refund processed successfully');
        }}
      />
    );
  }

  // A completed sale stays in the register workspace. Cashiers should not have
  // to work through a consumer-style modal or a blurred copy of the POS.
  if (receipt) {
    const printableSale = {
      id: receipt.saleId,
      receiptNo: receipt.receiptNo,
      createdAt: receipt.completedAt,
      subtotal: receipt.subtotal.toFixed(2),
      taxAmount: receipt.taxAmount.toFixed(2),
      discountAmount: receipt.discountAmount.toFixed(2),
      shippingAmount: receipt.shippingAmount,
      couponAmount,
      couponCode: couponCode || null,
      bonusRedeemed: appliedBonus,
      roundingAmount: receipt.roundingAmount.toFixed(2),
      total: receipt.total.toFixed(2),
      paymentMethod: receipt.paymentMethod,
      mpesaRef: receipt.mpesaRef ?? null,
      cafeOrder: receipt.cafeOrder,
      items: receipt.items.map((item) => ({
        id: item.saleItemId,
        productName: item.productName,
        productId: item.productId,
        quantity: item.quantity,
        totalPrice: item.totalPrice.toFixed(2),
        modifierNames: item.modifierNames,
        lineNotes: item.lineNotes,
      })),
      etims: receipt.etims?.showOnReceipt ? receipt.etims : null,
      offline: receipt.offline ?? null,
      mpesaDetails:
        receipt.paymentMethod === 'mpesa'
          ? {
              mode: receipt.mpesaMode,
              phone: receipt.mpesaPhone
                ? maskKenyanPhone(receipt.mpesaPhone)
                : undefined,
              merchant: receipt.mpesaMerchant,
              accountReference: receipt.mpesaAccountReference,
            }
          : null,
    };

    const paymentLabel =
      receipt.paymentMethod === 'mpesa'
        ? 'M-Pesa'
        : receipt.paymentMethod === 'airtel_money'
          ? 'Airtel Money'
          : receipt.paymentMethod === 'card'
            ? 'Card'
            : receipt.paymentMethod === 'bank_transfer'
              ? 'Bank transfer'
              : 'Cash';
    const taxLabel =
      settings.taxEnabled && settings.taxRate > 0
        ? `${settings.taxName} (${settings.taxRate}%)`
        : settings.taxName;
    const discountDetail =
      receipt.discountType === 'percentage' && receipt.discountValue != null
        ? `${receipt.discountValue}% discount`
        : receipt.discountAmount > 0
          ? 'Fixed amount discount'
          : null;
    const discountValue =
      receipt.discountType === 'percentage' && receipt.discountValue != null
        ? `${receipt.discountValue}%`
        : receipt.discountValue != null
          ? formatCurrency(receipt.discountValue)
          : formatCurrency(receipt.discountAmount);

    return (
      <section
        aria-label="Completed sale receipt"
        className="pos-sale-complete flex min-h-[calc(100vh-8rem)] w-full items-center justify-center bg-[#f5f6f8] px-3 py-6 dark:bg-[var(--dashboard-bg)] sm:px-6 sm:py-8"
      >
        <div className="w-full max-w-[1020px]">
          <div className="mb-4 flex flex-col gap-4 rounded-[10px] border border-[#b7ebc6] bg-white px-4 py-3.5 shadow-[0_3px_12px_rgba(16,24,40,.07)] dark:border-[#1d6b3b] dark:bg-[var(--dashboard-surface)] sm:px-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border',
                  receipt.offline?.status === 'PENDING'
                    ? 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30'
                    : 'border-[#b7ebc6] bg-[#ecfdf3] dark:border-[#1d6b3b] dark:bg-[#102417]'
                )}
              >
                {receipt.offline?.status === 'PENDING' ? (
                  <CloudOff
                    className="h-4 w-4 text-amber-700 dark:text-amber-300"
                    aria-hidden="true"
                  />
                ) : (
                  <CheckCircle2
                    className="h-5 w-5 text-[#12b76a] dark:text-[#86efac]"
                    aria-hidden="true"
                  />
                )}
              </span>
              <div>
                <p className="text-[15px] font-bold text-[#101828] dark:text-white">
                  {receipt.offline?.status === 'PENDING'
                    ? 'Offline cash sale saved'
                    : receipt.offline?.status === 'SYNCED'
                      ? 'Offline sale synchronized'
                      : 'Sale completed'}
                </p>
                <p className="mt-0.5 text-xs text-[#667085] dark:text-[#c7b978]">
                  {receipt.offline?.status === 'PENDING'
                    ? `Provisional receipt ${receipt.receiptNo} · sync pending`
                    : `Paid successfully · Receipt #${receipt.receiptNo}`}
                </p>
                {receipt.etims && receipt.etims.status !== 'NOT_REQUIRED' && (
                  <p
                    className={`mt-1 text-xs font-semibold ${receipt.etims.status === 'ACCEPTED' ? 'text-emerald-700 dark:text-emerald-300' : receipt.etims.status === 'FAILED' ? 'text-rose-700 dark:text-rose-300' : 'text-amber-700 dark:text-amber-300'}`}
                  >
                    eTIMS:{' '}
                    {receipt.etims.status === 'ACCEPTED'
                      ? 'Accepted'
                      : receipt.etims.status === 'FAILED'
                        ? 'Action required'
                        : 'Pending submission'}
                  </p>
                )}
              </div>
            </div>
            <div className="shrink-0 border-t border-[#e4e7ec] pt-3 text-left dark:border-white/10 sm:text-right lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
              <p className="text-xl font-extrabold tracking-tight text-[#101828] dark:text-white">
                {formatCurrency(receipt.total)}
              </p>
              <p className="text-xs text-[#667085] dark:text-[#c7b978]">
                {formatDateTime(receipt.completedAt)}
              </p>
            </div>
          </div>

          <div className="grid overflow-hidden rounded-[10px] border border-[#dfe3ea] bg-white shadow-[0_4px_16px_rgba(16,24,40,.06)] dark:border-white/10 dark:bg-[var(--dashboard-surface)] lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="flex min-h-[500px] items-center justify-center bg-[#f7f8fa] p-5 dark:bg-[var(--dashboard-surface-subtle)] sm:p-8">
              <div className="receipt-preview-scroll max-w-full">
                <div className="receipt-screen-preview w-fit max-w-full">
                  <div
                    className="receipt-preview-origin mx-auto w-full max-w-[80mm] overflow-hidden rounded-[4px] bg-white shadow-[0_8px_24px_rgba(16,24,40,.12)] ring-1 ring-black/5"
                    style={{ width: `${receiptPaperWidth}mm` }}
                  >
                    <ReceiptTemplate
                      sale={printableSale}
                      businessName={settings.receiptBusinessName}
                      businessPhone={settings.receiptPhone}
                      businessAddress={settings.receiptAddress}
                      receiptFooter={settings.receiptFooter}
                      cashierName={receiptContext?.cashierName}
                      customerName={receipt.customerName}
                      layout="thermal"
                      template={settings.receiptTemplate}
                      logoUrl={settings.receiptLogoUrl}
                      taxName={taxLabel}
                      showPhone={settings.receiptShowPhone}
                      showAddress={settings.receiptShowAddress}
                      showCashier={settings.receiptShowCashier}
                      showCustomer={settings.receiptShowCustomer}
                      showPayment={settings.receiptShowPayment}
                      showQrCode={settings.receiptShowQrCode}
                      showItemSku={settings.receiptShowItemSku}
                      showShipping={settings.receiptShowShipping}
                      showCoupon={settings.receiptShowCoupon}
                      showBonus={settings.receiptShowBonus}
                    />
                  </div>
                </div>
              </div>
            </div>

            <aside className="flex flex-col border-t border-[#e4e7ec] bg-white p-5 dark:border-white/10 dark:bg-[var(--dashboard-surface)] sm:p-6 lg:border-l lg:border-t-0">
              <div className="space-y-5">
                <div>
                  <p className={ui.label}>Payment</p>
                  <div className="mt-3 border-b border-[#e4e7ec] pb-5 dark:border-white/10">
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2.5 text-[15px] font-semibold text-[#101828] dark:text-white">
                        <WalletCards className="h-[18px] w-[18px] text-[#e94e1b]" />
                        {paymentLabel}
                      </span>
                      <span className="text-[15px] font-bold text-[#101828] dark:text-white">
                        {formatCurrency(receipt.total)}
                      </span>
                    </div>
                    {receipt.paymentMethod === 'cash' &&
                      receipt.amountReceived != null && (
                        <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2.5 border-t border-[#e4e7ec] pt-4 text-[13px] dark:border-white/10">
                          <span className="text-[#667085] dark:text-[#a8a8a8]">
                            Cash received
                          </span>
                          <span className="text-right font-semibold text-[#101828] dark:text-white">
                            {formatCurrency(receipt.amountReceived)}
                          </span>
                          <span
                            className={cn(
                              'font-semibold',
                              receipt.change > 0
                                ? 'text-[#067647] dark:text-[#8de1aa]'
                                : 'text-[#667085] dark:text-[#a8a8a8]'
                            )}
                          >
                            {receipt.change > 0 ? 'Change due' : 'Change'}
                          </span>
                          <span
                            className={cn(
                              'text-right font-semibold tabular-nums',
                              receipt.change > 0
                                ? 'rounded-md bg-[#ecfdf3] px-2 py-1 text-base font-bold text-[#067647] dark:bg-emerald-950/45 dark:text-[#8de1aa]'
                                : 'text-[13px] text-[#667085] dark:text-[#a8a8a8]'
                            )}
                          >
                            {formatCurrency(receipt.change)}
                          </span>
                        </div>
                      )}
                    {receipt.mpesaRef && (
                      <div className="mt-3 space-y-1.5 border-t border-[#e4e7ec] pt-3 text-xs dark:border-white/10">
                        <div className="flex justify-between gap-3">
                          <span className="text-[#667085] dark:text-[#a8a8a8]">
                            M-Pesa receipt
                          </span>
                          <span className="font-semibold text-[#101828] dark:text-white">
                            {receipt.mpesaRef}
                          </span>
                        </div>
                        {receipt.mpesaMode && (
                          <div className="flex justify-between gap-3">
                            <span className="text-[#667085] dark:text-[#a8a8a8]">
                              Mode
                            </span>
                            <span className="font-semibold text-[#101828] dark:text-white">
                              {receipt.mpesaMode === 'stk'
                                ? 'STK Push'
                                : receipt.mpesaMode === 'till'
                                  ? 'Till'
                                  : 'PayBill'}
                            </span>
                          </div>
                        )}
                        {receipt.mpesaMerchant &&
                          receipt.mpesaMode !== 'stk' && (
                            <div className="flex justify-between gap-3">
                              <span className="text-[#667085] dark:text-[#a8a8a8]">
                                {receipt.mpesaMode === 'till'
                                  ? 'Till'
                                  : 'PayBill'}
                              </span>
                              <span className="font-semibold text-[#101828] dark:text-white">
                                {receipt.mpesaMerchant}
                              </span>
                            </div>
                          )}
                        {receipt.mpesaAccountReference && (
                          <div className="flex justify-between gap-3">
                            <span className="text-[#667085] dark:text-[#a8a8a8]">
                              Account
                            </span>
                            <span className="font-semibold text-[#101828] dark:text-white">
                              {receipt.mpesaAccountReference}
                            </span>
                          </div>
                        )}
                        {receipt.mpesaPhone && (
                          <div className="flex justify-between gap-3">
                            <span className="text-[#667085] dark:text-[#a8a8a8]">
                              Phone
                            </span>
                            <span className="font-semibold text-[#101828] dark:text-white">
                              {maskKenyanPhone(receipt.mpesaPhone)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                    {(receipt.taxAmount > 0 || receipt.discountAmount > 0) && (
                      <div className="mt-3 space-y-1.5 border-t border-[#e4e7ec] pt-3 text-xs dark:border-white/10">
                        {receipt.taxAmount > 0 && (
                          <div className="flex justify-between gap-3">
                            <span className="text-[#667085] dark:text-[#a8a8a8]">
                              {taxLabel}
                            </span>
                            <span className="font-semibold text-[#101828] dark:text-white">
                              {formatCurrency(receipt.taxAmount)}
                            </span>
                          </div>
                        )}
                        {receipt.discountAmount > 0 && (
                          <>
                            <div className="flex justify-between gap-3">
                              <span className="text-[#667085] dark:text-[#a8a8a8]">
                                {discountDetail}
                              </span>
                              <span className="font-semibold text-[#101828] dark:text-white">
                                {discountValue}
                              </span>
                            </div>
                            <div className="flex justify-between gap-3">
                              <span className="text-[#067647] dark:text-[#8de1aa]">
                                Amount saved
                              </span>
                              <span className="font-semibold text-[#067647] dark:text-[#8de1aa]">
                                −{formatCurrency(receipt.discountAmount)}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-x-6 gap-y-5 border-b border-[#e4e7ec] pb-5 dark:border-white/10 min-[380px]:grid-cols-2">
                  <ReceiptMeta
                    mark={
                      <UserRound className="h-3.5 w-3.5 text-[#667085] dark:text-[#a8a8a8]" />
                    }
                    label="Customer"
                    value={receipt.customerName}
                  />
                  {receiptContext?.cashierName && (
                    <ReceiptMeta
                      mark={
                        <BadgeCheck className="h-3.5 w-3.5 text-[#667085] dark:text-[#a8a8a8]" />
                      }
                      label="Cashier"
                      value={receiptContext.cashierName}
                    />
                  )}
                  {receiptContext?.registerName && (
                    <ReceiptMeta
                      mark={
                        <Monitor className="h-3.5 w-3.5 text-[#667085] dark:text-[#a8a8a8]" />
                      }
                      label="Register"
                      value={receiptContext.registerName}
                    />
                  )}
                  {receiptContext?.locationName && (
                    <ReceiptMeta
                      mark={
                        <MapPin className="h-3.5 w-3.5 text-[#667085] dark:text-[#a8a8a8]" />
                      }
                      label="Location"
                      value={receiptContext.locationName}
                    />
                  )}
                </div>
              </div>
              <div className="mt-5 space-y-2.5">
                {receipt.offline?.status === 'PENDING' && (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs text-amber-950 dark:border-amber-800 dark:bg-amber-950/25 dark:text-amber-100">
                    <p className="font-bold">
                      Official receipt and eTIMS pending
                    </p>
                    <p className="mt-1 leading-4 opacity-80">
                      Keep this provisional receipt. Pesaby will synchronize it
                      when the register reconnects.
                    </p>
                    {isOnline && (
                      <button
                        type="button"
                        disabled={offlineSyncing}
                        onClick={() => void synchronizeOfflineQueue()}
                        className="mt-2 inline-flex items-center gap-1.5 font-bold underline underline-offset-2"
                      >
                        {offlineSyncing ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )}
                        Synchronize now
                      </button>
                    )}
                  </div>
                )}
                <button
                  onClick={handleNewSale}
                  className="flex h-12 w-full items-center justify-center gap-2.5 rounded-[6px] border border-[#e94e1b] bg-[#e94e1b] text-[15px] font-bold text-white shadow-[0_4px_14px_rgba(233,78,27,.18)] transition-all duration-300 hover:-translate-y-px hover:border-[#cf4215] hover:bg-[#cf4215] hover:shadow-[0_5px_16px_rgba(233,78,27,.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e94e1b]/40"
                >
                  <Plus className="h-4 w-4" />
                  Start next sale
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => void handlePrintReceipt()}
                    disabled={receiptPrinting}
                    className="flex h-11 items-center justify-center gap-2 rounded-[6px] border border-[#092c4c] bg-[#092c4c] px-3 text-sm font-semibold text-white shadow-[0_3px_10px_rgba(9,44,76,.14)] transition-all duration-300 hover:border-[#061f36] hover:bg-[#061f36] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#092c4c]/35 disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {receiptPrinting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Printer className="h-4 w-4" />
                    )}
                    {receiptPrinting
                      ? 'Printing…'
                      : receiptPrinted
                        ? 'Reprint receipt'
                        : 'Print receipt'}
                  </button>
                  <button
                    onClick={handleDownloadReceipt}
                    className="flex h-11 items-center justify-center gap-2 rounded-[6px] border border-[#155eef] bg-[#155eef] px-3 text-sm font-semibold text-white shadow-[0_3px_10px_rgba(21,94,239,.14)] transition-all duration-300 hover:border-[#0e50d2] hover:bg-[#0e50d2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#155eef]/35"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <button
                    onClick={() => void handleShareReceipt()}
                    className={cn(
                      ui.subtleBtn,
                      'flex h-11 items-center justify-center gap-2 rounded-[6px] text-sm font-semibold'
                    )}
                  >
                    <Share2 className="h-4 w-4" />
                    Share
                  </button>
                  <div className="relative">
                    <button
                      aria-label="Receipt options"
                      aria-expanded={receiptOptionsOpen}
                      onClick={() => setReceiptOptionsOpen((open) => !open)}
                      className={cn(
                        ui.subtleBtn,
                        'flex h-11 w-11 items-center justify-center rounded-[6px] px-0'
                      )}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                    {receiptOptionsOpen && (
                      <div className="absolute bottom-12 right-0 z-10 w-40 rounded-lg border border-[#dfe3ea] bg-white p-1.5 shadow-lg dark:border-white/10 dark:bg-[#1c1c1c]">
                        <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#667085] dark:text-[#a8a8a8]">
                          Print options
                        </p>
                        <p className="px-2 pt-2 text-[10px] font-semibold uppercase tracking-wide text-[#667085] dark:text-[#a8a8a8]">
                          Paper width
                        </p>
                        {([80, 58] as const).map((width) => (
                          <button
                            key={width}
                            onClick={() => {
                              setReceiptPaperWidth(width);
                              setReceiptOptionsOpen(false);
                            }}
                            className={cn(
                              'flex w-full rounded-md px-2 py-1.5 text-left text-xs font-medium hover:bg-[#f9fafb] dark:hover:bg-white/5',
                              receiptPaperWidth === width &&
                                'bg-[#fff5cf] text-[#7a5200] dark:bg-[#3a2d0d] dark:text-[#ffd86a]'
                            )}
                          >
                            {width} mm
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleNewSale}
                  className="mt-1 flex h-9 w-full items-center justify-center gap-2 rounded-[6px] text-xs font-semibold text-[#667085] transition-colors hover:bg-[#f7f8fa] hover:text-[#101828] dark:text-[#a8a8a8] dark:hover:bg-white/5 dark:hover:text-white"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to POS
                </button>
              </div>
            </aside>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div
      className={cn(
        'pos-terminal relative grid gap-4 bg-transparent sm:gap-5 lg:grid-cols-[minmax(0,1fr)_460px] lg:items-stretch xl:grid-cols-[minmax(0,1fr)_minmax(500px,30%)]',
        standalone
          ? 'min-h-0 lg:flex-1'
          : 'min-h-[calc(100vh-10.5rem)] lg:h-[calc(100dvh-10.5rem)] lg:min-h-[520px]',
        showOfflineStatus && 'lg:grid-rows-[auto_minmax(0,1fr)]',
        checkoutOnly &&
          'w-full max-w-none bg-transparent lg:h-auto lg:grid-cols-1 lg:gap-6'
      )}
    >
      {showOfflineStatus && (
        <div
          className={cn(
            'flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-xs lg:col-span-2',
            !isOnline
              ? 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/25 dark:text-amber-100'
              : offlineQueueSummary.failed
                ? 'border-rose-300 bg-rose-50 text-rose-950 dark:border-rose-900 dark:bg-rose-950/25 dark:text-rose-100'
                : 'border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-900 dark:bg-sky-950/25 dark:text-sky-100'
          )}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-2.5">
            {!isOnline ? (
              <CloudOff className="mt-0.5 h-4 w-4 shrink-0" />
            ) : offlineSyncing ? (
              <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
            ) : (
              <RefreshCw className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <div>
              <p className="font-bold">
                {!isOnline
                  ? 'Offline cash mode'
                  : offlineQueueSummary.failed
                    ? 'Offline sales need attention'
                    : offlineSyncing
                      ? 'Synchronizing offline sales'
                      : 'Offline sales waiting to synchronize'}
              </p>
              <p className="mt-0.5 opacity-80">
                {!isOnline
                  ? 'Cash sales are saved on this register. M-Pesa, card and eTIMS remain unavailable until reconnection.'
                  : `${offlineQueueSummary.pending} pending · ${offlineQueueSummary.failed} failed · ${offlineQueueSummary.synced} synchronized on this register`}
              </p>
              {offlineQueueSummary.failed > 0 && (
                <details className="mt-1.5">
                  <summary className="cursor-pointer font-semibold underline underline-offset-2">
                    View sync errors
                  </summary>
                  <ul className="mt-1 space-y-1">
                    {offlineSales
                      .filter((item) => item.status === 'FAILED')
                      .map((item) => (
                        <li key={item.id}>
                          <b>{item.provisionalReceiptNo}:</b>{' '}
                          {item.lastError || 'Synchronization failed'}
                        </li>
                      ))}
                  </ul>
                </details>
              )}
            </div>
          </div>
          {isOnline && (
            <button
              type="button"
              disabled={offlineSyncing}
              onClick={() => void synchronizeOfflineQueue()}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-current/20 bg-background/70 px-3 font-bold disabled:opacity-50"
            >
              {offlineSyncing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Retry synchronization
            </button>
          )}
        </div>
      )}
      {/* Left: Product catalog */}
      <section
        className={cn(
          ui.card,
          'flex min-h-0 min-w-0 flex-col overflow-hidden lg:min-h-0',
          checkoutOnly && 'hidden'
        )}
      >
        <div className="border-b border-[#eef0f3] px-3.5 py-3 dark:border-white/10 sm:px-6">
          <div className="mb-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-semibold tracking-tight text-[#101828] dark:text-white">
                {productTerms.title}
              </h2>
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#067647] dark:text-[#8de1aa]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#12b76a]" />
                {filteredProducts.length} available
              </span>
            </div>
            <p
              className="hidden items-center gap-1.5 text-[11px] font-medium text-[#667085] dark:text-[#8b8b8b] sm:flex"
              role="status"
              aria-live="polite"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#12b76a]" />
              {scanMessage || 'Scanner ready'}
            </p>
          </div>
          <div className="relative w-full max-w-2xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98a2b3]" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={
                pharmacyMode
                  ? 'Search medicine, generic name or barcode…'
                  : 'Search by name, SKU or barcode…'
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return;
                const barcode = normalizeBarcode(search);
                if (barcode) {
                  e.preventDefault();
                  handleBarcodeScan(barcode);
                }
              }}
              className={cn(inputCls, 'h-10 rounded-lg pl-9 pr-3')}
              autoFocus
            />
          </div>
          {cafeMode && cafeExperience && (
            <div
              className="mt-3 flex flex-wrap items-end gap-2"
              aria-label="Café order type"
            >
              <div className="flex rounded-lg border border-[#e4e7ec] bg-white p-1 dark:border-white/10 dark:bg-[#181818]">
                {cafeExperience.configuration.enabledOrderTypes.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setCafeOrderType(type);
                      if (type !== 'dine_in') setCafeTableId('');
                    }}
                    aria-pressed={cafeOrderType === type}
                    className={cn(
                      'h-8 rounded-md px-3 text-xs font-bold capitalize',
                      cafeOrderType === type
                        ? 'bg-[#fff0bd] text-[#765800] dark:bg-[#3a3016] dark:text-[#ffd166]'
                        : 'text-[#667085] dark:text-[#b0b0b0]'
                    )}
                  >
                    {type.replace('_', '-')}
                  </button>
                ))}
              </div>
              {cafeOrderType === 'dine_in' &&
                cafeExperience.configuration.tablesEnabled && (
                  <label className="grid gap-1 text-[10px] font-bold uppercase tracking-wide text-[#667085]">
                    Table
                    <select
                      value={cafeTableId}
                      onChange={(event) => setCafeTableId(event.target.value)}
                      className="h-9 min-w-40 rounded-lg border bg-white px-3 text-xs font-semibold normal-case dark:border-white/10 dark:bg-[#181818]"
                    >
                      <option value="">Choose table</option>
                      {cafeExperience.tables.map((table) => (
                        <option
                          key={table.id}
                          value={table.id}
                          disabled={table.status !== 'available'}
                        >
                          {table.name}
                          {table.status !== 'available'
                            ? ` · ${table.status.replace('_', ' ')}`
                            : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
            </div>
          )}
          <div className="mt-3 rounded-xl border border-[#e4e7ec] bg-[#f9fafb] p-2.5 dark:border-white/10 dark:bg-[#151515] lg:hidden">
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#fff3c4] text-[#8a6500] dark:bg-[#3a3016] dark:text-[#ffd166]">
                <ShoppingCart className="h-4.5 w-4.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-[#667085] dark:text-[#a8a8a8]">
                  Basket · {cart.length} item{cart.length === 1 ? '' : 's'}
                </p>
                <p className="truncate text-base font-bold tabular-nums text-[#101828] dark:text-white">
                  {formatCurrency(subtotal)}
                </p>
              </div>
              <button
                type="button"
                onClick={openCheckout}
                disabled={cart.length === 0 || !hasActiveShift}
                className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-[var(--dashboard-accent-cta)] px-4 text-sm font-bold text-[var(--dashboard-accent-cta-ink)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
              >
                Pay now
              </button>
            </div>
            <div className="pos-action-scroll mt-2 flex gap-1.5 overflow-x-auto border-t border-[#e4e7ec] pt-2 dark:border-white/10">
              <button
                type="button"
                onClick={openHoldDialog}
                disabled={
                  !canHold || cart.length === 0 || Boolean(heldSaleActionId)
                }
                className="h-8 shrink-0 rounded-md border border-[#E04F16] bg-[#E04F16] px-3 text-xs font-semibold text-white transition-colors hover:border-[#BF4313] hover:bg-[#BF4313] disabled:opacity-45"
              >
                Hold
              </button>
              <button
                type="button"
                onClick={openVoidDialog}
                disabled={cart.length === 0}
                className="h-8 shrink-0 rounded-md border border-[#155EEF] bg-[#155EEF] px-3 text-xs font-semibold text-white transition-colors hover:border-[#0E50D2] hover:bg-[#0E50D2] disabled:opacity-45"
              >
                Void
              </button>
              <button
                type="button"
                onClick={openHeldOrders}
                disabled={!canHold || !hasActiveShift}
                className="h-8 shrink-0 rounded-md border border-[#092C4C] bg-[#092C4C] px-3 text-xs font-semibold text-white transition-colors hover:border-[#05192C] hover:bg-[#05192C] disabled:opacity-45"
              >
                View Orders{heldSales.length ? ` (${heldSales.length})` : ''}
              </button>
              <button
                type="button"
                onClick={() => setShowSalesHistory(true)}
                className="h-8 shrink-0 rounded-md border border-[#FF0000] bg-[#FF0000] px-3 text-xs font-semibold text-white transition-colors hover:border-[#DB0000] hover:bg-[#DB0000]"
              >
                Transactions
              </button>
              <button
                type="button"
                onClick={openResetDialog}
                className="h-8 shrink-0 rounded-md border border-[#3538CD] bg-[#3538CD] px-3 text-xs font-semibold text-white transition-colors hover:border-[#2C2FB2] hover:bg-[#2C2FB2]"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Category selector */}
        {availableCategories.length > 0 && (
          <nav
            className="pos-mobile-category-scroll flex gap-2.5 overflow-x-auto border-b border-[#eef0f3] bg-[#f8f9fb] px-4 py-3 dark:border-white/10 dark:bg-[#111] sm:px-5"
            aria-label="Product categories"
          >
            <button
              type="button"
              onClick={() => setSelectedCategory('')}
              aria-pressed={!selectedCategory}
              className={cn(
                'flex h-14 min-w-[124px] shrink-0 items-center gap-2 rounded-xl border px-2.5 text-left transition-[border-color,background-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f9b21d]/45 sm:min-w-[142px] sm:gap-2.5',
                !selectedCategory
                  ? 'border-[#f9b21d] bg-[#fff8e6] shadow-[0_2px_7px_rgba(174,119,0,.10)] dark:border-[#f9b21d] dark:bg-[#2a2111]'
                  : 'border-[#e1e5ea] bg-white hover:border-[#cfd4dc] dark:border-white/10 dark:bg-[#181818] dark:hover:border-white/20'
              )}
            >
              {allCategoryImage ? (
                <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-[#eef1f4] dark:bg-white/10">
                  <Image
                    src={allCategoryImage}
                    alt=""
                    fill
                    unoptimized={allCategoryImage.startsWith('http')}
                    sizes="36px"
                    quality={45}
                    className="object-cover"
                  />
                </span>
              ) : (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#fff0bd] text-[#8a6500] dark:bg-[#3a3016] dark:text-[#ffd166]">
                  <Package className="h-4 w-4" />
                </span>
              )}
              <span className="min-w-0">
                <span className="block truncate text-xs font-bold text-[#101828] dark:text-white">
                  All {productTerms.pluralLower}
                </span>
                <span className="mt-0.5 block text-[10px] font-medium text-[#667085] dark:text-[#9ca3af]">
                  {catalogProducts.length} available
                </span>
              </span>
            </button>
            {availableCategories.map((category) => {
              const imageUrl = categoryImages.get(category.id);
              const active = selectedCategory === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategory(category.id)}
                  aria-pressed={active}
                  className={cn(
                    'flex h-14 min-w-[124px] shrink-0 items-center gap-2 rounded-xl border px-2.5 text-left transition-[border-color,background-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f9b21d]/45 sm:min-w-[142px] sm:gap-2.5',
                    active
                      ? 'border-[#f9b21d] bg-[#fff8e6] shadow-[0_2px_7px_rgba(174,119,0,.10)] dark:border-[#f9b21d] dark:bg-[#2a2111]'
                      : 'border-[#e1e5ea] bg-white hover:border-[#cfd4dc] dark:border-white/10 dark:bg-[#181818] dark:hover:border-white/20'
                  )}
                >
                  {imageUrl ? (
                    <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-[#eef1f4] dark:bg-white/10">
                      <Image
                        src={imageUrl}
                        alt=""
                        fill
                        unoptimized={imageUrl.startsWith('http')}
                        sizes="36px"
                        quality={45}
                        className="object-cover"
                      />
                    </span>
                  ) : (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#eef1f4] text-[#667085] dark:bg-white/10 dark:text-[#c4c4c4]">
                      <Package className="h-4 w-4" />
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-bold text-[#101828] dark:text-white">
                      {category.name}
                    </span>
                    <span className="mt-0.5 block text-[10px] font-medium text-[#667085] dark:text-[#9ca3af]">
                      {categoryProductCounts.get(category.id) ?? 0}{' '}
                      {productTerms.pluralLower}
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>
        )}

        {/* Product grid */}
        <CompactScrollArea className="pos-scroll-region bg-[#fbfbfc] p-2.5 dark:bg-[#0f0f0f] sm:p-4">
          {filteredProducts.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-center">
              <Package
                className="mb-3 h-9 w-9 text-[#d0d5dd]"
                strokeWidth={1.5}
              />
              <p className="text-sm font-medium text-[#344054]">
                {search
                  ? `No ${productTerms.pluralLower} match your search`
                  : `No active ${productTerms.pluralLower} with stock`}
              </p>
              <p className="mt-1 text-xs text-[#98a2b3]">
                {search
                  ? 'Try a different search term'
                  : pharmacyMode
                    ? 'Create medicines, then receive stock with batch and expiry details'
                    : `Add ${productTerms.pluralLower} to begin selling`}
              </p>
            </div>
          ) : (
            <div
              className={cn(
                'grid grid-cols-1 min-[480px]:grid-cols-2 sm:grid-cols-3',
                standalone
                  ? 'gap-3 lg:grid-cols-[repeat(auto-fill,minmax(220px,1fr))]'
                  : 'gap-3.5 xl:grid-cols-4'
              )}
            >
              {filteredProducts.map((product, productIndex) => {
                const inCartQuantity = cartQuantityByProductId.get(product.id);
                const outOfStock = product.stock === 0;
                const remainingStock = Math.max(
                  0,
                  product.stock - (inCartQuantity ?? 0)
                );
                const lowStock =
                  product.stock <= product.minStock && product.stock > 0;
                return (
                  <article
                    key={product.id}
                    onClick={() => startCafeItem(product)}
                    onKeyDown={(event) => {
                      if (
                        event.target !== event.currentTarget ||
                        (event.key !== 'Enter' && event.key !== ' ')
                      )
                        return;
                      event.preventDefault();
                      startCafeItem(product);
                    }}
                    role="button"
                    tabIndex={outOfStock ? -1 : 0}
                    aria-disabled={outOfStock}
                    aria-label={`Add ${product.name} to basket${inCartQuantity ? `, currently ${inCartQuantity}` : ''}`}
                    className={cn(
                      'pos-product-card relative flex flex-col overflow-hidden rounded-lg border bg-white text-left shadow-[0_1px_2px_rgba(16,24,40,.03)] transition-[border-color,box-shadow] duration-150 motion-reduce:transition-none',
                      standalone ? 'min-h-[232px]' : 'min-h-[224px]',
                      'max-[479px]:grid max-[479px]:min-h-[132px] max-[479px]:grid-cols-[112px_minmax(0,1fr)] max-[479px]:flex-none',
                      'disabled:cursor-not-allowed disabled:opacity-50',
                      outOfStock
                        ? 'cursor-not-allowed opacity-65'
                        : 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f9b21d]/45 focus-visible:ring-offset-2',
                      'dark:bg-[#161616]',
                      inCartQuantity
                        ? 'border-[#12b76a] bg-white ring-1 ring-[#12b76a]/20 dark:border-[#12b76a] dark:bg-[#161616] dark:ring-[#12b76a]/25'
                        : 'border-[#e4e7ec] dark:border-white/10'
                    )}
                  >
                    {/* Stock badge */}
                    {lowStock && (
                      <div className="absolute left-2 top-2 z-10 rounded-full bg-[#fffaeb] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#b54708] ring-1 ring-inset ring-[#fedf89]">
                        Low stock
                      </div>
                    )}
                    {outOfStock && (
                      <div className="absolute left-2 top-2 z-10 rounded-full bg-[#fef3f2] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#b42318] ring-1 ring-inset ring-[#fecdca]">
                        Sold out
                      </div>
                    )}

                    {/* Product image or icon */}
                    {product.imageUrl ? (
                      <span
                        className={cn(
                          'relative block w-full shrink-0 overflow-hidden bg-[#f5f6f8] dark:bg-[#1f1f1f]',
                          standalone ? 'h-[120px]' : 'h-[112px]',
                          'max-[479px]:h-full max-[479px]:min-h-[132px]'
                        )}
                      >
                        <Image
                          src={product.imageUrl}
                          alt={product.name}
                          fill
                          unoptimized={product.imageUrl.startsWith('http')}
                          sizes="(min-width: 1280px) 240px, (min-width: 640px) 30vw, (min-width: 480px) 50vw, 112px"
                          quality={60}
                          loading={productIndex < 8 ? 'eager' : 'lazy'}
                          className="object-cover"
                        />
                      </span>
                    ) : (
                      <div
                        className={cn(
                          'flex w-full shrink-0 items-center justify-center bg-[#f5f6f8] text-[#98a2b3] dark:bg-[#1f1f1f]',
                          standalone ? 'h-[120px]' : 'h-[112px]',
                          'max-[479px]:h-full max-[479px]:min-h-[132px]'
                        )}
                      >
                        <Package className="h-7 w-7" strokeWidth={1.5} />
                      </div>
                    )}
                    <div className="flex min-w-0 flex-1 flex-col px-3 pb-3 pt-2.5 sm:px-3.5 sm:pb-3.5 sm:pt-3">
                      <p className="mb-0.5 line-clamp-2 text-sm font-semibold leading-snug text-[#101828] dark:text-white">
                        {product.name}
                      </p>
                      {product.pharmacy && (
                        <p className="line-clamp-1 text-[10px] text-[#667085] dark:text-[#a8a8a8]">
                          {[
                            product.pharmacy.genericName,
                            product.pharmacy.strength,
                            product.pharmacy.dosageForm,
                            product.pharmacy.packSize,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      )}
                      {product.pharmacy &&
                        (product.pharmacy.prescriptionRequired ||
                          product.pharmacy.restrictedItem) && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {product.pharmacy.prescriptionRequired && (
                              <span className="rounded border px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide">
                                Prescription
                              </span>
                            )}
                            {product.pharmacy.restrictedItem && (
                              <span className="rounded border border-amber-300 bg-amber-50 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                                Restricted
                              </span>
                            )}
                          </div>
                        )}
                      {(product.volume || product.unit) && (
                        <p className="text-[11px] text-[#667085] dark:text-[#8b8b8b]">
                          {product.volume
                            ? `${product.volume} ${product.volumeUnit || ''}`
                            : ''}
                          {product.volume && product.unit ? ' · ' : ''}
                          {product.unit}
                        </p>
                      )}
                      {product.packages.length > 0 && (
                        <div
                          className="mt-2 flex flex-wrap gap-1"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {product.packages.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              disabled={product.stock < item.baseUnitQuantity}
                              onClick={() => startCafeItem(product, item)}
                              className="rounded-md border border-[#dfe3ea] bg-[#f9fafb] px-1.5 py-1 text-[9px] font-bold text-[#344054] hover:border-[#f9b21d] disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-[#e4e7ec]"
                              title={`${item.baseUnitQuantity} base units · ${formatCurrency(item.sellingPrice)}`}
                            >
                              {item.name}
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="mt-auto flex items-end justify-between gap-2 pt-2">
                        <p className="text-sm font-bold tabular-nums text-[#101828] dark:text-white">
                          {formatCurrency(product.sellingPrice)}
                        </p>
                        {inCartQuantity ? (
                          <div
                            className="relative z-20 flex h-8 shrink-0 items-center overflow-hidden rounded-lg border border-[#101828] bg-white dark:border-white/20 dark:bg-[#1c1c1c]"
                            onClick={(event) => event.stopPropagation()}
                            title={`${product.stock} ${product.unit} in stock`}
                          >
                            <button
                              type="button"
                              onClick={() => updateQty(product.id, -1)}
                              className="flex h-full w-7 items-center justify-center text-[#101828] transition-colors hover:bg-[#f2f4f7] focus-visible:outline-none dark:text-[#f1f1f1] dark:hover:bg-[#302d28]"
                              aria-label={`Reduce ${product.name} quantity`}
                              title="Reduce quantity"
                            >
                              <Minus
                                className="h-3.5 w-3.5"
                                strokeWidth={2.5}
                              />
                            </button>
                            <span
                              className="min-w-6 border-x border-[#101828]/15 px-1 text-center text-xs font-bold tabular-nums text-[#101828] dark:border-[#f2b705] dark:bg-[#f2b705] dark:text-[#241d00]"
                              aria-live="polite"
                            >
                              {inCartQuantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQty(product.id, 1)}
                              disabled={inCartQuantity >= product.stock}
                              className="flex h-full w-7 items-center justify-center text-[#101828] transition-colors hover:bg-[#f2f4f7] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-35 dark:text-[#f1f1f1] dark:hover:bg-[#302d28]"
                              aria-label={`Increase ${product.name} quantity`}
                              title={
                                inCartQuantity >= product.stock
                                  ? 'Maximum available stock reached'
                                  : 'Increase quantity'
                              }
                            >
                              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                            </button>
                          </div>
                        ) : (
                          <div
                            className={cn(
                              'flex min-w-0 items-center gap-1.5 text-[10px] font-medium',
                              outOfStock
                                ? 'text-[#d92d20]'
                                : lowStock
                                  ? 'text-[#b54708] dark:text-[#fdb022]'
                                  : 'text-[#667085] dark:text-[#a8a8a8]'
                            )}
                            title={`${remainingStock} ${product.unit} available`}
                          >
                            <span
                              aria-hidden="true"
                              className={cn(
                                'h-1.5 w-1.5 shrink-0 rounded-full',
                                outOfStock
                                  ? 'bg-[#d92d20]'
                                  : lowStock
                                    ? 'bg-[#f79009]'
                                    : 'bg-[#12b76a]'
                              )}
                            />
                            <span className="truncate tabular-nums">
                              {outOfStock
                                ? 'Sold out'
                                : `${remainingStock} ${product.unit} available`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Cart badge */}
                    {inCartQuantity && (
                      <div className="absolute right-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-[#12b76a] px-1.5 text-xs font-bold text-white shadow-sm">
                        {inCartQuantity}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </CompactScrollArea>
      </section>

      {/* Right: Cart + Payment */}
      <aside
        className={cn(
          ui.card,
          'flex min-h-[520px] w-full flex-col overflow-hidden lg:max-h-full',
          !checkoutOpen && 'max-lg:hidden lg:h-fit lg:min-h-0 lg:self-start',
          checkoutOpen &&
            !checkoutOnly &&
            'max-lg:fixed max-lg:inset-0 max-lg:z-[70] max-lg:h-[100dvh] max-lg:min-h-0 max-lg:rounded-none max-lg:border-0 lg:h-full lg:min-h-0 lg:self-stretch lg:max-h-full lg:overflow-hidden',
          checkoutOnly &&
            'min-h-0 w-full max-w-none gap-6 overflow-visible border-0 bg-transparent shadow-none lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(480px,.85fr)] lg:items-start lg:max-h-none'
        )}
      >
        {/* Cart header with quick actions */}
        <div
          className={cn(
            'border-b border-[#eef0f3] bg-white p-4 dark:border-white/10 dark:bg-[#161616]',
            checkoutOnly && 'hidden',
            checkoutOpen && !checkoutOnly && 'hidden'
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#fff5d6] text-[#a47700] dark:bg-[#3a3016] dark:text-[#ffd166]">
                <ShoppingCart className="h-4 w-4" />
              </span>
              <div>
                <span className="block text-[17px] font-semibold tracking-tight text-[#7a5b00] dark:text-[#ffd166]">
                  Basket
                </span>
                <span className="block text-[13px] font-medium text-[#475467] dark:text-[#b5bac5]">
                  {cart.length
                    ? `${cart.length} item${cart.length === 1 ? '' : 's'} · Ready to checkout`
                    : 'Add items to start a sale'}
                </span>
              </div>
            </div>
            {checkoutOpen ? (
              <button
                onClick={() => setCheckoutOpen(false)}
                className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#344054] transition-colors hover:bg-[#f2f4f7] dark:text-[#c4c4c4] dark:hover:bg-white/10"
              >
                ← Edit basket
              </button>
            ) : (
              cart.length > 0 && (
                <button
                  onClick={openVoidDialog}
                  className="rounded-md px-2 py-1 text-[11px] font-semibold text-[#98a2b3] transition-colors hover:bg-[#fef3f2] hover:text-[#b42318] dark:hover:bg-red-950/30"
                >
                  Clear sale
                </button>
              )
            )}
          </div>

          {!checkoutOpen && (
            <div className="mt-3 grid grid-cols-2 gap-2 rounded-md border border-[#e7e9ed] bg-[#fafbfc] p-2 dark:border-white/10 dark:bg-[#141414]">
              <button
                onClick={() => setShowSalesHistory(true)}
                className="flex h-9 items-center justify-center gap-2 rounded-[5px] bg-[var(--dashboard-accent-cta)] px-2.5 text-sm font-semibold text-[var(--dashboard-accent-cta-ink)] transition-colors hover:bg-[var(--dashboard-accent-cta-hover)]"
              >
                <History className="h-3.5 w-3.5" />
                History
              </button>
              <button
                onClick={() => setShowReceiptReprint(true)}
                className="flex h-9 items-center justify-center gap-2 rounded-[5px] bg-[var(--dashboard-accent-cta)] px-2.5 text-sm font-semibold text-[var(--dashboard-accent-cta-ink)] transition-colors hover:bg-[var(--dashboard-accent-cta-hover)]"
              >
                <Printer className="h-3.5 w-3.5" />
                Reprint
              </button>
            </div>
          )}
          {!checkoutOpen && (
            <div className="mt-4 border-t border-solid border-[#e7e9ed] pt-4 dark:border-white/10">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-base font-semibold leading-5 text-[#111827] dark:text-white">
                  {cafeMode ? 'Guest' : 'Customer'} Information
                </span>
                {activeCustomer && (
                  <button
                    type="button"
                    onClick={() => setSelectedCustomer('')}
                    className="text-[11px] font-semibold text-[#b54708] hover:underline dark:text-[#fdb022]"
                  >
                    Clear customer
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="relative min-w-0 flex-1">
                  <button
                    type="button"
                    disabled={mpesaLocksBasket}
                    onClick={() => setCustomerMenuOpen((open) => !open)}
                    aria-haspopup="listbox"
                    aria-expanded={customerMenuOpen}
                    className="flex h-10 w-full items-center justify-between rounded-[5px] border border-[#d9dde3] bg-white px-3.5 text-left text-sm font-normal text-[#344054] outline-none transition-colors hover:border-[#bfc5ce] focus:border-[#86a5c9] focus:ring-1 focus:ring-[#155eef]/15 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/15 dark:bg-[#161616] dark:text-[#e4e7ec]"
                  >
                    <span className="truncate">
                      {activeCustomer?.name ??
                        (cafeMode ? 'Walk-in guest' : 'Walk-in customer')}
                      {activeCustomer?.phone
                        ? ' (' + activeCustomer.phone + ')'
                        : ''}
                    </span>
                    <ChevronDown
                      className={cn(
                        'h-3.5 w-3.5 shrink-0 text-[#273142] transition-transform dark:text-[#aeb4c0]',
                        customerMenuOpen && 'rotate-180'
                      )}
                    />
                  </button>
                  {customerMenuOpen && !mpesaLocksBasket && (
                    <div
                      role="listbox"
                      className="absolute inset-x-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-md border border-[#e1e4e8] bg-white p-1 shadow-[0_4px_12px_rgba(16,24,40,0.08)] dark:border-white/10 dark:bg-[#1b1b1b]"
                    >
                      <button
                        type="button"
                        role="option"
                        aria-selected={!selectedCustomer}
                        onClick={() => {
                          setSelectedCustomer('');
                          setCustomerMenuOpen(false);
                        }}
                        className={cn(
                          'flex w-full items-center rounded-md px-3 py-2 text-left text-[13px] transition-colors hover:bg-[#fff8df] dark:hover:bg-[#302812]',
                          !selectedCustomer
                            ? 'bg-[#fff8df] font-semibold text-[#7a5b00] dark:bg-[#302812] dark:text-[#ffd166]'
                            : 'text-[#344054] dark:text-[#e4e7ec]'
                        )}
                      >
                        {cafeMode ? 'Walk-in guest' : 'Walk-in customer'}
                      </button>
                      {availableCustomers.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          role="option"
                          aria-selected={selectedCustomer === customer.id}
                          onClick={() => {
                            setSelectedCustomer(customer.id);
                            setCustomerMenuOpen(false);
                          }}
                          className={cn(
                            'flex w-full items-center rounded-md px-3 py-2 text-left text-[13px] transition-colors hover:bg-[#fff8df] dark:hover:bg-[#302812]',
                            selectedCustomer === customer.id
                              ? 'bg-[#fff8df] font-semibold text-[#7a5b00] dark:bg-[#302812] dark:text-[#ffd166]'
                              : 'text-[#344054] dark:text-[#e4e7ec]'
                          )}
                        >
                          {customer.name}
                          {customer.phone ? ' (' + customer.phone + ')' : ''}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  ref={continueToPaymentRef}
                  type="button"
                  disabled={mpesaLocksBasket || !isOnline}
                  onClick={() => setShowNewCustomer(true)}
                  title={cafeMode ? 'Add guest' : 'Add customer'}
                  aria-label={cafeMode ? 'Add guest' : 'Add customer'}
                  className="inline-flex h-10 w-[38px] shrink-0 items-center justify-center rounded-[5px] bg-[#009688] text-white shadow-none transition-colors hover:bg-[#007f73] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009688]/30 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <UserRoundPlus
                    className="h-[17px] w-[17px]"
                    strokeWidth={2}
                  />
                </button>
              </div>
              {activeCustomer && (
                <div className="relative mt-3 rounded-[5px] border border-[#e1e5ea] border-l-[3px] border-l-[#009688] bg-[#f8fafb] px-3 py-2.5 text-[#101828] dark:border-white/10 dark:border-l-[#34b8aa] dark:bg-white/[0.04] dark:text-white">
                  <button
                    type="button"
                    onClick={() => setSelectedCustomer('')}
                    aria-label="Remove customer"
                    className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded text-[#667085] transition-colors hover:bg-[#e9edf1] hover:text-[#344054] dark:text-[#aeb4c0] dark:hover:bg-white/10 dark:hover:text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <p className="text-sm font-semibold">{activeCustomer.name}</p>
                  <p className="mt-1 text-xs text-[#667085] dark:text-[#aeb4c0]">
                    Bonus:{' '}
                    <span className="font-semibold text-[#0f8b83]">
                      {activeCustomer.bonusBalance ?? 0}
                    </span>
                    <span className="mx-1.5">|</span>
                    Loyalty:{' '}
                    <span className="font-semibold text-[#0f8b83]">
                      {activeCustomer.pointsBalance ??
                        activeCustomer.loyaltyPoints ??
                        0}
                    </span>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cart items */}
        <div
          className={cn(
            'min-h-[180px] flex-1 overflow-y-auto',
            checkoutOpen && !checkoutOnly && 'hidden',
            checkoutOnly &&
              cn(
                ui.card,
                'flex min-h-0 flex-col self-start overflow-hidden lg:col-start-1 lg:row-start-1'
              )
          )}
        >
          {checkoutOnly && (
            <div className="flex items-center justify-between border-b border-[#eef0f3] px-6 py-5 dark:border-white/10">
              <div>
                <h2 className="text-base font-semibold tracking-tight text-[#101828] dark:text-white">
                  Order summary
                </h2>
                <p className="mt-0.5 text-xs text-[#667085] dark:text-[#8b8b8b]">
                  {cart.length} item{cart.length === 1 ? '' : 's'} ready for
                  payment
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push('/dashboard/pos')}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-[#344054] transition-colors hover:bg-[#f2f4f7] dark:text-[#c4c4c4] dark:hover:bg-white/10"
              >
                Edit basket
              </button>
            </div>
          )}
          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-4 py-12 text-center">
              <ShoppingCart
                className="mb-3 h-10 w-10 text-[#d0d5dd]"
                strokeWidth={1.5}
              />
              <p className="text-sm font-semibold text-[#101828] dark:text-white">
                Basket is empty
              </p>
              <p className="mt-1 max-w-[220px] text-xs leading-5 text-[#98a2b3]">
                Select {productTerms.pluralLower} from the catalogue to build
                this sale.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-[#eef0f3] dark:divide-white/10">
              {cart.map((item) => (
                <li
                  key={item.lineId ?? item.productId}
                  className="group grid min-h-[64px] grid-cols-[36px_minmax(0,1fr)] items-center gap-3 px-3 py-2.5 transition-colors duration-75 hover:bg-[#fbfbfc] dark:bg-[#161616] dark:hover:bg-[#202020] sm:grid-cols-[36px_minmax(0,1fr)_minmax(190px,auto)] sm:px-4 sm:py-2"
                >
                  {productsById.get(item.productId)?.imageUrl ? (
                    <Image
                      src={productsById.get(item.productId)?.imageUrl ?? ''}
                      alt=""
                      width={36}
                      height={36}
                      quality={50}
                      unoptimized={(
                        productsById.get(item.productId)?.imageUrl ?? ''
                      ).startsWith('http')}
                      className="h-9 w-9 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f2f4f7] text-[#667085] dark:bg-white/10 dark:text-[#c4c4c4]">
                      <Package className="h-4 w-4" />
                    </div>
                  )}
                  {/* Item info */}
                  <div className="min-w-0 flex-1">
                    <p className="mb-0.5 truncate text-[13px] font-semibold leading-snug text-[#101828] dark:text-white">
                      {item.productName}
                    </p>
                    <p className="text-xs font-medium text-[#667085] dark:text-[#aeb4c0]">
                      {formatCurrency(item.unitPrice)} ·{' '}
                      {productsById.get(item.productId)?.unit || 'unit'}
                    </p>
                    {item.modifierNames?.length ? (
                      <p className="mt-0.5 text-[11px] leading-4 text-[#667085] dark:text-[#aeb4c0]">
                        {item.modifierNames.join(' · ')}
                      </p>
                    ) : null}
                  </div>

                  {/* Quantity, total & remove */}
                  <div className="col-span-2 flex items-center justify-end gap-2 sm:col-span-1">
                    <div className="flex h-7 shrink-0 items-center overflow-hidden rounded-lg border border-[#e4e7ec] bg-white dark:border-white/15 dark:bg-[#1d1d1d]">
                      <button
                        onClick={() =>
                          updateQty(item.lineId ?? item.productId, -1)
                        }
                        className="flex h-full w-7 items-center justify-center text-[#667085] transition-colors duration-75 hover:bg-[#f2f4f7] hover:text-[#101828] focus-visible:outline-none dark:text-[#c4c4c4] dark:hover:bg-white/10"
                        title="Decrease quantity"
                        aria-label={`Reduce ${item.productName} quantity`}
                      >
                        <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
                      </button>
                      <span
                        className="flex h-full min-w-7 items-center justify-center border-x border-[#e4e7ec] px-1 text-center text-xs font-bold tabular-nums text-[#101828] dark:border-white/10 dark:text-white"
                        aria-live="polite"
                      >
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateQty(item.lineId ?? item.productId, 1)
                        }
                        disabled={
                          item.quantity >=
                          (productsById.get(item.productId)?.stock ??
                            item.quantity)
                        }
                        className="flex h-full w-7 items-center justify-center text-[#667085] transition-colors duration-75 hover:bg-[#f2f4f7] hover:text-[#101828] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-35 dark:text-[#c4c4c4] dark:hover:bg-white/10"
                        title={
                          item.quantity >=
                          (productsById.get(item.productId)?.stock ??
                            item.quantity)
                            ? 'Maximum available stock reached'
                            : 'Increase quantity'
                        }
                        aria-label={`Increase ${item.productName} quantity`}
                      >
                        <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                      </button>
                    </div>
                    <span className="min-w-[88px] text-right text-sm font-bold tabular-nums text-[#101828] dark:text-[#f4f4f5]">
                      {formatCurrency(item.totalPrice)}
                    </span>
                    {cafeMode && productsById.get(item.productId)?.cafe && (
                      <button
                        type="button"
                        onClick={() => editCafeCartLine(item)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#667085] transition-colors hover:bg-[#fff5d6] hover:text-[#7a5b00] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f9b21d]/50 dark:text-[#c4c4c4] dark:hover:bg-[#3a3016] dark:hover:text-[#ffd166]"
                        title="Edit size and modifiers"
                        aria-label={`Edit ${item.productName} choices`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() =>
                        removeFromCart(item.lineId ?? item.productId)
                      }
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#d92d20] transition-colors hover:bg-[#fef3f2] hover:text-[#b42318] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f9b21d]/50 dark:text-[#f97066] dark:hover:bg-red-950/30 dark:hover:text-[#ff8a80]"
                      title="Remove item"
                      aria-label={`Remove ${item.productName} from basket`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {checkoutOnly && cart.length > 0 && (
            <div className="border-t border-[#eef0f3] bg-[#fbfbfc] px-6 py-5 dark:border-white/10 dark:bg-[#111111]">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[#667085] dark:text-[#8b8b8b]">
                  Items subtotal
                </span>
                <span className="text-xl font-bold tracking-tight tabular-nums text-[#101828] dark:text-white">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              <p className="mt-2 text-sm text-[#667085] dark:text-[#8b8b8b]">
                You can adjust quantities before completing payment.
              </p>
            </div>
          )}
        </div>

        {/* Payment panel */}
        {cart.length > 0 && !checkoutOpen && (
          <div
            className={cn(
              'border-t border-[#eef0f3] bg-white p-3.5 dark:border-white/10 dark:bg-[#151515]',
              checkoutOnly && 'md:col-start-2 md:row-start-2 md:border-l'
            )}
          >
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="text-sm font-medium text-[#667085] dark:text-[#8b8b8b]">
                Basket total
              </span>
              <span className="text-xl font-bold tracking-tight tabular-nums text-[#101828] dark:text-[#f8f8f8]">
                {formatCurrency(subtotal)}
              </span>
            </div>
            {containsAgeRestrictedItem && (
              <div className="mb-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 dark:bg-amber-950/25 dark:text-amber-200">
                <ShieldCheck className="h-4 w-4" />
                {ageVerified
                  ? 'Age verification completed'
                  : 'Age verification required'}
              </div>
            )}
            <button
              onClick={openCheckout}
              disabled={!hasActiveShift}
              title={
                !hasActiveShift
                  ? 'Start a shift before taking payment'
                  : undefined
              }
              style={
                hasActiveShift
                  ? { backgroundColor: ui.primary, color: ui.primaryInk }
                  : undefined
              }
              className={cn(
                'flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3.5 text-sm font-bold transition-opacity',
                hasActiveShift
                  ? 'hover:opacity-90'
                  : 'cursor-not-allowed bg-[#f2f4f7] text-[#98a2b3] dark:bg-white/5 dark:text-[#666]'
              )}
            >
              {hasActiveShift
                ? 'Continue to checkout'
                : 'Start shift to take payment'}
            </button>
            <p className="mt-2 text-center text-[11px] font-medium text-[#7a8699] dark:text-[#9aa3b2]">
              Review customer details and order total before payment.
            </p>
          </div>
        )}

        {cart.length > 0 && checkoutOpen && (
          <div
            className={cn(
              'min-h-0 flex-1 space-y-4 overflow-y-auto border-t border-[#eef0f3] bg-[#fbfbfc] p-3 dark:border-white/10 dark:bg-[#111111] sm:p-4 lg:max-h-[calc(100vh-16rem)]',
              !checkoutOnly && 'lg:flex-1 lg:max-h-none lg:overscroll-contain',
              checkoutOnly &&
                cn(
                  ui.card,
                  'self-start p-6 lg:col-start-2 lg:row-start-1 lg:max-h-none'
                )
            )}
          >
            {checkoutOnly && (
              <div className="border-b border-[#eef0f3] pb-5 dark:border-white/10">
                <button
                  onClick={() => router.push('/dashboard/pos')}
                  className="text-sm font-semibold text-[#344054] transition-colors hover:text-[#101828] dark:text-[#c4c4c4] dark:hover:text-white"
                >
                  ← Back to POS
                </button>
                <p
                  className="mt-5 text-[11px] font-bold uppercase tracking-[0.14em]"
                  style={{ color: ui.primaryHover }}
                >
                  Payment
                </p>
                <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-[#101828] dark:text-white">
                  Complete this sale
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#667085] dark:text-[#8b8b8b]">
                  Choose a payment method and complete the sale.
                </p>
              </div>
            )}
            {/* Customer details are managed in the basket panel to avoid duplicate selectors. */}
            {checkoutStep === 'customer' && !checkoutOnly && (
              <button
                type="button"
                onClick={() => setCheckoutOpen(false)}
                className="inline-flex items-center gap-1 self-start rounded-lg px-1 py-1 text-xs font-semibold text-[#667085] transition-colors hover:text-[#101828] dark:text-[#a3a3a3] dark:hover:text-white"
              >
                ← Back to basket
              </button>
            )}

            {checkoutStep === 'customer' &&
              (manualDiscountAmount > 0 || couponAmount > 0) && (
                <section aria-label="Applied promotions" className="space-y-2">
                  {manualDiscountAmount > 0 && (
                    <div className="flex items-center gap-3 rounded-[7px] border border-[#6f42f5] bg-[#f7f3ff] px-3 py-3 text-[#382080] dark:bg-[#241a3d] dark:text-[#ddd1ff]">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[5px] bg-[#6f42f5] text-white">
                        <BadgePercent className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold">
                          {discountType === 'percentage'
                            ? `Discount ${discount.toFixed(discount % 1 === 0 ? 0 : 1)}%`
                            : 'Order discount'}
                        </p>
                        <p className="mt-0.5 text-xs text-[#667085] dark:text-[#bdb5d1]">
                          You save {formatCurrency(manualDiscountAmount)} on
                          this order
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAppliedPromotion('discount')}
                        disabled={mpesaLocksBasket}
                        aria-label="Remove discount"
                        title="Remove discount"
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#475467] transition-colors hover:bg-[#ede5ff] hover:text-[#101828] disabled:opacity-40 dark:text-[#d0c8df] dark:hover:bg-white/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  {couponAmount > 0 && (
                    <div className="flex items-center gap-3 rounded-[7px] border border-[#6f42f5] bg-[#f7f3ff] px-3 py-3 text-[#382080] dark:bg-[#241a3d] dark:text-[#ddd1ff]">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[5px] bg-[#6f42f5] text-white">
                        <BadgePercent className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">
                          Coupon {couponCode}
                        </p>
                        <p className="mt-0.5 text-xs text-[#667085] dark:text-[#bdb5d1]">
                          You save {formatCurrency(couponAmount)} on this order
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAppliedPromotion('coupon')}
                        disabled={mpesaLocksBasket}
                        aria-label="Remove coupon"
                        title="Remove coupon"
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#475467] transition-colors hover:bg-[#ede5ff] hover:text-[#101828] disabled:opacity-40 dark:text-[#d0c8df] dark:hover:bg-white/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </section>
              )}

            {/* Payment summary */}
            {checkoutStep === 'customer' && (
              <section
                aria-labelledby="pos-payment-summary"
                className="overflow-hidden rounded-xl border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] text-[var(--dashboard-text)] shadow-sm dark:shadow-none"
              >
                <div className="flex items-center justify-between border-b border-[var(--dashboard-border)] px-4 py-3">
                  <div>
                    <h3
                      id="pos-payment-summary"
                      className="text-sm font-bold tracking-tight"
                    >
                      Payment Summary
                    </h3>
                    <p className="mt-0.5 text-[10px] font-medium text-[var(--dashboard-muted)]">
                      Calculated from the current basket
                    </p>
                  </div>
                  <span className="rounded-full border border-[var(--dashboard-accent-soft-border)] bg-[var(--dashboard-accent-soft)] px-2.5 py-1 text-[10px] font-bold text-[var(--dashboard-accent)]">
                    {cart.length} item{cart.length === 1 ? '' : 's'}
                  </span>
                </div>

                <dl className="divide-y divide-[var(--dashboard-border)] px-4 text-[13px]">
                  <div className="flex min-h-9 items-center justify-between gap-4 py-2">
                    <dt className="flex items-center gap-2 text-[var(--dashboard-muted)]">
                      <Package className="h-3.5 w-3.5" aria-hidden="true" />
                      Shipping
                      <button
                        type="button"
                        onClick={() => openSummaryEditor('shipping')}
                        aria-label="Edit shipping"
                        title="Edit shipping"
                        className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-surface-subtle)] text-[var(--dashboard-muted)] transition-colors hover:border-[var(--dashboard-accent-soft-border)] hover:bg-[var(--dashboard-accent-soft)] hover:text-[var(--dashboard-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dashboard-accent)]/30"
                      >
                        <PaymentSummaryEditIcon className="h-3 w-3" />
                      </button>
                    </dt>
                    <dd className="font-semibold tabular-nums">
                      {formatCurrency(shippingCost)}
                    </dd>
                  </div>
                  {loyaltyRedemptionValue > 0 && (
                    <div className="flex min-h-9 items-center justify-between gap-4 py-2 text-[#0f766e] dark:text-teal-300">
                      <dt>Loyalty redeemed</dt>
                      <dd className="font-semibold tabular-nums">
                        -{formatCurrency(loyaltyRedemptionValue)}
                      </dd>
                    </div>
                  )}
                  {rewardReduction > 0 && (
                    <div className="flex min-h-9 items-center justify-between gap-4 py-2">
                      <dt className="text-[var(--dashboard-muted)]">
                        Total before rewards
                      </dt>
                      <dd className="font-semibold tabular-nums">
                        {formatCurrency(totalBeforeRewards)}
                      </dd>
                    </div>
                  )}
                  {appliedBonus > 0 && (
                    <div className="flex min-h-9 items-center justify-between gap-4 py-2 text-[#0f766e] dark:text-teal-300">
                      <dt>Bonus redeemed</dt>
                      <dd className="font-semibold tabular-nums">
                        -{formatCurrency(appliedBonus)}
                      </dd>
                    </div>
                  )}
                  <div className="flex min-h-9 items-center justify-between gap-4 py-2">
                    <dt className="flex items-center gap-2 text-[var(--dashboard-muted)]">
                      <Banknote className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>
                        {settings.taxName || 'Tax'}
                        {settings.taxEnabled
                          ? ` (${settings.taxRate.toFixed(1)}%)`
                          : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => openSummaryEditor('tax')}
                        aria-label="Edit tax"
                        title="Edit tax"
                        className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-surface-subtle)] text-[var(--dashboard-muted)] transition-colors hover:border-[var(--dashboard-accent-soft-border)] hover:bg-[var(--dashboard-accent-soft)] hover:text-[var(--dashboard-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dashboard-accent)]/30"
                      >
                        <PaymentSummaryEditIcon className="h-3 w-3" />
                      </button>
                    </dt>
                    <dd className="font-semibold tabular-nums">
                      {formatCurrency(taxAmount)}
                    </dd>
                  </div>
                  <div className="flex min-h-9 items-center justify-between gap-4 py-2">
                    <dt
                      className={cn(
                        'flex items-center gap-2',
                        couponAmount > 0
                          ? 'text-[var(--dashboard-accent)]'
                          : 'text-[var(--dashboard-muted)]'
                      )}
                    >
                      <BadgePercent
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      />
                      <span>Coupon{couponCode ? ` · ${couponCode}` : ''}</span>
                      <button
                        type="button"
                        onClick={() => openSummaryEditor('coupon')}
                        aria-label="Edit coupon"
                        title="Edit coupon"
                        className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-surface-subtle)] text-[var(--dashboard-muted)] transition-colors hover:border-[var(--dashboard-accent-soft-border)] hover:bg-[var(--dashboard-accent-soft)] hover:text-[var(--dashboard-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dashboard-accent)]/30"
                      >
                        <PaymentSummaryEditIcon className="h-3 w-3" />
                      </button>
                    </dt>
                    <dd
                      className={cn(
                        'font-semibold tabular-nums',
                        couponAmount > 0 && 'text-[var(--dashboard-accent)]'
                      )}
                    >
                      {couponAmount > 0 ? '−' : ''}
                      {formatCurrency(couponAmount)}
                    </dd>
                  </div>
                  <div className="flex min-h-9 items-center justify-between gap-4 py-2">
                    <dt
                      className={cn(
                        'flex items-center gap-2',
                        manualDiscountAmount > 0
                          ? 'text-[#b42318] dark:text-[#f97066]'
                          : 'text-[var(--dashboard-muted)]'
                      )}
                    >
                      <BadgePercent
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      />
                      <span>
                        Discount
                        {automaticDiscount > 0
                          ? ` · ${automaticDiscountName || 'Automatic campaign'}`
                          : ''}
                        {discountType === 'percentage' &&
                        manualDiscountAmount > 0
                          ? ` (${discount.toFixed(1)}%)`
                          : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => openSummaryEditor('discount')}
                        aria-label="Edit discount"
                        title="Edit discount"
                        className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-surface-subtle)] text-[var(--dashboard-muted)] transition-colors hover:border-[var(--dashboard-accent-soft-border)] hover:bg-[var(--dashboard-accent-soft)] hover:text-[var(--dashboard-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dashboard-accent)]/30"
                      >
                        <PaymentSummaryEditIcon className="h-3 w-3" />
                      </button>
                    </dt>
                    <dd
                      className={cn(
                        'font-semibold tabular-nums',
                        manualDiscountAmount + automaticDiscount > 0 &&
                          'text-[#b42318] dark:text-[#f97066]'
                      )}
                    >
                      {manualDiscountAmount > 0 ? '−' : ''}
                      {formatCurrency(manualDiscountAmount + automaticDiscount)}
                    </dd>
                  </div>
                  <div className="flex min-h-9 items-center justify-between gap-4 py-2">
                    <dt className="flex items-center gap-2 text-[var(--dashboard-muted)]">
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                      Roundoff
                    </dt>
                    <dd className="flex items-center gap-2 font-semibold tabular-nums">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={roundoffEnabled}
                        aria-label="Toggle roundoff"
                        title="Round the payable total to the nearest shilling"
                        onClick={() =>
                          setRoundoffEnabled((enabled) => !enabled)
                        }
                        disabled={mpesaLocksBasket}
                        className={cn(
                          'relative inline-flex h-4 w-8 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dashboard-accent)]/30 disabled:cursor-not-allowed disabled:opacity-45',
                          roundoffEnabled
                            ? 'border-[#e85d04] bg-[#e85d04]'
                            : 'border-[var(--dashboard-border)] bg-[var(--dashboard-surface-subtle)]'
                        )}
                      >
                        <span
                          className={cn(
                            'h-3 w-3 rounded-full bg-white shadow-sm transition-transform',
                            roundoffEnabled
                              ? 'translate-x-[17px]'
                              : 'translate-x-[2px]'
                          )}
                        />
                      </button>
                      <span
                        className={cn(
                          'min-w-[4.5rem] text-right',
                          roundingAmount < 0 && 'text-[#d92d20]'
                        )}
                      >
                        {roundingAmount > 0
                          ? '+'
                          : roundingAmount < 0
                            ? '−'
                            : ''}
                        {formatCurrency(Math.abs(roundingAmount))}
                      </span>
                    </dd>
                  </div>
                  <div className="flex min-h-10 items-center justify-between gap-4 py-2.5">
                    <dt className="font-medium text-[var(--dashboard-muted)]">
                      Sub Total
                    </dt>
                    <dd className="font-bold tabular-nums">
                      {formatCurrency(subtotal)}
                    </dd>
                  </div>
                </dl>

                <div className="flex items-baseline justify-between gap-4 border-t border-[var(--dashboard-border)] bg-[var(--dashboard-surface-subtle)] px-4 py-3.5">
                  <span className="text-sm font-bold">Total Payable</span>
                  <span className="text-xl font-extrabold tracking-tight tabular-nums">
                    {formatCurrency(total)}
                  </span>
                </div>
              </section>
            )}

            {checkoutStep === 'customer' && selectedCustomer && (
              <section
                aria-labelledby="pos-rewards-heading"
                className="rounded-xl border border-[#ead68a] bg-[#fffdf5] p-4 dark:border-amber-400/20 dark:bg-amber-400/5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3
                      id="pos-rewards-heading"
                      className="text-sm font-bold text-[#101828] dark:text-white"
                    >
                      Rewards
                    </h3>
                    <p className="mt-0.5 text-[11px] text-[#667085] dark:text-[#aeb4c0]">
                      Apply this customer&apos;s available balance
                    </p>
                  </div>
                  {rewardQuoteLoading && (
                    <Loader2
                      className="h-4 w-4 text-[#a47700]"
                      label="Loading rewards"
                    />
                  )}
                </div>
                {rewardQuote ? (
                  <div className="mt-3 space-y-4">
                    <div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                        <span className="text-[#667085] dark:text-[#aeb4c0]">
                          Loyalty
                        </span>
                        <strong className="text-right tabular-nums">
                          {rewardQuote.pointsBalance.toLocaleString()} pts
                        </strong>
                        <span className="text-[#667085] dark:text-[#aeb4c0]">
                          Worth
                        </span>
                        <span className="text-right tabular-nums">
                          {formatCurrency(
                            rewardQuote.pointsBalance * rewardQuote.pointValue
                          )}
                        </span>
                        <span className="text-[#667085] dark:text-[#aeb4c0]">
                          Maximum usable
                        </span>
                        <span className="text-right font-semibold tabular-nums">
                          {formatCurrency(rewardQuote.maximumPointsValue)}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[10px] text-[#98a2b3]">
                        Up to {rewardQuote.maximumPointsRedemptionPercent}% of
                        eligible merchandise spend
                      </p>
                      <div className="mt-2 flex gap-2">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          inputMode="numeric"
                          value={pointsToRedeem}
                          onChange={(event) =>
                            setPointsToRedeem(event.target.value)
                          }
                          disabled={
                            !canRedeemRewards ||
                            !isOnline ||
                            !rewardQuote.loyaltyEnabled ||
                            rewardQuote.maximumPoints === 0 ||
                            mpesaLocksBasket
                          }
                          placeholder="Points to redeem"
                          aria-label="Loyalty points to redeem"
                          aria-invalid={Boolean(pointsError)}
                          className="h-10 min-w-0 flex-1 rounded-md border border-[#d0d5dd] bg-white px-3 text-sm tabular-nums outline-none focus:border-[#d7a400] disabled:bg-[#f2f4f7] disabled:text-[#98a2b3] dark:border-white/10 dark:bg-[#1c1c1e]"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setPointsToRedeem(String(rewardQuote.maximumPoints))
                          }
                          disabled={
                            !canRedeemRewards ||
                            !isOnline ||
                            rewardQuote.maximumPoints === 0 ||
                            mpesaLocksBasket
                          }
                          className="h-10 rounded-md border border-[#d7a400] bg-[#fff8df] px-3 text-xs font-bold text-[#6f5600] disabled:opacity-40 dark:bg-amber-950/20 dark:text-amber-200"
                        >
                          Use max
                        </button>
                        {pointsToRedeem && (
                          <button
                            type="button"
                            onClick={() => setPointsToRedeem('')}
                            disabled={mpesaLocksBasket}
                            className="h-10 px-2 text-xs font-semibold text-[#667085]"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      {pointsError && (
                        <p
                          className="mt-1.5 text-[11px] font-medium text-red-600"
                          role="alert"
                        >
                          {pointsError}
                        </p>
                      )}
                    </div>
                    <div className="border-t border-[#ead68a]/70 pt-3 dark:border-amber-400/15">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#667085] dark:text-[#aeb4c0]">
                          Bonus balance
                        </span>
                        <strong className="tabular-nums">
                          {formatCurrency(rewardQuote.bonusBalance)}
                        </strong>
                      </div>
                      {rewardQuote.bonusBalance > 0 &&
                      rewardQuote.maximumBonus > 0 ? (
                        <div className="mt-2">
                          <p className="mb-2 text-[11px] text-[#667085]">
                            Maximum usable:{' '}
                            {formatCurrency(rewardQuote.maximumBonus)}
                          </p>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              inputMode="decimal"
                              value={bonusToUse}
                              onChange={(event) =>
                                setBonusToUse(event.target.value)
                              }
                              disabled={
                                !canRedeemRewards ||
                                !isOnline ||
                                !rewardQuote.bonusEnabled ||
                                mpesaLocksBasket
                              }
                              placeholder="Bonus amount"
                              aria-label="Bonus amount to use"
                              aria-invalid={Boolean(bonusError)}
                              className="h-10 min-w-0 flex-1 rounded-md border border-[#d0d5dd] bg-white px-3 text-sm tabular-nums outline-none focus:border-[#d7a400] disabled:bg-[#f2f4f7] dark:border-white/10 dark:bg-[#1c1c1e]"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setBonusToUse(String(rewardQuote.maximumBonus))
                              }
                              disabled={
                                !canRedeemRewards ||
                                !isOnline ||
                                mpesaLocksBasket
                              }
                              className="h-10 rounded-md border border-[#d7a400] bg-[#fff8df] px-3 text-xs font-bold text-[#6f5600] disabled:opacity-40 dark:bg-amber-950/20 dark:text-amber-200"
                            >
                              Use max
                            </button>
                            {bonusToUse && (
                              <button
                                type="button"
                                onClick={() => setBonusToUse('')}
                                disabled={mpesaLocksBasket}
                                className="h-10 px-2 text-xs font-semibold text-[#667085]"
                              >
                                Clear
                              </button>
                            )}
                          </div>
                          {bonusError && (
                            <p
                              className="mt-1.5 text-[11px] font-medium text-red-600"
                              role="alert"
                            >
                              {bonusError}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="mt-1.5 text-[11px] text-[#98a2b3]">
                          No bonus available
                        </p>
                      )}
                    </div>
                    {combinationError && (
                      <p
                        className="text-[11px] font-medium text-red-600"
                        role="alert"
                      >
                        Loyalty points and bonus cannot be combined under the
                        current reward settings.
                      </p>
                    )}
                    {!canRedeemRewards && (
                      <p className="text-[11px] font-medium text-amber-800 dark:text-amber-200">
                        Your role can view rewards but cannot redeem them.
                      </p>
                    )}
                    {!isOnline && (
                      <p className="text-[11px] font-medium text-amber-800 dark:text-amber-200">
                        Connect to the internet to redeem rewards.
                      </p>
                    )}
                    {rewardReduction > 0 && (
                      <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2.5 text-xs dark:bg-white/5">
                        <span className="font-semibold">Amount remaining</span>
                        <strong className="text-sm tabular-nums">
                          {formatCurrency(total)}
                        </strong>
                      </div>
                    )}
                  </div>
                ) : !rewardQuoteLoading ? (
                  <p className="mt-3 text-xs text-[#667085]">
                    Rewards are unavailable for this basket.
                  </p>
                ) : null}
              </section>
            )}

            {checkoutStep === 'customer' && (
              <div className="rounded-xl border border-[#e4e7ec] bg-white p-3.5 dark:border-white/10 dark:bg-[#171717]">
                <button
                  type="button"
                  onClick={() => {
                    if (pointsError || bonusError || combinationError)
                      return notify.error(
                        pointsError ||
                          bonusError ||
                          'Loyalty points and bonus cannot be combined'
                      );
                    if (paymentMethod === 'cash' && !amountPaid)
                      setAmountPaid(String(total));
                    setCheckoutStep('payment');
                  }}
                  style={{ backgroundColor: ui.primary, color: ui.primaryInk }}
                  className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3.5 text-base font-bold transition-opacity hover:opacity-90"
                >
                  Continue to payment <span aria-hidden="true">→</span>
                </button>
                <p className="mt-2 text-center text-xs text-[#667085] dark:text-[#aeb4c0]">
                  Review the order, then choose how the customer will pay.
                </p>
              </div>
            )}

            {checkoutStep === 'payment' && (
              <>
                {(prescriptionRequired || containsRestrictedMedicine) && (
                  <div className="rounded-xl border border-amber-300 bg-amber-50/60 p-3.5 dark:border-amber-900 dark:bg-amber-950/20">
                    <div className="flex items-start gap-2">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
                      <div>
                        <p className="text-xs font-bold text-amber-950 dark:text-amber-100">
                          Pharmacy sale record
                        </p>
                        <p className="mt-0.5 text-[11px] text-amber-800 dark:text-amber-300">
                          Record the supplied reference only. Pesaby does not
                          provide clinical advice.
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <div>
                        <label className={ui.label}>
                          Prescription reference{' '}
                          {prescriptionRequired && (
                            <span className="text-red-600">*</span>
                          )}
                        </label>
                        <input
                          value={prescriptionReference}
                          onChange={(event) =>
                            setPrescriptionReference(event.target.value)
                          }
                          maxLength={120}
                          placeholder="Prescription or dispensing reference"
                          className={cn(inputCls, 'h-10')}
                        />
                      </div>
                      <div>
                        <label className={ui.label}>
                          Prescriber/reference details
                        </label>
                        <input
                          value={prescriberReference}
                          onChange={(event) =>
                            setPrescriberReference(event.target.value)
                          }
                          maxLength={160}
                          placeholder="Prescriber name or registration reference"
                          className={cn(inputCls, 'h-10')}
                        />
                      </div>
                      <div>
                        <label className={ui.label}>Patient/reference</label>
                        <input
                          value={patientReference}
                          onChange={(event) =>
                            setPatientReference(event.target.value)
                          }
                          maxLength={160}
                          placeholder="Patient or file reference"
                          className={cn(inputCls, 'h-10')}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className={ui.label}>Issued</label>
                          <input
                            type="date"
                            value={prescriptionIssuedAt}
                            onChange={(event) =>
                              setPrescriptionIssuedAt(event.target.value)
                            }
                            className={cn(inputCls, 'h-10')}
                          />
                        </div>
                        <div>
                          <label className={ui.label}>Expires</label>
                          <input
                            type="date"
                            value={prescriptionExpiresAt}
                            min={new Date().toISOString().slice(0, 10)}
                            onChange={(event) =>
                              setPrescriptionExpiresAt(event.target.value)
                            }
                            className={cn(inputCls, 'h-10')}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="mt-2">
                      <label className={ui.label}>Workflow note</label>
                      <input
                        value={pharmacyNotes}
                        onChange={(event) =>
                          setPharmacyNotes(event.target.value)
                        }
                        maxLength={500}
                        placeholder="Optional audit note"
                        className={cn(inputCls, 'h-10')}
                      />
                    </div>
                    {containsRestrictedMedicine && (
                      <p
                        className={cn(
                          'mt-2 text-[11px] font-semibold',
                          canApproveRestricted
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : 'text-red-700 dark:text-red-300'
                        )}
                      >
                        {canApproveRestricted
                          ? 'Restricted-item approval will be recorded under the current authorized user.'
                          : 'This user cannot approve restricted-item sales. Ask an authorized pharmacist or manager.'}
                      </p>
                    )}
                  </div>
                )}
                {/* Payment method */}
                <div className="overflow-hidden bg-transparent font-sans">
                  <div className="flex items-center justify-between px-4 pb-3 pt-4">
                    <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#667085] dark:text-[#a3a3a3]">
                      Payment method
                    </p>
                    <span className="rounded-full bg-[#fff9e6] px-2.5 py-1 text-[11px] font-bold text-[#806000] dark:bg-[rgba(255,214,10,.1)] dark:text-[#ffd60a]">
                      F3–F6 to switch
                    </span>
                  </div>
                  <div
                    className="grid grid-cols-2 gap-2 px-3 pb-3 sm:gap-2.5 sm:px-4 sm:pb-4"
                    role="group"
                    aria-label="Payment method"
                  >
                    {(
                      [
                        {
                          key: 'cash',
                          label: 'Cash',
                          detail: 'Enter cash received',
                          shortcut: 'F3',
                        },
                        {
                          key: 'mpesa',
                          label: 'M-Pesa',
                          detail: 'STK Push · Till / PayBill',
                          shortcut: 'F4',
                        },
                        {
                          key: 'airtel_money',
                          label: 'Airtel Money',
                          detail: 'Confirm transaction code',
                          shortcut: 'F6',
                        },
                        {
                          key: 'card',
                          label: 'Card',
                          detail: 'Visa · Mastercard',
                          shortcut: 'F5',
                        },
                        {
                          key: 'bank_transfer',
                          label: 'Bank transfer',
                          detail: 'Confirm bank reference',
                          shortcut: '',
                        },
                        {
                          key: 'credit',
                          label: 'Customer credit',
                          detail: 'Collect payment later',
                          shortcut: '',
                        },
                      ] as const
                    )
                      .filter(
                        ({ key }) =>
                          key === 'airtel_money' ||
                          settings.paymentMethods.includes(key)
                      )
                      .map(({ key, label, detail, shortcut }) => (
                        <button
                          key={key}
                          onClick={() => void switchPaymentMethod(key)}
                          disabled={
                            (!isOnline && key !== 'cash') ||
                            (paymentMethod === 'mpesa' &&
                              mpesaStatus === 'success' &&
                              paymentMethod !== key)
                          }
                          aria-pressed={paymentMethod === key}
                          aria-label={`${label} payment (${shortcut})`}
                          title={
                            !isOnline && key !== 'cash'
                              ? `${label} requires an internet connection`
                              : `${label} (${shortcut})`
                          }
                          className={cn(
                            'group relative h-[68px] overflow-hidden rounded-lg border bg-white p-0 transition-colors duration-150 hover:border-[#98a2b3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e94e1b]/25 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-[#1c1c1c]',
                            paymentMethod === key
                              ? 'border-[#344054] ring-2 ring-[#344054]/15'
                              : 'border-[#e4e7ec] dark:border-white/10'
                          )}
                        >
                          <PaymentBrand method={key} />
                          <span className="sr-only">
                            {label} · {detail}
                          </span>
                          {paymentMethod === key && (
                            <span className="absolute right-1.5 top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#344054] bg-white text-[#344054]">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </button>
                      ))}
                  </div>

                  {(paymentDialogOpen || checkoutStep === 'payment') && (
                    <div
                      className="border-t border-[#e4e7ec]"
                      role="region"
                      aria-labelledby="payment-dialog-title"
                    >
                      <div className="w-full">
                        <h2 id="payment-dialog-title" className="sr-only">
                          Payment details
                        </h2>
                        <div>
                          {paymentMethod === 'cash' && (
                            <div>
                              <div className="hidden space-y-[18px]">
                                <div className="grid grid-cols-3 gap-6">
                                  <label className="text-sm font-medium text-[#343a46]">
                                    Received Amount{' '}
                                    <span className="text-[#ff0000]">*</span>
                                    <div className="relative mt-2">
                                      <span className="absolute inset-y-0 left-3 flex items-center text-xs text-[#344054]">
                                        KSh
                                      </span>
                                      <input
                                        ref={cashReceivedInputRef}
                                        id="cash-received"
                                        type="number"
                                        min={total}
                                        step="0.01"
                                        value={amountPaid}
                                        onChange={(event) =>
                                          setAmountPaid(event.target.value)
                                        }
                                        className="h-10 w-full rounded-[5px] border border-[#d8dde5] bg-white pl-12 pr-3 text-sm outline-none focus:border-[#e94e1b]"
                                      />
                                    </div>
                                  </label>
                                  <label className="text-sm font-medium text-[#343a46]">
                                    Paying Amount{' '}
                                    <span className="text-[#ff0000]">*</span>
                                    <div className="relative mt-2">
                                      <span className="absolute inset-y-0 left-3 flex items-center text-xs text-[#344054]">
                                        KSh
                                      </span>
                                      <input
                                        readOnly
                                        value={total.toFixed(2)}
                                        className="h-10 w-full rounded-[5px] border border-[#d8dde5] bg-white pl-12 pr-3 text-sm text-[#344054]"
                                      />
                                    </div>
                                  </label>
                                  <label className="text-sm font-medium text-[#343a46]">
                                    Change
                                    <div className="relative mt-2">
                                      <span className="absolute inset-y-0 left-3 flex items-center text-xs text-[#344054]">
                                        KSh
                                      </span>
                                      <input
                                        readOnly
                                        value={change.toFixed(2)}
                                        className="h-10 w-full rounded-[5px] border border-[#d8dde5] bg-white pl-12 pr-3 text-sm text-[#344054]"
                                      />
                                    </div>
                                  </label>
                                </div>
                                <label className="block text-sm font-medium text-[#343a46]">
                                  Payment Type{' '}
                                  <span className="text-[#ff0000]">*</span>
                                  <select
                                    value={paymentMethod}
                                    onChange={(event) => {
                                      setPaymentMethod(
                                        event.target.value as PosPaymentMethod
                                      );
                                      setMpesaRef('');
                                    }}
                                    className="mt-2 h-10 w-full rounded-[5px] border border-[#d8dde5] bg-white px-3 text-sm outline-none focus:border-[#e94e1b]"
                                  >
                                    {settings.paymentMethods
                                      .filter(
                                        (method): method is PosPaymentMethod =>
                                          [
                                            'cash',
                                            'mpesa',
                                            'airtel_money',
                                            'card',
                                            'bank_transfer',
                                            'credit',
                                          ].includes(method)
                                      )
                                      .map((method) => (
                                        <option key={method} value={method}>
                                          {method === 'mpesa'
                                            ? 'M-Pesa'
                                            : method === 'airtel_money'
                                              ? 'Airtel Money'
                                              : method === 'bank_transfer'
                                                ? 'Bank Transfer'
                                                : method[0].toUpperCase() +
                                                  method.slice(1)}
                                        </option>
                                      ))}
                                  </select>
                                </label>
                                <label className="block text-sm font-medium text-[#343a46]">
                                  Payment Receiver
                                  <input
                                    value={paymentReceiver}
                                    onChange={(event) =>
                                      setPaymentReceiver(event.target.value)
                                    }
                                    className="mt-2 h-10 w-full rounded-[5px] border border-[#d8dde5] bg-white px-3 text-sm outline-none focus:border-[#e94e1b]"
                                  />
                                </label>
                                <label className="block text-sm font-medium text-[#343a46]">
                                  Payment Note
                                  <textarea
                                    value={paymentNote}
                                    onChange={(event) =>
                                      setPaymentNote(event.target.value)
                                    }
                                    placeholder="Type your message"
                                    className="mt-2 h-[85px] w-full resize-none rounded-[5px] border border-[#d8dde5] bg-white px-3 py-2 text-sm outline-none placeholder:text-[#a7adb7] focus:border-[#e94e1b]"
                                  />
                                </label>
                                <label className="block text-sm font-medium text-[#343a46]">
                                  Sale Note
                                  <textarea
                                    value={saleNote}
                                    onChange={(event) =>
                                      setSaleNote(event.target.value)
                                    }
                                    placeholder="Type your message"
                                    className="mt-2 h-[85px] w-full resize-none rounded-[5px] border border-[#d8dde5] bg-white px-3 py-2 text-sm outline-none placeholder:text-[#a7adb7] focus:border-[#e94e1b]"
                                  />
                                </label>
                                <label className="block text-sm font-medium text-[#343a46]">
                                  Staff Note
                                  <textarea
                                    value={staffNote}
                                    onChange={(event) =>
                                      setStaffNote(event.target.value)
                                    }
                                    placeholder="Type your message"
                                    className="mt-2 h-[85px] w-full resize-none rounded-[5px] border border-[#d8dde5] bg-white px-3 py-2 text-sm outline-none placeholder:text-[#a7adb7] focus:border-[#e94e1b]"
                                  />
                                </label>
                              </div>
                              <div className="overflow-hidden bg-white dark:bg-[#171717]">
                                <div className="flex items-center justify-between gap-3 border-b border-[#eef0f3] bg-[#fafbfc] px-3.5 py-3 dark:border-white/10 dark:bg-white/[.03]">
                                  <div className="flex items-center gap-2.5">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#f3d77a] bg-[#fff9e6] text-[#a56b00] dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                                      <Banknote className="h-4 w-4" />
                                    </span>
                                    <div>
                                      <p className="text-[15px] font-bold tracking-tight text-[#101828] dark:text-white">
                                        Cash payment
                                      </p>
                                      <p className="mt-0.5 text-xs font-medium text-[#667085] dark:text-[#a3a3a3]">
                                        Enter the tendered amount
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-[#6f5600] dark:text-[#d9c05a]">
                                      Total due
                                    </span>
                                    <strong className="mt-0.5 block text-xl font-extrabold tabular-nums text-[#241d00] dark:text-white">
                                      {formatCurrency(total)}
                                    </strong>
                                  </div>
                                </div>

                                <div className="space-y-3.5 p-3.5">
                                  <div>
                                    <div className="mb-1.5 flex items-center justify-between">
                                      <label className="text-sm font-bold text-[#344054] dark:text-white">
                                        Cash received
                                      </label>
                                      <span className="text-xs font-medium text-[#667085] dark:text-[#a3a3a3]">
                                        Amount tendered
                                      </span>
                                    </div>
                                    <div className="relative">
                                      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs font-bold text-[#a56b00]">
                                        KSh
                                      </span>
                                      <input
                                        type="number"
                                        min={total}
                                        step="0.01"
                                        placeholder={formatCurrency(total)
                                          .replace('KES', '')
                                          .trim()}
                                        value={amountPaid}
                                        onChange={(e) =>
                                          setAmountPaid(e.target.value)
                                        }
                                        className={cn(
                                          inputCls,
                                          'h-12 appearance-none rounded-md border-[#d0d5dd] bg-white pl-14 text-base font-semibold tabular-nums shadow-none transition-colors focus:border-[#98a2b3] focus:ring-1 focus:ring-[#98a2b3]/20 dark:bg-[#111113] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
                                        )}
                                      />
                                    </div>
                                  </div>
                                  <div>
                                    <div className="mb-2 flex items-center gap-1.5">
                                      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#667085] dark:text-[#a3a3a3]">
                                        Quick tender
                                      </p>
                                      <span className="group/help relative inline-flex">
                                        <button
                                          type="button"
                                          aria-label="Quick tender help"
                                          aria-describedby="quick-tender-help"
                                          className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[#b77900] outline-none transition-colors hover:text-[#7a5700] focus-visible:ring-2 focus-visible:ring-[#f5b800]/40 dark:text-[#ffd75a] dark:hover:text-[#ffe58a]"
                                        >
                                          <Info className="h-4 w-4" />
                                        </button>
                                        <span
                                          id="quick-tender-help"
                                          role="tooltip"
                                          className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-52 -translate-x-1/2 rounded-md border border-[#d7a400] bg-[#f5b800] px-2.5 py-2 text-center text-[11px] font-semibold normal-case leading-4 tracking-normal text-[#241d00] opacity-0 shadow-sm transition-opacity group-hover/help:opacity-100 group-focus-within/help:opacity-100 dark:border-[#f5b800] dark:bg-[#f5b800] dark:text-[#241d00]"
                                        >
                                          Choose the exact tender or enter the
                                          amount received.
                                        </span>
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                      {[
                                        total,
                                        ...[
                                          1000, 2000, 5000, 10000, 20000, 50000,
                                        ].filter((amount) => amount >= total),
                                      ]
                                        .filter(
                                          (amount, index, values) =>
                                            values.indexOf(amount) === index
                                        )
                                        .slice(0, 5)
                                        .map((amount) => (
                                          <button
                                            key={amount}
                                            type="button"
                                            onClick={() =>
                                              setAmountPaid(String(amount))
                                            }
                                            className={cn(
                                              'h-12 w-full whitespace-nowrap rounded-md border px-1.5 text-xs font-semibold shadow-none transition-colors',
                                              amount === total
                                                ? 'border-[#d7a400] bg-[#fff9df] text-[#5f4800] hover:bg-[#fff3c0] dark:bg-amber-950/25 dark:text-amber-200'
                                                : 'border-[#dfe3e8] bg-white text-[#475467] hover:border-[#b8bec8] hover:bg-[#f9fafb] dark:border-white/10 dark:bg-transparent dark:text-[#d0d5dd]'
                                            )}
                                          >
                                            {amount === total
                                              ? `Exact · ${formatCurrency(total)}`
                                              : formatCurrency(amount)}
                                          </button>
                                        ))}
                                    </div>
                                  </div>
                                  {parseFloat(amountPaid || '0') >= total ? (
                                    <div className="flex items-center justify-between border-t border-[#e4e7ec] px-1 py-2.5 text-[#344054] dark:border-white/10 dark:text-white">
                                      <span className="flex items-center gap-1.5 text-xs font-bold">
                                        <CheckCircle2 className="h-4 w-4 text-[#6f5600]" />{' '}
                                        Change due
                                      </span>
                                      <strong className="text-base tabular-nums">
                                        {formatCurrency(change)}
                                      </strong>
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          )}

                          {paymentMethod === 'credit' && (
                            <div className="border-t border-[#e4e7ec] bg-white p-4 dark:border-white/10 dark:bg-[#1c1c1e]">
                              <div className="rounded-lg border border-[#ead68a] bg-[#fffaf0] p-4 dark:border-amber-400/20 dark:bg-amber-400/5">
                                <div className="flex items-start gap-3">
                                  <span className="rounded-lg bg-[#f5b800] p-2 text-[#241d00]">
                                    <HandCoins className="h-5 w-5" />
                                  </span>
                                  <div>
                                    <h3 className="text-sm font-bold text-[#101828] dark:text-white">
                                      Customer credit sale
                                    </h3>
                                    <p className="mt-1 text-xs leading-5 text-[#667085] dark:text-[#a3a3a3]">
                                      No payment is posted today. The full sale
                                      becomes an account receivable for the
                                      selected customer.
                                    </p>
                                  </div>
                                </div>
                                <label className="mt-4 block text-xs font-semibold text-[#344054] dark:text-[#d0d5dd]">
                                  Payment due date{' '}
                                  <span className="text-red-500">*</span>
                                  <input
                                    type="date"
                                    value={creditDueDate}
                                    min={new Date().toISOString().slice(0, 10)}
                                    onChange={(event) =>
                                      setCreditDueDate(event.target.value)
                                    }
                                    className="mt-2 h-10 w-full rounded-md border border-[#d0d5dd] bg-white px-3 text-sm text-[#101828] outline-none focus:border-[#d7a400] dark:border-white/10 dark:bg-[#242426] dark:text-white"
                                  />
                                </label>
                                {!selectedCustomer && (
                                  <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                                    Go back and select the customer receiving
                                    this credit.
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {paymentMethod === 'mpesa' && (
                            <div className="overflow-hidden border-t border-[#e4e7ec] bg-white dark:border-[#2c2c2e] dark:bg-[#1c1c1e]">
                              <div className="flex items-center justify-between gap-4 border-b border-[#e4e7ec] bg-white px-4 py-4 dark:border-[#2c2c2e] dark:bg-[#1c1c1e]">
                                <div className="flex min-w-0 items-center gap-2.5">
                                  <span className="flex h-10 w-14 shrink-0 items-center justify-center rounded-[7px] border border-[#e4e7ec] bg-white px-1.5 shadow-sm dark:border-[#3a3a3c] dark:bg-white">
                                    <Image
                                      src="/payment-logos/mpesa.svg"
                                      alt="M-Pesa"
                                      width={60}
                                      height={26}
                                      className="h-5 w-auto"
                                    />
                                  </span>
                                  <div>
                                    <p className="text-sm font-bold tracking-tight text-[#273142] dark:text-white">
                                      {mpesaFlow === 'paybill' && mpesaRequestId
                                        ? `M-Pesa — ${mpesaAccountType === 'till' ? 'Till' : 'PayBill'}`
                                        : 'M-Pesa payment'}
                                    </p>
                                    <p className="mt-0.5 text-[11px] text-[#667085] dark:text-[#b3b3b8]">
                                      {mpesaStatus === 'success'
                                        ? 'Confirmed by Safaricom'
                                        : 'Payment verified before sale completion'}
                                    </p>
                                  </div>
                                </div>
                                <div className="shrink-0 text-right">
                                  <span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-[#667085] dark:text-[#a1a1a6]">
                                    Amount due
                                  </span>
                                  <strong className="mt-0.5 block text-base font-extrabold tabular-nums text-[#273142] dark:text-white">
                                    {formatMpesaAmount(total)}
                                  </strong>
                                </div>
                              </div>

                              <div className="space-y-4 bg-white p-4 dark:bg-[#1c1c1e]">
                                <div>
                                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#667085] dark:text-[#a1a1a6]">
                                    Payment option
                                  </p>
                                  <div className="grid grid-cols-2 gap-2.5">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void switchMpesaFlow('stk')
                                      }
                                      disabled={
                                        mpesaStatus === 'success' &&
                                        mpesaFlow !== 'stk'
                                      }
                                      className={cn(
                                        'flex min-h-[60px] items-center gap-2.5 rounded-[7px] border px-3 text-left shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                                        mpesaFlow === 'stk'
                                          ? 'border-[#11ad2d] bg-[#f3fbf5] dark:border-[#11ad2d] dark:bg-[#12351c]'
                                          : 'border-[#e4e7ec] bg-white hover:border-[#8bd49a] hover:bg-[#f9fafb] dark:border-[#3a3a3c] dark:bg-[#242426] dark:hover:bg-[#2c2c2e]'
                                      )}
                                    >
                                      <span
                                        className={cn(
                                          'flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
                                          mpesaFlow === 'stk'
                                            ? 'bg-[#11ad2d] text-white'
                                            : 'bg-[#eff7f0] text-[#168337] dark:bg-emerald-950/40'
                                        )}
                                      >
                                        <Smartphone className="h-3.5 w-3.5" />
                                      </span>
                                      <span>
                                        <span className="block text-xs font-semibold text-[#273142] dark:text-white">
                                          Safaricom Prompt
                                        </span>
                                        <span className="mt-0.5 block text-[10px] text-[#667085] dark:text-[#b3b3b8]">
                                          Send STK Push
                                        </span>
                                      </span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void openManualMpesaFlow()}
                                      disabled={
                                        mpesaStatus === 'success' &&
                                        mpesaFlow !== 'paybill'
                                      }
                                      className={cn(
                                        'flex min-h-[60px] items-center gap-2.5 rounded-[7px] border px-3 text-left shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                                        mpesaFlow === 'paybill'
                                          ? 'border-[#11ad2d] bg-[#f3fbf5] dark:border-[#11ad2d] dark:bg-[#12351c]'
                                          : 'border-[#e4e7ec] bg-white hover:border-[#8bd49a] hover:bg-[#f9fafb] dark:border-[#3a3a3c] dark:bg-[#242426] dark:hover:bg-[#2c2c2e]'
                                      )}
                                    >
                                      <span
                                        className={cn(
                                          'flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
                                          mpesaFlow === 'paybill'
                                            ? 'bg-[#11ad2d] text-white'
                                            : 'bg-[#eff7f0] text-[#168337] dark:bg-emerald-950/40'
                                        )}
                                      >
                                        <Building2 className="h-3.5 w-3.5" />
                                      </span>
                                      <span>
                                        <span className="block text-xs font-semibold text-[#273142] dark:text-white">
                                          Till / PayBill
                                        </span>
                                        <span className="mt-0.5 block text-[10px] text-[#667085] dark:text-[#b3b3b8]">
                                          Pay manually
                                        </span>
                                      </span>
                                    </button>
                                  </div>
                                </div>
                                {mpesaFlow === 'stk' ? (
                                  <div className="rounded-lg border border-[#e5efe7] bg-[#fafdfb] p-3 dark:border-emerald-900/60 dark:bg-emerald-950/20">
                                    {mpesaStatus === 'initiating' ||
                                    mpesaStatus === 'pending' ? (
                                      <div className="py-2 text-center">
                                        <Loader2 className="mx-auto h-7 w-7 animate-spin text-[#11ad2d]" />
                                        <p className="mt-2 text-sm font-bold text-[#273142] dark:text-white">
                                          {mpesaStatus === 'initiating'
                                            ? 'Sending STK Push'
                                            : 'Waiting for payment'}
                                        </p>
                                        <p className="mt-1 text-xs text-[#667085] dark:text-[#b3b3b8]">
                                          STK Push sent to{' '}
                                          <strong>
                                            {maskKenyanPhone(mpesaPhone)}
                                          </strong>
                                        </p>
                                        <p className="mx-auto mt-2 max-w-xs text-[11px] leading-4 text-[#667085] dark:text-[#b3b3b8]">
                                          Ask the customer to check their phone
                                          and enter their M-Pesa PIN.
                                        </p>
                                        <div className="mt-3 flex justify-center gap-2">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              void checkMpesaStatusNow()
                                            }
                                            className="h-9 rounded-md border border-[#b9d9c0] bg-white px-3 text-xs font-bold text-[#176b2c] shadow-none hover:bg-[#f4fbf5] dark:border-emerald-800 dark:bg-transparent dark:text-emerald-300"
                                          >
                                            Check status
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              void changeMpesaPhone()
                                            }
                                            className="h-9 rounded-md px-3 text-xs font-semibold text-[#475467] hover:bg-white dark:text-[#d0d5dd] dark:hover:bg-white/5"
                                          >
                                            Change phone
                                          </button>
                                        </div>
                                      </div>
                                    ) : mpesaStatus === 'success' ? (
                                      <div className="py-2 text-center">
                                        <CheckCircle2 className="mx-auto h-7 w-7 text-[#11ad2d]" />
                                        <p className="mt-2 text-sm font-bold text-[#273142] dark:text-white">
                                          M-Pesa payment received
                                        </p>
                                        <p className="mt-1 text-base font-extrabold text-[#273142] dark:text-white">
                                          {formatMpesaAmount(total)}
                                        </p>
                                        <p className="mt-1 text-xs text-[#667085] dark:text-[#b3b3b8]">
                                          Receipt <strong>{mpesaRef}</strong> ·
                                          Completing sale…
                                        </p>
                                      </div>
                                    ) : mpesaStatus === 'failed' ||
                                      mpesaStatus === 'timeout' ||
                                      mpesaStatus === 'cancelled' ? (
                                      <div className="py-1">
                                        <p className="text-sm font-bold text-[#7a271a] dark:text-red-300">
                                          {mpesaStatus === 'cancelled'
                                            ? 'Payment cancelled'
                                            : mpesaStatus === 'timeout'
                                              ? 'Payment not confirmed'
                                              : 'M-Pesa payment failed'}
                                        </p>
                                        <p className="mt-1 text-xs leading-4 text-[#667085] dark:text-[#b8b8b8]">
                                          {mpesaMessage ||
                                            (mpesaStatus === 'cancelled'
                                              ? 'The customer cancelled the M-Pesa request.'
                                              : 'No payment confirmation was received.')}
                                        </p>
                                        <p className="mt-1 text-xs font-semibold text-[#344054] dark:text-white">
                                          {formatMpesaAmount(total)} was not
                                          confirmed.
                                        </p>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                          {mpesaStatus === 'timeout' && (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                void checkMpesaStatusNow()
                                              }
                                              className="h-9 rounded-md border border-[#d0d5dd] bg-white px-3 text-xs font-bold text-[#344054]"
                                            >
                                              Check status
                                            </button>
                                          )}
                                          <button
                                            type="button"
                                            onClick={() =>
                                              void prepareNewMpesaPrompt()
                                            }
                                            className="h-9 rounded-md bg-[#11ad2d] px-3 text-xs font-bold text-white"
                                          >
                                            Send new request
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              void changeMpesaPhone()
                                            }
                                            className="h-9 rounded-md px-3 text-xs font-semibold text-[#475467] dark:text-[#d0d5dd]"
                                          >
                                            Change number
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        <label className="mb-1.5 block text-xs font-semibold text-[#344054] dark:text-[#e4e7ec]">
                                          Customer phone number
                                        </label>
                                        <input
                                          type="tel"
                                          inputMode="tel"
                                          autoComplete="tel"
                                          placeholder="0712 345 678"
                                          value={mpesaPhone}
                                          onChange={(event) =>
                                            setMpesaPhone(event.target.value)
                                          }
                                          className={cn(
                                            inputCls,
                                            'h-11 w-full border-[#c9e9ce] bg-white focus:border-[#11ad2d] focus:ring-[#11ad2d]/10 dark:bg-[#171717]'
                                          )}
                                        />
                                        <p className="mt-2 text-[11px] text-[#667085] dark:text-[#b3b3b8]">
                                          An M-Pesa prompt will be sent to this
                                          phone.
                                        </p>
                                        <button
                                          type="button"
                                          onClick={handleMpesaPrompt}
                                          disabled={!isOnline}
                                          className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-lg bg-[#11ad2d] px-3 text-xs font-bold text-white transition-colors hover:bg-[#079c35] disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                          Send STK Push ·{' '}
                                          {formatMpesaAmount(total, false)}
                                        </button>
                                      </>
                                    )}
                                  </div>
                                ) : (
                                  <div className="space-y-2 rounded-[7px] border border-[#e4e7ec] bg-[#f9fafb] p-3 dark:border-[#3a3a3c] dark:bg-[#242426]">
                                    {!mpesaRequestId ||
                                    mpesaStatus === 'failed' ||
                                    mpesaStatus === 'timeout' ? (
                                      <div className="py-3 text-center">
                                        {mpesaStatus === 'initiating' ? (
                                          <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#11ad2d]" />
                                        ) : (
                                          <AlertTriangle className="mx-auto h-6 w-6 text-[#b54708]" />
                                        )}
                                        <p className="mt-2 text-sm font-bold text-[#273142] dark:text-white">
                                          {mpesaStatus === 'initiating'
                                            ? 'Loading payment details'
                                            : 'Payment details unavailable'}
                                        </p>
                                        <p className="mt-1 text-[11px] text-[#667085] dark:text-[#b8b8b8]">
                                          {mpesaStatus === 'initiating'
                                            ? 'Preparing the branch Till or PayBill account.'
                                            : mpesaMessage ||
                                              (containsAgeRestrictedItem &&
                                              !ageVerified
                                                ? 'Verify the customer age to load payment details.'
                                                : 'Check the branch M-Pesa configuration and try again.')}
                                        </p>
                                        {mpesaStatus !== 'initiating' && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              void handlePaybillPayment()
                                            }
                                            disabled={!isOnline}
                                            className="mt-3 h-9 rounded-md border border-[#b9d9c0] bg-white px-4 text-xs font-bold text-[#176b2c] dark:border-emerald-800 dark:bg-transparent dark:text-emerald-300"
                                          >
                                            Try again
                                          </button>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="grid grid-cols-2 gap-2">
                                        {mpesaStatus === 'success' ? (
                                          <div className="col-span-2 py-3 text-center">
                                            <CheckCircle2 className="mx-auto h-7 w-7 text-[#11ad2d]" />
                                            <p className="mt-2 text-sm font-bold text-[#273142] dark:text-white">
                                              Payment received
                                            </p>
                                            <strong className="mt-1 block text-lg tabular-nums text-[#273142] dark:text-white">
                                              {formatMpesaAmount(total)}
                                            </strong>
                                            <div className="mx-auto mt-3 max-w-xs space-y-1 text-xs text-[#667085] dark:text-[#b8b8b8]">
                                              <p>
                                                M-Pesa receipt{' '}
                                                <strong className="text-[#273142] dark:text-white">
                                                  {mpesaRef}
                                                </strong>
                                              </p>
                                              <p>
                                                Paid via{' '}
                                                <strong>
                                                  {mpesaAccountType === 'till'
                                                    ? 'Till'
                                                    : 'PayBill'}{' '}
                                                  {mpesaShortcode}
                                                </strong>
                                              </p>
                                              {mpesaAccountType ===
                                                'paybill' && (
                                                <p>
                                                  Account{' '}
                                                  <strong>
                                                    {mpesaAccountReference}
                                                  </strong>
                                                </p>
                                              )}
                                              {mpesaPhone && (
                                                <p>
                                                  Phone{' '}
                                                  <strong>
                                                    {maskKenyanPhone(
                                                      mpesaPhone
                                                    )}
                                                  </strong>
                                                </p>
                                              )}
                                              <p className="font-semibold text-[#43784f] dark:text-emerald-300">
                                                Confirmed by Safaricom
                                              </p>
                                              <p>Completing sale…</p>
                                            </div>
                                          </div>
                                        ) : (
                                          <>
                                            {mpesaManualAccounts.length > 1 && (
                                              <div className="col-span-2">
                                                <p className="mb-1.5 text-xs font-semibold text-[#344054] dark:text-[#e4e7ec]">
                                                  Pay using
                                                </p>
                                                <div className="grid grid-cols-2 gap-2">
                                                  {mpesaManualAccounts.map(
                                                    (account) => (
                                                      <button
                                                        key={`${account.accountType}-${account.shortcode}`}
                                                        type="button"
                                                        onClick={() =>
                                                          void changeManualMpesaMode(
                                                            account.accountType
                                                          )
                                                        }
                                                        disabled={
                                                          mpesaStatus ===
                                                          'initiating'
                                                        }
                                                        className={cn(
                                                          'h-10 rounded-md border text-xs font-bold transition-colors disabled:opacity-50',
                                                          mpesaAccountType ===
                                                            account.accountType
                                                            ? 'border-[#11ad2d] bg-[#effcf1] text-[#176b2c] dark:bg-emerald-950/30 dark:text-emerald-200'
                                                            : 'border-[#dfe5e0] bg-white text-[#475467] hover:border-[#85d993] dark:border-white/10 dark:bg-transparent dark:text-[#d0d5dd]'
                                                        )}
                                                      >
                                                        {account.accountType ===
                                                        'till'
                                                          ? 'Till Number'
                                                          : 'PayBill'}
                                                      </button>
                                                    )
                                                  )}
                                                </div>
                                              </div>
                                            )}
                                            <div
                                              className={cn(
                                                'rounded-[7px] border border-[#e4e7ec] bg-white p-3 shadow-sm dark:border-[#3a3a3c] dark:bg-[#1c1c1e]',
                                                mpesaAccountType === 'till' &&
                                                  'col-span-2'
                                              )}
                                            >
                                              <span className="block text-[9px] font-bold uppercase tracking-wider text-[#667085] dark:text-[#a1a1a6]">
                                                {mpesaAccountType === 'till'
                                                  ? 'Till number'
                                                  : 'PayBill number'}
                                              </span>
                                              <span className="mt-1 flex items-center justify-between gap-3">
                                                <strong className="text-xl tabular-nums text-[#273142] dark:text-white">
                                                  {mpesaShortcode}
                                                </strong>
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    void copyManualPaymentValue(
                                                      mpesaShortcode,
                                                      mpesaAccountType ===
                                                        'till'
                                                        ? 'Till number'
                                                        : 'PayBill number'
                                                    )
                                                  }
                                                  className="inline-flex h-7 items-center gap-1 rounded px-2 text-[10px] font-semibold text-[#43784f] hover:bg-[#effcf1] dark:text-emerald-300"
                                                >
                                                  <Copy className="h-3 w-3" />
                                                  Copy
                                                </button>
                                              </span>
                                              {mpesaMerchantName && (
                                                <span className="mt-1 block text-[10px] text-[#667085] dark:text-[#b8b8b8]">
                                                  Pay to {mpesaMerchantName}
                                                </span>
                                              )}
                                            </div>
                                            {mpesaAccountType === 'paybill' && (
                                              <div className="rounded-[7px] border border-[#e4e7ec] bg-white p-3 shadow-sm dark:border-[#3a3a3c] dark:bg-[#1c1c1e]">
                                                <span className="block text-[9px] font-bold uppercase tracking-wider text-[#667085] dark:text-[#a1a1a6]">
                                                  Account reference
                                                </span>
                                                <span className="mt-1 flex items-center justify-between gap-3">
                                                  <strong className="text-lg tracking-wide text-[#273142] dark:text-white">
                                                    {mpesaAccountReference}
                                                  </strong>
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      void copyManualPaymentValue(
                                                        mpesaAccountReference,
                                                        'Account number'
                                                      )
                                                    }
                                                    className="inline-flex h-7 items-center gap-1 rounded px-2 text-[10px] font-semibold text-[#43784f] hover:bg-[#effcf1] dark:text-emerald-300"
                                                  >
                                                    <Copy className="h-3 w-3" />
                                                    Copy
                                                  </button>
                                                </span>
                                              </div>
                                            )}
                                            <div className="col-span-2 rounded-[7px] border border-[#e4e7ec] bg-white px-3 py-2.5 shadow-sm dark:border-[#3a3a3c] dark:bg-[#1c1c1e]">
                                              <span className="block text-[9px] font-bold uppercase tracking-wider text-[#667085] dark:text-[#a1a1a6]">
                                                Amount
                                              </span>
                                              <strong className="mt-1 block text-lg tabular-nums text-[#273142] dark:text-white">
                                                {formatMpesaAmount(total)}
                                              </strong>
                                            </div>
                                            <details className="group col-span-2 rounded-[7px] border border-[#e4e7ec] bg-white px-3 py-2.5 text-[11px] leading-5 text-[#475467] shadow-sm dark:border-[#3a3a3c] dark:bg-[#1c1c1e] dark:text-[#d0d5dd]">
                                              <summary className="flex cursor-pointer list-none items-center justify-between font-bold text-[#273142] dark:text-white">
                                                How to pay{' '}
                                                <ChevronDown className="h-4 w-4 text-[#667085] transition-transform group-open:rotate-180" />
                                              </summary>
                                              <ol className="mt-2 list-inside list-decimal border-t border-[#e4e7ec] pt-2 dark:border-[#3a3a3c]">
                                                <li>Open M-Pesa</li>
                                                <li>Select Lipa na M-Pesa</li>
                                                <li>
                                                  Select{' '}
                                                  {mpesaAccountType === 'till'
                                                    ? 'Buy Goods and Services'
                                                    : 'PayBill'}
                                                </li>
                                                <li>
                                                  Enter{' '}
                                                  {mpesaAccountType === 'till'
                                                    ? 'Till'
                                                    : 'PayBill'}{' '}
                                                  {mpesaShortcode}
                                                </li>
                                                {mpesaAccountType ===
                                                  'paybill' && (
                                                  <li>
                                                    Enter account{' '}
                                                    {mpesaAccountReference}
                                                  </li>
                                                )}
                                                <li>
                                                  Enter{' '}
                                                  {formatMpesaAmount(
                                                    total,
                                                    false
                                                  )}
                                                </li>
                                                <li>
                                                  Confirm and enter M-Pesa PIN
                                                </li>
                                              </ol>
                                            </details>
                                            <div className="col-span-2 grid grid-cols-2 gap-2">
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  void checkMpesaStatusNow()
                                                }
                                                className="h-9 rounded-md border border-[#b9d9c0] bg-white text-xs font-bold text-[#176b2c] dark:border-emerald-800 dark:bg-transparent dark:text-emerald-300"
                                              >
                                                Check for payment
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  void findManualPayment()
                                                }
                                                className="h-9 rounded-md border border-[#b9d9c0] bg-white text-xs font-bold text-[#176b2c] dark:border-emerald-800 dark:bg-transparent dark:text-emerald-300"
                                              >
                                                Find payment
                                              </button>
                                            </div>
                                            <div className="col-span-2 border-t border-[#e4ece6] pt-2 dark:border-white/10">
                                              <label className="block text-xs font-semibold text-[#344054] dark:text-[#e4e7ec]">
                                                Payer phone{' '}
                                                <span className="font-normal text-[#667085]">
                                                  (optional)
                                                </span>
                                              </label>
                                              <input
                                                type="tel"
                                                inputMode="tel"
                                                autoComplete="tel"
                                                placeholder="0712 345 678"
                                                value={formatKenyanPhoneInput(
                                                  mpesaPhone
                                                )}
                                                onChange={(event) =>
                                                  setMpesaPhone(
                                                    normalizeKenyanPhoneDraft(
                                                      event.target.value
                                                    )
                                                  )
                                                }
                                                onBlur={() =>
                                                  void saveOptionalManualPhone()
                                                }
                                                className={cn(
                                                  inputCls,
                                                  'mt-1.5 h-10 w-full border-[#dfe5e0] bg-white focus:border-[#11ad2d] focus:ring-[#11ad2d]/10 dark:bg-[#171717]'
                                                )}
                                              />
                                              <p className="mt-1 text-[10px] leading-4 text-[#667085] dark:text-[#b8b8b8]">
                                                Optional. Helps identify the
                                                payment if needed.
                                              </p>
                                            </div>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                void switchMpesaFlow('stk')
                                              }
                                              className="col-span-2 h-9 rounded-md border border-[#dfe5e0] bg-white px-3 text-left text-xs font-semibold text-[#344054] hover:border-[#85d993] hover:text-[#176b2c] dark:border-white/10 dark:bg-transparent dark:text-[#d0d5dd]"
                                            >
                                              ← Back to Safaricom Prompt
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                                {!isOnline && (
                                  <p className="flex items-center gap-1.5 rounded-lg border border-[#fedf89] bg-[#fffaeb] px-3 py-2.5 text-[11px] font-medium text-[#93370d]">
                                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />{' '}
                                    M-Pesa confirmation unavailable. Reconnect,
                                    retry, or choose another payment method.
                                  </p>
                                )}
                                {mpesaFlow === 'paybill' &&
                                  mpesaStatus !== 'idle' && (
                                    <div
                                      className={cn(
                                        'flex min-h-11 items-center gap-2.5 rounded-[7px] px-3 py-2.5 text-xs font-semibold',
                                        mpesaStatus === 'success'
                                          ? 'bg-[#effcf1] text-[#0c4a26] dark:bg-emerald-950/30 dark:text-emerald-300'
                                          : mpesaStatus === 'failed' ||
                                              mpesaStatus === 'timeout' ||
                                              mpesaStatus === 'cancelled'
                                            ? 'bg-[#fef3f2] text-[#b42318] dark:bg-red-950/30 dark:text-red-300'
                                            : 'bg-[#f3fbf5] text-[#246e36] dark:bg-[#12351c] dark:text-emerald-300'
                                      )}
                                      role="status"
                                      aria-live="polite"
                                    >
                                      {mpesaStatus === 'success' ? (
                                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                      ) : mpesaStatus === 'failed' ||
                                        mpesaStatus === 'timeout' ||
                                        mpesaStatus === 'cancelled' ? (
                                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                      ) : (
                                        <Loader2 className="h-4 shrink-0 [--color-1:#00a651]" />
                                      )}
                                      <span>
                                        {mpesaStatus === 'success'
                                          ? `Payment received · ${mpesaRef}`
                                          : mpesaStatus === 'failed' ||
                                              mpesaStatus === 'timeout' ||
                                              mpesaStatus === 'cancelled'
                                            ? mpesaMessage
                                            : 'Awaiting payment confirmation'}
                                      </span>
                                    </div>
                                  )}
                              </div>
                            </div>
                          )}

                          {paymentMethod === 'card' && (
                            <div className="overflow-hidden bg-white dark:bg-[var(--dashboard-surface)]">
                              <div className="flex items-center justify-between border-b border-[#e4e7ec] bg-white px-4 py-4 dark:border-white/10 dark:bg-[var(--dashboard-surface)]">
                                <div className="flex items-center gap-2.5">
                                  <PaymentBrand method="card" compact />
                                  <div>
                                    <p className="text-sm font-bold">
                                      Card payment
                                    </p>
                                    <p className="text-[11px] text-[#667085] dark:text-[#a1a1a6]">
                                      Use the physical terminal, then record its
                                      result
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="block text-[9px] font-bold uppercase tracking-wider text-[#667085]">
                                    Amount to charge
                                  </span>
                                  <strong className="text-base tabular-nums">
                                    {formatCurrency(total)}
                                  </strong>
                                </div>
                              </div>
                              <div className="space-y-3 p-4">
                                <div>
                                  <label className={ui.label}>Terminal</label>
                                  <select
                                    className={cn(inputCls, 'h-10')}
                                    value={selectedCardTerminalId}
                                    disabled={
                                      cardTerminalsLoading ||
                                      cardResult === 'approved' ||
                                      cardRecovery
                                    }
                                    onChange={(event) =>
                                      setSelectedCardTerminalId(
                                        event.target.value
                                      )
                                    }
                                  >
                                    <option value="">
                                      {cardTerminalsLoading
                                        ? 'Loading terminals…'
                                        : 'Select terminal'}
                                    </option>
                                    {cardTerminals.map((terminal) => (
                                      <option
                                        key={terminal.id}
                                        value={terminal.id}
                                      >
                                        {terminal.name} ·{' '}
                                        {terminal.terminalCode}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                {!cardTerminalsLoading &&
                                  cardTerminals.length === 0 && (
                                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                                      <strong>No active terminal</strong>
                                      <p className="mt-1">
                                        Ask a manager to configure a physical
                                        card terminal for this branch.
                                      </p>
                                    </div>
                                  )}
                                {cardResult === 'idle' &&
                                  cardTerminals.length > 0 && (
                                    <div className="grid grid-cols-2 gap-2">
                                      <button
                                        type="button"
                                        disabled={!selectedCardTerminalId}
                                        onClick={() =>
                                          setCardResult('declined')
                                        }
                                        className="h-11 rounded-lg border border-red-200 bg-white text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-500/30 dark:bg-white/5"
                                      >
                                        Declined
                                      </button>
                                      <button
                                        type="button"
                                        disabled={!selectedCardTerminalId}
                                        onClick={() =>
                                          setCardResult('approved')
                                        }
                                        className="h-11 rounded-lg bg-emerald-600 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                                      >
                                        Approved
                                      </button>
                                    </div>
                                  )}
                                {cardResult === 'declined' && (
                                  <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center dark:border-red-500/20 dark:bg-red-500/10">
                                    <AlertTriangle className="mx-auto h-7 w-7 text-red-600" />
                                    <p className="mt-2 text-sm font-bold">
                                      Payment declined
                                    </p>
                                    <p className="mt-1 text-xs text-[#667085] dark:text-[#a1a1a6]">
                                      No payment was recorded. Try the terminal
                                      again or choose another method.
                                    </p>
                                    <div className="mt-3 flex justify-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => setCardResult('idle')}
                                        className="h-9 rounded-lg border bg-white px-3 text-xs font-bold dark:bg-white/5"
                                      >
                                        Try again
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          void switchPaymentMethod('cash')
                                        }
                                        className="h-9 rounded-lg bg-[#f5b800] px-3 text-xs font-bold text-[#241d00]"
                                      >
                                        Choose another method
                                      </button>
                                    </div>
                                  </div>
                                )}
                                {cardResult === 'approved' && (
                                  <>
                                    <div>
                                      <label className={ui.label}>
                                        Authorization code{' '}
                                        <span className="text-[#d92d20]">
                                          *
                                        </span>
                                      </label>
                                      <input
                                        type="text"
                                        maxLength={40}
                                        placeholder="Approval code from terminal"
                                        value={mpesaRef}
                                        disabled={Boolean(cardAttemptId)}
                                        onChange={(event) =>
                                          setMpesaRef(
                                            event.target.value
                                              .toUpperCase()
                                              .replace(/[^A-Z0-9-]/g, '')
                                          )
                                        }
                                        className={cn(inputCls, 'h-10')}
                                      />
                                    </div>
                                    <div>
                                      <label className={ui.label}>
                                        Reference / RRN{' '}
                                        {cardTerminals.find(
                                          (item) =>
                                            item.id === selectedCardTerminalId
                                        )?.referenceRequired ? (
                                          <span className="text-[#d92d20]">
                                            *
                                          </span>
                                        ) : (
                                          <span className="font-normal text-[#98a2b3]">
                                            (optional)
                                          </span>
                                        )}
                                      </label>
                                      <input
                                        type="text"
                                        maxLength={120}
                                        placeholder="Retrieval reference"
                                        value={paymentReceiver}
                                        disabled={Boolean(cardAttemptId)}
                                        onChange={(event) =>
                                          setPaymentReceiver(
                                            event.target.value.toUpperCase()
                                          )
                                        }
                                        className={cn(inputCls, 'h-10')}
                                      />
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                      <select
                                        aria-label="Card brand"
                                        value={cardBrand}
                                        disabled={Boolean(cardAttemptId)}
                                        onChange={(event) =>
                                          setCardBrand(
                                            event.target
                                              .value as typeof cardBrand
                                          )
                                        }
                                        className={cn(
                                          inputCls,
                                          'h-10 px-2 text-xs'
                                        )}
                                      >
                                        <option value="">Brand</option>
                                        <option value="visa">Visa</option>
                                        <option value="mastercard">
                                          Mastercard
                                        </option>
                                        <option value="amex">Amex</option>
                                        <option value="other">Other</option>
                                      </select>
                                      <input
                                        aria-label="Last four digits"
                                        inputMode="numeric"
                                        maxLength={4}
                                        placeholder="Last 4"
                                        value={cardLast4}
                                        disabled={Boolean(cardAttemptId)}
                                        onChange={(event) =>
                                          setCardLast4(
                                            event.target.value
                                              .replace(/\D/g, '')
                                              .slice(0, 4)
                                          )
                                        }
                                        className={cn(
                                          inputCls,
                                          'h-10 px-2 text-xs'
                                        )}
                                      />
                                      <select
                                        aria-label="Entry mode"
                                        value={cardEntryMode}
                                        disabled={Boolean(cardAttemptId)}
                                        onChange={(event) =>
                                          setCardEntryMode(
                                            event.target
                                              .value as typeof cardEntryMode
                                          )
                                        }
                                        className={cn(
                                          inputCls,
                                          'h-10 px-2 text-xs'
                                        )}
                                      >
                                        <option value="">Entry</option>
                                        <option value="chip">Chip</option>
                                        <option value="contactless">Tap</option>
                                        <option value="swipe">Swipe</option>
                                        <option value="manual">Manual</option>
                                      </select>
                                    </div>
                                    <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-[#e4e7ec] bg-[#f9fafb] p-3 text-xs font-semibold text-[#344054] dark:border-white/10 dark:bg-white/5 dark:text-white">
                                      <input
                                        type="checkbox"
                                        checked={cardApproved}
                                        disabled={Boolean(cardAttemptId)}
                                        onChange={(event) =>
                                          setCardApproved(event.target.checked)
                                        }
                                        className="mt-0.5 h-4 w-4 accent-emerald-600"
                                      />
                                      <span>
                                        I confirm the terminal shows APPROVED
                                        <span className="mt-0.5 block text-[10px] font-normal text-[#667085]">
                                          Never enter or store a full card
                                          number, CVV, or PIN.
                                        </span>
                                      </span>
                                    </label>
                                  </>
                                )}
                                {cardRecovery && (
                                  <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
                                    <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                                      Card may already be charged
                                    </p>
                                    <p className="mt-1 text-[11px] text-amber-800 dark:text-amber-300">
                                      Retry saving this sale. Do not charge the
                                      customer again.
                                    </p>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        if (!cardAttemptId) return;
                                        await markCardAttemptForReconciliation(
                                          cardAttemptId
                                        );
                                        setCardRecovery(false);
                                        notify.success(
                                          'Sent to card reconciliation'
                                        );
                                      }}
                                      className="mt-2 text-xs font-bold underline"
                                    >
                                      Send to reconciliation
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {paymentMethod === 'bank_transfer' && (
                            <div className="overflow-hidden bg-white dark:bg-[#171717]">
                              <div className="flex items-center justify-between border-b bg-[#fff7f7] px-3.5 py-3 dark:border-white/10 dark:bg-red-950/15">
                                <div className="flex items-center gap-2.5">
                                  <PaymentBrand
                                    method="bank_transfer"
                                    compact
                                  />
                                  <div>
                                    <p className="text-sm font-bold">
                                      Bank transfer
                                    </p>
                                    <p className="text-[11px] text-[#667085]">
                                      Record the confirmed transfer
                                    </p>
                                  </div>
                                </div>
                                <strong className="text-base tabular-nums">
                                  {formatCurrency(total)}
                                </strong>
                              </div>
                              <div className="space-y-3 p-3.5">
                                <div>
                                  <label className={ui.label}>
                                    Bank transaction reference{' '}
                                    <span className="text-[#d92d20]">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="Enter confirmed bank reference"
                                    value={mpesaRef}
                                    onChange={(event) =>
                                      setMpesaRef(
                                        event.target.value.toUpperCase()
                                      )
                                    }
                                    className={cn(inputCls, 'h-10')}
                                  />
                                </div>
                                <p className="flex items-center gap-2 rounded-lg bg-[#f9fafb] px-3 py-2.5 text-[11px] text-[#667085] dark:bg-white/5">
                                  <ShieldCheck className="h-3.5 w-3.5 text-[#e42527]" />
                                  Verify the funds before completing the sale.
                                </p>
                              </div>
                            </div>
                          )}

                          {paymentMethod === 'airtel_money' && (
                            <div className="overflow-hidden border-t border-[#e4e7ec] bg-white dark:border-[#2c2c2e] dark:bg-[#1c1c1e]">
                              <div className="flex items-center justify-between gap-4 border-b border-[#e4e7ec] bg-white px-4 py-4 dark:border-[#2c2c2e] dark:bg-[#1c1c1e]">
                                <div className="flex min-w-0 items-center gap-2.5">
                                  <span className="flex h-10 w-14 shrink-0 items-center justify-center rounded-[7px] bg-[#ed1c24] px-1.5 shadow-sm">
                                    <Image
                                      src="/payment-logos/airtel-money.svg"
                                      alt="Airtel Money"
                                      width={60}
                                      height={26}
                                      className="h-5 w-auto"
                                    />
                                  </span>
                                  <div>
                                    <p className="text-sm font-bold tracking-tight text-[#273142] dark:text-white">
                                      Airtel Money
                                    </p>
                                    <p className="mt-0.5 text-[11px] text-[#667085] dark:text-[#b3b3b8]">
                                      Record a confirmed merchant payment
                                    </p>
                                  </div>
                                </div>
                                <div className="shrink-0 text-right">
                                  <span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-[#667085] dark:text-[#a1a1a6]">
                                    Amount due
                                  </span>
                                  <strong className="mt-0.5 block text-base font-extrabold tabular-nums text-[#273142] dark:text-white">
                                    {formatCurrency(total)}
                                  </strong>
                                </div>
                              </div>
                              <div className="space-y-3 bg-white p-4 dark:bg-[#1c1c1e]">
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <label className="block text-xs font-semibold text-[#344054] dark:text-[#e4e7ec]">
                                    Airtel Money phone{' '}
                                    <span className="text-[#ed1c24]">*</span>
                                    <input
                                      type="tel"
                                      inputMode="tel"
                                      autoComplete="tel"
                                      value={formatKenyanPhoneInput(
                                        airtelPhone
                                      )}
                                      onChange={(event) =>
                                        setAirtelPhone(
                                          normalizeKenyanPhoneDraft(
                                            event.target.value
                                          )
                                        )
                                      }
                                      placeholder="0733 123 456"
                                      className="mt-2 h-10 w-full rounded-[5px] border border-[#d8dde5] bg-white px-3 text-sm text-[#273142] outline-none focus:border-[#ed1c24] focus:ring-2 focus:ring-[#ed1c24]/10 dark:border-[#3a3a3c] dark:bg-[#242426] dark:text-white"
                                    />
                                  </label>
                                  <label className="block text-xs font-semibold text-[#344054] dark:text-[#e4e7ec]">
                                    Transaction reference
                                    <input
                                      value={mpesaRef}
                                      readOnly
                                      placeholder="Available after confirmation"
                                      maxLength={40}
                                      className="mt-2 h-10 w-full rounded-[5px] border border-[#d8dde5] bg-white px-3 text-sm uppercase text-[#273142] outline-none focus:border-[#ed1c24] focus:ring-2 focus:ring-[#ed1c24]/10 dark:border-[#3a3a3c] dark:bg-[#242426] dark:text-white"
                                    />
                                  </label>
                                </div>
                                <div className="flex items-center gap-2.5 rounded-[7px] bg-[#fff5f5] px-3 py-2.5 text-[11px] leading-5 text-[#7a271a] dark:bg-[#351719] dark:text-[#fda29b]">
                                  {airtelStatus === 'success' ? (
                                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                                  ) : airtelStatus === 'initiating' ||
                                    airtelStatus === 'pending' ? (
                                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#ed1c24]" />
                                  ) : (
                                    <ShieldCheck className="h-4 w-4 shrink-0 text-[#ed1c24]" />
                                  )}
                                  <span>
                                    {airtelStatus === 'success'
                                      ? `Payment confirmed · ${mpesaRef}`
                                      : airtelStatus === 'pending' ||
                                          airtelStatus === 'initiating'
                                        ? airtelMessage ||
                                          'Waiting for customer approval'
                                        : airtelStatus === 'failed'
                                          ? airtelMessage
                                          : 'The customer will receive an Airtel Money approval prompt.'}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    airtelStatus === 'pending'
                                      ? void checkAirtelStatus()
                                      : void sendAirtelPrompt()
                                  }
                                  disabled={
                                    !isOnline ||
                                    airtelStatus === 'initiating' ||
                                    airtelStatus === 'success' ||
                                    !airtelPhone.trim()
                                  }
                                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[7px] bg-[#ed1c24] px-4 text-sm font-bold text-white transition-colors hover:bg-[#cf171e] disabled:cursor-not-allowed disabled:bg-[#e4e7ec] disabled:text-[#98a2b3] dark:disabled:bg-[#3a3a3c]"
                                >
                                  {airtelStatus === 'initiating' && (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  )}
                                  {airtelStatus === 'pending'
                                    ? 'Check payment status'
                                    : airtelStatus === 'success'
                                      ? 'Payment confirmed'
                                      : airtelStatus === 'failed'
                                        ? 'Try Airtel prompt again'
                                        : `Send Airtel Money prompt · ${formatCurrency(total)}`}
                                </button>
                                <details className="group rounded-[7px] border border-[#e4e7ec] bg-white px-3 py-2.5 text-[11px] leading-5 text-[#475467] shadow-sm dark:border-[#3a3a3c] dark:bg-[#242426] dark:text-[#d0d5dd]">
                                  <summary className="flex cursor-pointer list-none items-center justify-between font-bold text-[#273142] dark:text-white">
                                    Payment check{' '}
                                    <ChevronDown className="h-4 w-4 text-[#667085] transition-transform group-open:rotate-180" />
                                  </summary>
                                  <div className="mt-2 border-t border-[#e4e7ec] pt-2 dark:border-[#3a3a3c]">
                                    The customer approves{' '}
                                    <strong>{formatCurrency(total)}</strong> on
                                    their phone. Complete the sale only after
                                    Airtel confirms a transaction reference.
                                  </div>
                                </details>
                              </div>
                            </div>
                          )}

                          {paymentMethod !== 'mpesa' && (
                            <div className="sticky bottom-0 z-20 flex gap-2 border-t border-[#e4e7ec] bg-white p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(16,24,40,.06)] dark:border-white/10 dark:bg-[#171717] sm:p-4 sm:shadow-none">
                              <button
                                type="button"
                                onClick={() => setCheckoutStep('customer')}
                                className="h-[50px] rounded-lg border border-[#d0d5dd] bg-white px-5 text-sm font-semibold text-[#344054] shadow-none transition-colors hover:bg-[#f9fafb]"
                              >
                                Back
                              </button>
                              {(paymentMethod !== 'card' ||
                                cardResult === 'approved') && (
                                <button
                                  type="button"
                                  onClick={() => handleCheckout()}
                                  disabled={
                                    processing ||
                                    cart.length === 0 ||
                                    !hasActiveShift ||
                                    (paymentMethod === 'cash' &&
                                      parseFloat(amountPaid || '0') < total) ||
                                    (paymentMethod === 'card' &&
                                      (!mpesaRef.trim() ||
                                        !cardApproved ||
                                        !selectedCardTerminalId ||
                                        (cardLast4.length > 0 &&
                                          cardLast4.length !== 4) ||
                                        (cardTerminals.find(
                                          (item) =>
                                            item.id === selectedCardTerminalId
                                        )?.referenceRequired &&
                                          !paymentReceiver.trim()))) ||
                                    (paymentMethod === 'airtel_money' &&
                                      !mpesaRef.trim()) ||
                                    (paymentMethod === 'bank_transfer' &&
                                      !mpesaRef.trim()) ||
                                    (paymentMethod === 'credit' &&
                                      (!selectedCustomer || !creditDueDate))
                                  }
                                  className={cn(
                                    'flex min-h-[50px] flex-1 touch-manipulation items-center justify-center gap-2 rounded-lg px-3 text-center text-sm font-bold leading-tight shadow-none transition-colors sm:px-4',
                                    processing ||
                                      cart.length === 0 ||
                                      !hasActiveShift ||
                                      (paymentMethod === 'cash' &&
                                        parseFloat(amountPaid || '0') <
                                          total) ||
                                      (paymentMethod === 'card' &&
                                        (!mpesaRef.trim() ||
                                          !cardApproved ||
                                          !selectedCardTerminalId ||
                                          (cardLast4.length > 0 &&
                                            cardLast4.length !== 4) ||
                                          (cardTerminals.find(
                                            (item) =>
                                              item.id === selectedCardTerminalId
                                          )?.referenceRequired &&
                                            !paymentReceiver.trim()))) ||
                                      (paymentMethod === 'airtel_money' &&
                                        !mpesaRef.trim()) ||
                                      (paymentMethod === 'bank_transfer' &&
                                        !mpesaRef.trim()) ||
                                      (paymentMethod === 'credit' &&
                                        (!selectedCustomer || !creditDueDate))
                                      ? 'cursor-not-allowed !bg-[#e4e7ec] !text-[#667085] shadow-none dark:!bg-white/10 dark:!text-[#8b8b8b]'
                                      : 'hover:bg-[#e2a900]'
                                  )}
                                  style={
                                    processing ||
                                    cart.length === 0 ||
                                    !hasActiveShift
                                      ? undefined
                                      : {
                                          backgroundColor: '#f5b800',
                                          color: '#241d00',
                                        }
                                  }
                                >
                                  {processing ? (
                                    <>
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                      {paymentMethod === 'cash'
                                        ? 'Processing cash sale…'
                                        : paymentMethod === 'card'
                                          ? 'Recording card payment…'
                                          : 'Processing payment…'}
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 className="hidden h-4 w-4" />
                                      {!hasActiveShift
                                        ? 'Start shift to take payment'
                                        : paymentMethod === 'cash'
                                          ? `Complete cash sale · ${formatCurrency(total)}`
                                          : paymentMethod === 'card'
                                            ? `Complete card sale · ${formatCurrency(total)}`
                                            : paymentMethod === 'airtel_money'
                                              ? `Record Airtel payment · ${formatCurrency(total)}`
                                              : `Complete sale · ${formatCurrency(total)}`}
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          )}
                          {paymentMethod === 'mpesa' && (
                            <div className="flex border-t border-[#e4e7ec] p-4 dark:border-white/10">
                              <button
                                type="button"
                                onClick={() => void returnToCustomerStep()}
                                disabled={mpesaStatus === 'success'}
                                className="h-[50px] rounded-lg border border-[#d0d5dd] bg-white px-5 text-sm font-semibold text-[#344054] shadow-none transition-colors hover:bg-[#f9fafb] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-[var(--dashboard-surface-subtle)] dark:text-white"
                              >
                                Back
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </aside>

      {standalone && !checkoutOnly && (
        <nav
          className={cn(
            'fixed inset-x-0 bottom-0 z-40 hidden border-t border-[#e6eaed] bg-white p-2 shadow-[0_-4px_18px_rgba(16,24,40,.08)] dark:border-[var(--dashboard-border)] dark:bg-[var(--dashboard-surface)] dark:shadow-none sm:p-3 lg:block',
            checkoutOpen && 'max-lg:hidden'
          )}
          aria-label="POS register actions"
        >
          <div className="pos-action-scroll mx-auto flex flex-wrap items-center justify-center gap-2 max-sm:flex-nowrap max-sm:justify-start max-sm:overflow-x-auto">
            <button
              type="button"
              onClick={openHoldDialog}
              disabled={
                !canHold || cart.length === 0 || Boolean(heldSaleActionId)
              }
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-[5px] border border-[#E04F16] bg-[#E04F16] px-[0.85rem] py-[0.4rem] text-[0.85rem] font-semibold leading-normal text-white shadow-[0_4px_20px_rgba(224,79,22,0.15)] transition-all duration-500 hover:border-[#BF4313] hover:bg-[#BF4313] hover:shadow-[0_3px_10px_rgba(224,79,22,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E04F16]/40 disabled:cursor-not-allowed disabled:opacity-[0.65]"
            >
              <PauseCircle className="h-4 w-4" />
              Hold
            </button>
            <button
              type="button"
              onClick={openVoidDialog}
              disabled={cart.length === 0}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-[5px] border border-[#155EEF] bg-[#155EEF] px-[0.85rem] py-[0.4rem] text-[0.85rem] font-semibold leading-normal text-white shadow-[0_4px_20px_rgba(21,94,239,0.15)] transition-all duration-300 hover:border-[#0E50D2] hover:bg-[#0E50D2] hover:shadow-[0_3px_10px_rgba(21,94,239,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#155EEF]/40 disabled:cursor-not-allowed disabled:opacity-[0.65]"
            >
              <Trash2 className="h-4 w-4" />
              Void
            </button>
            <button
              type="button"
              onClick={openCheckout}
              disabled={cart.length === 0 || !hasActiveShift}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-[5px] border border-[#06AED4] bg-[#06AED4] px-[0.85rem] py-[0.4rem] text-[0.85rem] font-semibold leading-normal text-white shadow-[0_4px_20px_rgba(6,174,212,0.15)] transition-all duration-500 hover:border-[#0592B1] hover:bg-[#0592B1] hover:shadow-[0_3px_10px_rgba(6,174,212,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#06AED4]/40 disabled:cursor-not-allowed disabled:opacity-[0.65]"
            >
              <WalletCards className="h-4 w-4" />
              Payment
            </button>
            <button
              type="button"
              onClick={openHeldOrders}
              disabled={!canHold || !hasActiveShift}
              title="Open and resume held sales"
              className="relative inline-flex shrink-0 items-center justify-center gap-2 rounded-[5px] border border-[#092C4C] bg-[#092C4C] px-[0.85rem] py-[0.4rem] text-[0.85rem] font-semibold leading-normal text-white shadow-[0_4px_20px_rgba(9,44,76,0.15)] transition-all duration-500 hover:border-[#05192C] hover:bg-[#05192C] hover:shadow-[0_3px_10px_rgba(9,44,76,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#092C4C]/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ShoppingCart className="h-4 w-4" />
              View Orders
              {heldSales.length > 0 && (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-[10px] font-extrabold text-[#092C4C]">
                  {heldSales.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={openResetDialog}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-[5px] border border-[#3538CD] bg-[#3538CD] px-[0.85rem] py-[0.4rem] text-[0.85rem] font-semibold leading-normal text-white shadow-[0_4px_20px_rgba(53,56,205,0.15)] transition-all duration-300 hover:border-[#2C2FB2] hover:bg-[#2C2FB2] hover:shadow-[0_3px_10px_rgba(53,56,205,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3538CD]/40"
            >
              <RefreshCw className="h-4 w-4" />
              Reset
            </button>
            <button
              type="button"
              onClick={() => setShowSalesHistory(true)}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-[5px] border border-[#FF0000] bg-[#FF0000] px-[0.85rem] py-[0.4rem] text-[0.85rem] font-semibold leading-normal text-white shadow-[0_4px_20px_rgba(255,0,0,0.15)] transition-all duration-500 hover:border-[#DB0000] hover:bg-[#DB0000] hover:shadow-[0_3px_10px_rgba(255,0,0,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0000]/40"
            >
              <History className="h-4 w-4" />
              Transaction
            </button>
          </div>
        </nav>
      )}

      {summaryEditor && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="summary-editor-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSummaryEditor(null);
          }}
        >
          <div className="w-full max-w-lg overflow-hidden rounded-[7px] border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] text-[var(--dashboard-text)] shadow-[0_8px_24px_rgba(16,24,40,.16)]">
            <div className="flex h-[58px] items-center justify-between border-b border-[var(--dashboard-border)] px-5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="min-w-0">
                  <h2
                    id="summary-editor-title"
                    className="text-[20px] font-bold leading-6 tracking-tight"
                  >
                    {summaryEditor === 'tax'
                      ? 'Kenya VAT (eTIMS)'
                      : summaryEditor === 'shipping'
                        ? 'Shipping Cost'
                        : summaryEditor === 'coupon'
                          ? 'Coupon Code'
                          : 'Discount'}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSummaryEditor(null)}
                aria-label="Close editor"
                className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ff0000] text-white transition-colors hover:bg-[#db0000] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d92d20]/30"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-[23px]">
              {summaryEditor === 'tax' ? (
                <>
                  <div>
                    <p className="mb-2 block text-sm font-medium text-[#273142] dark:text-[#e4e7ec]">
                      Order VAT
                    </p>
                    <div
                      id="pos-order-tax"
                      className="flex h-10 w-full items-center justify-between rounded-[5px] border border-[#d5d9df] bg-[#f8fafc] px-3 text-sm text-[#273142] dark:border-white/15 dark:bg-[#161616] dark:text-white"
                    >
                      <span>
                        {settings.taxEnabled
                          ? `${settings.taxName || 'VAT'} — ${settings.taxRate.toFixed(1)}%`
                          : 'Non-VAT / VAT disabled'}
                      </span>
                      <span className="rounded bg-[#eaf8f0] px-2 py-0.5 text-[11px] font-semibold text-[#067647] dark:bg-emerald-950/40 dark:text-emerald-300">
                        {settings.taxEnabled
                          ? settings.pricesIncludeTax
                            ? 'Inclusive'
                            : 'Exclusive'
                          : 'Not charged'}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[#667085] dark:text-[#a8a8a8]">
                      {settings.taxEnabled
                        ? `Server-calculated ${settings.taxRate.toFixed(1)}% VAT. Product tax categories are used for the eTIMS invoice.`
                        : 'No VAT is charged. eTIMS invoicing can still apply to non-VAT businesses.'}
                    </p>
                  </div>
                </>
              ) : summaryEditor === 'coupon' ? (
                <>
                  <div>
                    <label
                      htmlFor="pos-coupon-code"
                      className="mb-2 block text-sm font-medium text-[#273142] dark:text-[#e4e7ec]"
                    >
                      Coupon Code <span className="text-[#ff0000]">*</span>
                    </label>
                    <input
                      id="pos-coupon-code"
                      autoFocus
                      value={couponDraftCode}
                      onChange={(event) =>
                        setCouponDraftCode(event.target.value)
                      }
                      placeholder="Enter coupon or approval reference"
                      maxLength={40}
                      className="h-10 w-full rounded-[5px] border border-[#d5d9df] bg-white px-3 text-sm uppercase text-[#273142] outline-none transition-colors placeholder:normal-case placeholder:text-[#98a2b3] focus:border-[#86a5c9] focus:ring-1 focus:ring-[#155eef]/15 dark:border-white/15 dark:bg-[#161616] dark:text-white"
                    />
                  </div>
                  <div className="rounded-[5px] border border-[#d5d9df] bg-[#f8fafc] p-3 text-xs leading-5 text-[#667085] dark:border-white/15 dark:bg-[#161616] dark:text-[#a8a8a8]">
                    The coupon value, validity, minimum spend and usage limit
                    are verified securely from your Promotions settings.
                  </div>
                </>
              ) : summaryEditor === 'shipping' ? (
                <>
                  <div>
                    <label
                      htmlFor="pos-shipping-cost"
                      className="mb-2 block text-sm font-medium text-[#273142] dark:text-[#e4e7ec]"
                    >
                      Shipping Cost <span className="text-[#ff0000]">*</span>
                    </label>
                    <input
                      id="pos-shipping-cost"
                      autoFocus
                      type="number"
                      min="0"
                      step="0.01"
                      value={summaryDraftValue}
                      onChange={(event) =>
                        setSummaryDraftValue(event.target.value)
                      }
                      className="h-10 w-full rounded-[5px] border border-[#d5d9df] bg-white px-3 text-sm tabular-nums text-[#273142] outline-none transition-colors focus:border-[#86a5c9] focus:ring-1 focus:ring-[#155eef]/15 dark:border-white/15 dark:bg-[#161616] dark:text-white"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label
                      htmlFor="pos-discount-type"
                      className="mb-2 block text-sm font-medium text-[#273142] dark:text-[#e4e7ec]"
                    >
                      Order Discount Type{' '}
                      <span className="text-[#ff0000]">*</span>
                    </label>
                    <select
                      id="pos-discount-type"
                      autoFocus
                      value={summaryDraftType}
                      onChange={(event) =>
                        setSummaryDraftType(
                          event.target.value as 'fixed' | 'percentage'
                        )
                      }
                      className="h-10 w-full rounded-[5px] border border-[#d5d9df] bg-white px-3 text-sm text-[#273142] outline-none transition-colors focus:border-[#86a5c9] focus:ring-1 focus:ring-[#155eef]/15 dark:border-white/15 dark:bg-[#161616] dark:text-white"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed amount (KES)</option>
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="pos-discount-value"
                      className="mb-2 block text-sm font-medium text-[#273142] dark:text-[#e4e7ec]"
                    >
                      Value <span className="text-[#ff0000]">*</span>
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs font-semibold text-[#667085]">
                        {summaryDraftType === 'fixed' ? 'KES' : '%'}
                      </span>
                      <input
                        id="pos-discount-value"
                        type="number"
                        min="0"
                        max={
                          summaryDraftType === 'percentage'
                            ? 100
                            : grossBeforeDiscount
                        }
                        step="0.01"
                        value={summaryDraftValue}
                        onChange={(event) =>
                          setSummaryDraftValue(event.target.value)
                        }
                        placeholder={
                          summaryDraftType === 'percentage' ? '0–100' : '0.00'
                        }
                        className="h-10 w-full rounded-[5px] border border-[#d5d9df] bg-white pl-12 pr-3 text-sm tabular-nums text-[#273142] outline-none transition-colors placeholder:text-[#98a2b3] focus:border-[#86a5c9] focus:ring-1 focus:ring-[#155eef]/15 dark:border-white/15 dark:bg-[#161616] dark:text-white"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex min-h-[67px] flex-col-reverse items-center gap-2 border-t border-[var(--dashboard-border)] bg-white px-5 py-3 sm:flex-row sm:justify-end dark:bg-[#161616]">
              <button
                type="button"
                onClick={() => setSummaryEditor(null)}
                className="h-[38px] rounded-[5px] border border-[#092c4c] bg-[#092c4c] px-[13px] text-sm font-semibold text-white transition-colors hover:border-[#05192c] hover:bg-[#05192c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#092c4c]/30"
              >
                Cancel
              </button>
              {summaryEditor === 'tax' ? (
                <button
                  type="button"
                  onClick={() => {
                    setSummaryEditor(null);
                    router.push(
                      '/dashboard/admin/profile#operating-configuration'
                    );
                  }}
                  className="h-[38px] rounded-[5px] border border-[#e94e16] bg-[#e94e16] px-[13px] text-sm font-bold text-white transition-colors hover:border-[#cf3f0b] hover:bg-[#cf3f0b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e94e16]/30"
                >
                  Manage VAT
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void applySummaryAdjustment()}
                  className="h-[38px] rounded-[5px] border border-[#e94e16] bg-[#e94e16] px-[13px] text-sm font-bold text-white transition-colors hover:border-[#cf3f0b] hover:bg-[#cf3f0b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e94e16]/30"
                >
                  Submit
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showAgeVerification && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c111d]/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="age-check-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-[#e4e7ec] bg-white p-6 shadow-[0_20px_60px_rgba(16,24,40,.28)] dark:border-white/10 dark:bg-[#1c1c1e]">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#fffaeb] text-[#93370d] dark:bg-amber-950/30 dark:text-amber-300">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <h2
              id="age-check-title"
              className="mt-4 text-lg font-bold text-[#101828] dark:text-white"
            >
              Age verification required
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#667085] dark:text-[#8b8b8b]">
              Alcohol is included in this sale. Confirm the customer meets the
              required legal age before payment.
            </p>
            <div className="mt-5 space-y-4">
              {canOverrideAgeVerification && (
                <div className="flex rounded-lg border p-1 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setAgeVerificationMode('VERIFIED')}
                    className={cn(
                      'flex-1 rounded-md px-2 py-2',
                      ageVerificationMode === 'VERIFIED' &&
                        'bg-amber-100 text-amber-900'
                    )}
                  >
                    Verify customer
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAgeVerificationMode('OVERRIDDEN');
                      setAgeConfirmed(true);
                    }}
                    className={cn(
                      'flex-1 rounded-md px-2 py-2',
                      ageVerificationMode === 'OVERRIDDEN' &&
                        'bg-amber-100 text-amber-900'
                    )}
                  >
                    Supervisor override
                  </button>
                </div>
              )}
              {ageVerificationMode === 'OVERRIDDEN' ? (
                <div>
                  <label className={ui.label}>Override reason</label>
                  <textarea
                    value={ageOverrideReason}
                    onChange={(event) =>
                      setAgeOverrideReason(event.target.value.slice(0, 500))
                    }
                    className={cn(ui.input, 'min-h-20')}
                    placeholder="Explain why verification is being overridden"
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className={ui.label}>ID type</label>
                    <select
                      value={ageIdType}
                      onChange={(event) =>
                        setAgeIdType(event.target.value as typeof ageIdType)
                      }
                      className={cn(ui.input, 'h-11')}
                    >
                      <option value="national_id">National ID</option>
                      <option value="passport">Passport</option>
                      <option value="driving_licence">Driving licence</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className={ui.label}>
                      ID/reference{' '}
                      <span className="font-normal normal-case">
                        (optional)
                      </span>
                    </label>
                    <input
                      value={ageIdReference}
                      onChange={(event) =>
                        setAgeIdReference(event.target.value.slice(0, 80))
                      }
                      className={cn(ui.input, 'h-11')}
                      placeholder="Reference only — stored masked"
                    />
                  </div>
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#e4e7ec] bg-[#f9fafb] p-3 text-sm font-medium text-[#344054] dark:border-white/10 dark:bg-white/[.04] dark:text-[#d0d5dd]">
                    <input
                      type="checkbox"
                      checked={ageConfirmed}
                      onChange={(event) =>
                        setAgeConfirmed(event.target.checked)
                      }
                      className="mt-0.5 h-4 w-4 accent-[#f2b705]"
                    />
                    <span>
                      I confirm the customer meets the required legal age.
                    </span>
                  </label>
                </>
              )}
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => void dismissAgeVerification()}
                className="min-h-10 rounded-lg border border-[#d0d5dd] px-4 text-sm font-semibold text-[#344054] transition-colors hover:bg-[#f9fafb] dark:border-white/10 dark:text-[#c4c4c4] dark:hover:bg-white/5"
              >
                Cancel check
              </button>
              <button
                ref={ageVerificationConfirmRef}
                type="button"
                onClick={confirmAgeVerification}
                style={{ backgroundColor: ui.primary, color: ui.primaryInk }}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold transition-opacity hover:opacity-90"
              >
                <ShieldCheck className="h-4 w-4" />
                {ageVerificationMode === 'OVERRIDDEN'
                  ? 'Approve override'
                  : 'Verify age'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showResetDialog && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-[#101828]/55 p-4 backdrop-blur-[1px]"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="reset-register-title"
          aria-describedby="reset-register-description"
          onKeyDown={(event) => {
            if (event.key === 'Escape') setShowResetDialog(false);
          }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowResetDialog(false);
          }}
        >
          <div className="w-full max-w-[510px] overflow-hidden rounded-xl border border-[#e4e7ec] bg-white text-[#273142] shadow-[0_24px_70px_rgba(16,24,40,.3)] dark:border-white/10 dark:bg-[#1c1c1e] dark:text-white">
            <div className="flex items-center justify-between border-b border-[#e4e7ec] px-5 py-4 dark:border-white/10">
              <h2 id="reset-register-title" className="text-lg font-bold">
                Reset register
              </h2>
              <button
                type="button"
                onClick={() => setShowResetDialog(false)}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-[#ef1b24] text-white transition-colors hover:bg-[#d9151d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ef1b24]/40"
                aria-label="Close reset register"
              >
                <X className="h-3.5 w-3.5" strokeWidth={3} />
              </button>
            </div>

            <div className="space-y-4 px-5 py-5">
              <div className="flex min-h-24 items-center justify-center gap-4 rounded-xl bg-[#f7f8fa] px-4 dark:bg-white/[.045]">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e94e1b] text-white">
                  <RefreshCw className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-2xl font-bold tabular-nums text-[#273142] dark:text-white">
                    {formatCurrency(total)}
                  </p>
                  <p className="mt-0.5 text-xs text-[#667085] dark:text-[#a8a8a8]">
                    {cart.length} item{cart.length === 1 ? '' : 's'} in the
                    current order
                  </p>
                </div>
              </div>
              <p
                id="reset-register-description"
                className="text-sm leading-6 text-[#667085] dark:text-[#a8a8a8]"
              >
                Resetting returns the POS to a fresh sale and clears the current
                basket, customer, discounts and payment progress.
              </p>
            </div>

            <div className="flex justify-end gap-2 border-t border-[#e4e7ec] px-5 py-3.5 dark:border-white/10">
              <button
                type="button"
                autoFocus
                onClick={() => setShowResetDialog(false)}
                className="h-9 rounded-md bg-[#092c4c] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#061f36]"
              >
                Keep order
              </button>
              <button
                type="button"
                onClick={resetRegister}
                className="h-9 rounded-md bg-[#e94e1b] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#c94015]"
              >
                Reset register
              </button>
            </div>
          </div>
        </div>
      )}

      {showVoidDialog && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-[#101828]/55 p-4 backdrop-blur-[1px]"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="void-order-title"
          aria-describedby="void-order-description"
          onKeyDown={(event) => {
            if (event.key === 'Escape') setShowVoidDialog(false);
          }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowVoidDialog(false);
          }}
        >
          <div className="w-full max-w-[510px] overflow-hidden rounded-xl border border-[#e4e7ec] bg-white text-[#273142] shadow-[0_24px_70px_rgba(16,24,40,.3)] dark:border-white/10 dark:bg-[#1c1c1e] dark:text-white">
            <div className="flex items-center justify-between border-b border-[#e4e7ec] px-5 py-4 dark:border-white/10">
              <h2 id="void-order-title" className="text-lg font-bold">
                Void current order
              </h2>
              <button
                type="button"
                onClick={() => setShowVoidDialog(false)}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-[#ef1b24] text-white transition-colors hover:bg-[#d9151d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ef1b24]/40"
                aria-label="Close void order"
              >
                <X className="h-3.5 w-3.5" strokeWidth={3} />
              </button>
            </div>

            <div className="space-y-4 px-5 py-5">
              <div className="flex min-h-24 items-center justify-center gap-4 rounded-xl bg-[#f7f8fa] px-4 dark:bg-white/[.045]">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e94e1b] text-white">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-2xl font-bold tabular-nums text-[#273142] dark:text-white">
                    {formatCurrency(total)}
                  </p>
                  <p className="mt-0.5 text-xs text-[#667085] dark:text-[#a8a8a8]">
                    {cart.length} item{cart.length === 1 ? '' : 's'} in this
                    order
                  </p>
                </div>
              </div>
              <p
                id="void-order-description"
                className="text-sm leading-6 text-[#667085] dark:text-[#a8a8a8]"
              >
                All items, discounts, coupon details and payment progress will
                be removed. This action cannot be undone.
              </p>
            </div>

            <div className="flex justify-end gap-2 border-t border-[#e4e7ec] px-5 py-3.5 dark:border-white/10">
              <button
                type="button"
                autoFocus
                onClick={() => setShowVoidDialog(false)}
                className="h-9 rounded-md bg-[#092c4c] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#061f36]"
              >
                Keep order
              </button>
              <button
                type="button"
                onClick={voidCurrentSale}
                className="h-9 rounded-md bg-[#e94e1b] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#c94015]"
              >
                Void order
              </button>
            </div>
          </div>
        </div>
      )}

      {showHoldDialog && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-[#101828]/55 p-4 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="hold-order-title"
          onKeyDown={(event) => {
            if (event.key === 'Escape' && !heldSaleActionId)
              setShowHoldDialog(false);
          }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !heldSaleActionId)
              setShowHoldDialog(false);
          }}
        >
          <form
            className="w-full max-w-[510px] overflow-hidden rounded-xl border border-[#e4e7ec] bg-white text-[#273142] shadow-[0_24px_70px_rgba(16,24,40,.3)] dark:border-white/10 dark:bg-[#1c1c1e] dark:text-white"
            onSubmit={(event) => {
              event.preventDefault();
              void holdSale();
            }}
          >
            <div className="flex items-center justify-between border-b border-[#e4e7ec] px-5 py-4 dark:border-white/10">
              <h2 id="hold-order-title" className="text-lg font-bold">
                Hold order
              </h2>
              <button
                type="button"
                disabled={Boolean(heldSaleActionId)}
                onClick={() => setShowHoldDialog(false)}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-[#ef1b24] text-white transition-colors hover:bg-[#d9151d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ef1b24]/40 disabled:opacity-50"
                aria-label="Close hold order"
              >
                <X className="h-3.5 w-3.5" strokeWidth={3} />
              </button>
            </div>

            <div className="space-y-4 px-5 py-5">
              <div className="flex min-h-24 items-center justify-center rounded-xl bg-[#f7f8fa] px-4 dark:bg-white/[.045]">
                <p className="text-4xl font-bold tabular-nums tracking-tight text-[#273142] dark:text-white">
                  {formatCurrency(total)}
                </p>
              </div>
              <p className="text-sm leading-6 text-[#667085] dark:text-[#a8a8a8]">
                This sale will move to the held queue and can be resumed from
                any authorized register at this branch. A reference is created
                automatically for quick retrieval.
              </p>
            </div>

            <div className="flex justify-end gap-2 border-t border-[#e4e7ec] px-5 py-3.5 dark:border-white/10">
              <button
                type="button"
                disabled={Boolean(heldSaleActionId)}
                onClick={() => setShowHoldDialog(false)}
                className="h-9 rounded-md bg-[#092c4c] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#061f36] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={Boolean(heldSaleActionId)}
                className="inline-flex h-9 min-w-24 items-center justify-center gap-2 rounded-md bg-[#e94e1b] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#cf4215] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {heldSaleActionId ? (
                  <>
                    <Loader2 className="h-4 w-4" /> Holding
                  </>
                ) : (
                  'Confirm'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {false && showHeldSales && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-[#101828]/55 p-4 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="held-sales-title"
          onKeyDown={(event) => {
            if (event.key === 'Escape' && !heldSaleActionId)
              setShowHeldSales(false);
          }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !heldSaleActionId)
              setShowHeldSales(false);
          }}
        >
          <div className="w-full max-w-[510px] overflow-hidden rounded-xl border border-[#e4e7ec] bg-white text-[#273142] shadow-[0_24px_70px_rgba(16,24,40,.3)] dark:border-white/10 dark:bg-[#1c1c1e] dark:text-white">
            <div className="flex items-center justify-between border-b border-[#e4e7ec] px-5 py-4 dark:border-white/10">
              <div>
                <h2
                  id="held-sales-title"
                  className="text-lg font-bold text-[#273142] dark:text-white"
                >
                  Held sales
                </h2>
                <p className="mt-0.5 text-xs text-[#667085] dark:text-[#a8a8a8]">
                  Resume or remove orders waiting at this branch
                </p>
              </div>
              <button
                type="button"
                disabled={Boolean(heldSaleActionId)}
                onClick={() => setShowHeldSales(false)}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-[#ef1b24] text-white transition-colors hover:bg-[#d9151d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ef1b24]/40 disabled:opacity-50"
                aria-label="Close held sales"
              >
                <X className="h-3.5 w-3.5" strokeWidth={3} />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-4">
              {heldSalesLoading ? (
                <p className="flex items-center justify-center gap-2 rounded-xl bg-[#f7f8fa] py-12 text-sm text-[#667085] dark:bg-white/[.045] dark:text-[#a8a8a8]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading held sales…
                </p>
              ) : heldSales.length === 0 ? (
                <p className="rounded-xl bg-[#f7f8fa] py-12 text-center text-sm text-[#667085] dark:bg-white/[.045] dark:text-[#a8a8a8]">
                  No held sales
                </p>
              ) : (
                <div className="space-y-3">
                  {heldSales.map((heldSale) => (
                    <div
                      key={heldSale.id}
                      className="flex flex-col gap-3 rounded-xl border border-[#e4e7ec] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,.04)] dark:border-white/10 dark:bg-white/[.035] sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-base font-bold tabular-nums text-[#273142] dark:text-white">
                          {formatCurrency(
                            heldSale.cart.reduce(
                              (sum, item) => sum + item.totalPrice,
                              0
                            )
                          )}
                        </p>
                        <p className="mt-1 text-sm text-[#667085] dark:text-[#a8a8a8]">
                          {heldSale.cart.length} item
                          {heldSale.cart.length === 1 ? '' : 's'}
                        </p>
                        {heldSale.note && (
                          <p className="mt-2 inline-flex max-w-full rounded-md bg-[#f7f8fa] px-2 py-1 text-[11px] font-bold text-[#344054] dark:bg-white/[.07] dark:text-[#e4e7ec]">
                            <span className="truncate">{heldSale.note}</span>
                          </p>
                        )}
                        <p className="mt-2 text-xs text-[#98a2b3] dark:text-[#888]">
                          Held by {heldSale.cashierName} ·{' '}
                          {new Date(heldSale.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          disabled={heldSaleActionId === heldSale.id}
                          onClick={() => void deleteHeldSale(heldSale)}
                          className="h-9 rounded-md bg-[#092c4c] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#061f36] disabled:opacity-50"
                        >
                          Discard
                        </button>
                        <button
                          type="button"
                          disabled={heldSaleActionId === heldSale.id}
                          onClick={() => void resumeHeldSale(heldSale)}
                          className="h-9 rounded-md bg-[#e94e1b] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#cf4215] disabled:opacity-50"
                        >
                          Resume
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {cafeCustomizer?.product.cafe && (
        <div
          className="fixed inset-0 z-[95] grid place-items-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cafe-customizer-title"
          onKeyDown={(event) => {
            if (event.key === 'Escape') setCafeCustomizer(null);
            if (
              event.key === 'Enter' &&
              !event.shiftKey &&
              event.target instanceof HTMLElement &&
              event.target.tagName !== 'TEXTAREA'
            ) {
              event.preventDefault();
              confirmCafeCustomizer();
            }
          }}
        >
          <div className="flex max-h-[90dvh] w-full max-w-[620px] flex-col overflow-hidden rounded-xl border border-[#e4e7ec] bg-white text-[#101828] shadow-2xl dark:border-white/10 dark:bg-[#171717] dark:text-white">
            <div className="flex items-start justify-between border-b border-[#e4e7ec] px-5 py-4 dark:border-white/10">
              <div>
                <h2 id="cafe-customizer-title" className="text-lg font-bold">
                  {cafeCustomizer.product.name}
                </h2>
                <p className="mt-1 text-xs text-[#667085] dark:text-[#a8a8a8]">
                  Choose the size and preparation options for this item.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCafeCustomizer(null)}
                aria-label="Close item choices"
                className="grid h-8 w-8 place-items-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <CompactScrollArea className="min-h-0 flex-1">
              <div className="space-y-6 px-5 py-5">
                {cafeCustomizer.product.packages.length > 0 && (
                  <fieldset>
                    <legend className="mb-2 text-sm font-bold">
                      Size <span className="text-red-500">*</span>
                    </legend>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {cafeCustomizer.product.packages.map((item) => {
                        const availability =
                          cafeCustomizer.product.cafe?.availabilityBySize.find(
                            (row) => row.packageId === item.id
                          );
                        const unavailable = availability
                          ? !availability.available
                          : false;
                        const active = cafeCustomizer.packageId === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            disabled={unavailable}
                            onClick={() =>
                              setCafeCustomizer((current) =>
                                current
                                  ? { ...current, packageId: item.id }
                                  : current
                              )
                            }
                            className={cn(
                              'min-h-14 rounded-lg border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f9b21d]',
                              active
                                ? 'border-[#f9b21d] bg-[#fff5d6] text-[#5f4600] dark:bg-[#3a3016] dark:text-[#ffd166]'
                                : 'border-[#dfe3ea] hover:border-[#f9b21d] dark:border-white/10 dark:bg-white/5',
                              unavailable && 'cursor-not-allowed opacity-40'
                            )}
                          >
                            <span className="block text-sm font-bold">
                              {item.name}
                            </span>
                            <span className="mt-0.5 block text-xs tabular-nums">
                              {formatCurrency(item.sellingPrice)}
                            </span>
                            {unavailable && (
                              <span className="mt-1 block text-[10px]">
                                Ingredient unavailable
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                )}
                {cafeCustomizer.product.cafe.modifierGroups.map((group) => (
                  <fieldset key={group.id}>
                    <legend className="mb-2 flex w-full items-center justify-between gap-3 text-sm font-bold">
                      <span>
                        {group.name}
                        {group.minimumSelections > 0 && (
                          <span className="text-red-500"> *</span>
                        )}
                      </span>
                      <span className="text-[10px] font-medium text-[#667085] dark:text-[#a8a8a8]">
                        {group.minimumSelections
                          ? `Choose ${group.minimumSelections}`
                          : 'Optional'}
                        {group.maximumSelections > 1
                          ? `–${group.maximumSelections}`
                          : ''}
                      </span>
                    </legend>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {group.options.map((option) => {
                        const active = (
                          cafeCustomizer.selected[group.id] ?? []
                        ).includes(option.id);
                        return (
                          <button
                            key={option.id}
                            type="button"
                            aria-pressed={active}
                            onClick={() =>
                              setCafeCustomizer((current) => {
                                if (!current) return current;
                                const existing =
                                  current.selected[group.id] ?? [];
                                const next = active
                                  ? existing.filter((id) => id !== option.id)
                                  : group.selectionType === 'single'
                                    ? [option.id]
                                    : existing.length < group.maximumSelections
                                      ? [...existing, option.id]
                                      : existing;
                                return {
                                  ...current,
                                  selected: {
                                    ...current.selected,
                                    [group.id]: next,
                                  },
                                };
                              })
                            }
                            className={cn(
                              'flex min-h-12 items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f9b21d]',
                              active
                                ? 'border-[#f9b21d] bg-[#fff5d6] font-semibold text-[#5f4600] dark:bg-[#3a3016] dark:text-[#ffd166]'
                                : 'border-[#dfe3ea] hover:border-[#f9b21d] dark:border-white/10 dark:bg-white/5'
                            )}
                          >
                            <span>{option.name}</span>
                            {option.priceAdjustment !== 0 && (
                              <span className="ml-3 text-xs tabular-nums">
                                +{formatCurrency(option.priceAdjustment)}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                ))}
                <label className="grid gap-2 text-sm font-bold">
                  Preparation note{' '}
                  <span className="text-xs font-normal text-[#667085] dark:text-[#a8a8a8]">
                    (optional)
                  </span>
                  <textarea
                    value={cafeCustomizer.notes}
                    onChange={(event) =>
                      setCafeCustomizer((current) =>
                        current
                          ? { ...current, notes: event.target.value }
                          : current
                      )
                    }
                    maxLength={500}
                    rows={2}
                    placeholder="e.g. extra hot"
                    className="resize-none rounded-lg border border-[#dfe3ea] bg-white px-3 py-2 text-sm font-normal outline-none focus:border-[#f9b21d] focus:ring-2 focus:ring-[#f9b21d]/20 dark:border-white/10 dark:bg-[#111]"
                  />
                </label>
              </div>
            </CompactScrollArea>
            <div className="flex items-center justify-end gap-2 border-t border-[#e4e7ec] px-5 py-4 dark:border-white/10">
              <button
                type="button"
                onClick={() => setCafeCustomizer(null)}
                className="h-10 rounded-lg border border-[#d0d5dd] px-4 text-sm font-semibold dark:border-white/15"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmCafeCustomizer}
                className="h-10 rounded-lg bg-[#f9b21d] px-5 text-sm font-bold text-[#241d00] hover:bg-[#e5a20e]"
              >
                {cafeCustomizer.editLineId ? 'Update item' : 'Add to order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showHeldSales && (
        <OrdersModal
          heldSales={heldSales}
          heldSalesLoading={heldSalesLoading}
          actionId={heldSaleActionId}
          onClose={() => setShowHeldSales(false)}
          onResume={(heldSale) => void resumeHeldSale(heldSale)}
          onDiscard={(heldSale) => void deleteHeldSale(heldSale)}
        />
      )}

      {/* Sales History Modal */}
      {showSalesHistory && (
        <SalesHistoryModal
          onClose={() => setShowSalesHistory(false)}
          onSelectSale={
            canRefund
              ? (sale) => {
                  setRefundSale(sale);
                  setShowSalesHistory(false);
                }
              : undefined
          }
        />
      )}

      {/* Receipt Reprint Modal */}
      {showReceiptReprint && (
        <ReceiptReprint
          onClose={() => setShowReceiptReprint(false)}
          settings={settings}
          onRefund={
            canRefund
              ? (sale) => {
                  setRefundSale(sale);
                  setShowReceiptReprint(false);
                }
              : undefined
          }
        />
      )}

      {/* Refund Dialog (from sales history or receipt reprint) */}
      {canRefund && refundSale && (
        <RefundDialog
          sale={refundSale}
          onClose={() => setRefundSale(null)}
          onSuccess={(returnedItems) => {
            setCatalogProducts((current) =>
              current.map((product) => {
                const returned = returnedItems.find(
                  (item) => item.productId === product.id
                );
                return returned
                  ? { ...product, stock: product.stock + returned.quantity }
                  : product;
              })
            );
            setRefundSale(null);
            notify.success('Refund processed successfully');
          }}
        />
      )}
      {showNewCustomer && !checkoutOpen && (
        <div
          className="fixed inset-0 z-[80] grid place-items-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-customer-title"
        >
          <div className="w-full max-w-[815px] overflow-hidden rounded-[7px] border border-[#d5d9df] bg-white text-[#273142] shadow-[0_8px_24px_rgba(16,24,40,.16)] dark:border-white/10 dark:bg-[#171717] dark:text-white">
            <div className="flex h-[58px] items-center justify-between border-b border-[#e4e7ec] px-5 dark:border-white/10">
              <h2
                id="new-customer-title"
                className="text-[20px] font-bold leading-6"
              >
                Create
              </h2>
              <button
                type="button"
                onClick={() => setShowNewCustomer(false)}
                aria-label="Close"
                className="flex h-5 w-5 items-center justify-center rounded-full bg-[#ff0000] text-white transition-colors hover:bg-[#db0000] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff0000]/30"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            <div className="grid gap-x-6 gap-y-4 px-5 py-[23px] sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                <span>
                  {cafeMode ? 'Guest name' : 'Customer Name'}{' '}
                  <span className="text-[#ff0000]">*</span>
                </span>
                <input
                  autoFocus
                  required
                  type="text"
                  value={newCustomerName}
                  onChange={(event) => setNewCustomerName(event.target.value)}
                  className="h-10 rounded-[5px] border border-[#d5d9df] bg-white px-3 text-sm outline-none transition-colors focus:border-[#86a5c9] focus:ring-1 focus:ring-[#155eef]/15 disabled:opacity-60 dark:border-white/15 dark:bg-[#161616]"
                  disabled={creatingCustomer}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                <span>
                  Phone <span className="text-[#ff0000]">*</span>
                </span>
                <input
                  required
                  type="tel"
                  inputMode="tel"
                  value={newCustomerPhone}
                  onChange={(event) => setNewCustomerPhone(event.target.value)}
                  className="h-10 rounded-[5px] border border-[#d5d9df] bg-white px-3 text-sm outline-none transition-colors focus:border-[#86a5c9] focus:ring-1 focus:ring-[#155eef]/15 disabled:opacity-60 dark:border-white/15 dark:bg-[#161616]"
                  disabled={creatingCustomer}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium sm:col-span-2">
                <span>Email</span>
                <input
                  type="email"
                  value={newCustomerEmail}
                  onChange={(event) => setNewCustomerEmail(event.target.value)}
                  className="h-10 rounded-[5px] border border-[#d5d9df] bg-white px-3 text-sm outline-none transition-colors focus:border-[#86a5c9] focus:ring-1 focus:ring-[#155eef]/15 disabled:opacity-60 dark:border-white/15 dark:bg-[#161616]"
                  disabled={creatingCustomer}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium sm:col-span-2">
                <span>Address</span>
                <input
                  type="text"
                  value={newCustomerAddress}
                  onChange={(event) =>
                    setNewCustomerAddress(event.target.value)
                  }
                  className="h-10 rounded-[5px] border border-[#d5d9df] bg-white px-3 text-sm outline-none transition-colors focus:border-[#86a5c9] focus:ring-1 focus:ring-[#155eef]/15 disabled:opacity-60 dark:border-white/15 dark:bg-[#161616]"
                  disabled={creatingCustomer}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                <span>City</span>
                <input
                  type="text"
                  value={newCustomerCity}
                  onChange={(event) => setNewCustomerCity(event.target.value)}
                  className="h-10 rounded-[5px] border border-[#d5d9df] bg-white px-3 text-sm outline-none transition-colors focus:border-[#86a5c9] focus:ring-1 focus:ring-[#155eef]/15 disabled:opacity-60 dark:border-white/15 dark:bg-[#161616]"
                  disabled={creatingCustomer}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                <span>Country</span>
                <input
                  type="text"
                  value={newCustomerCountry}
                  onChange={(event) =>
                    setNewCustomerCountry(event.target.value)
                  }
                  className="h-10 rounded-[5px] border border-[#d5d9df] bg-white px-3 text-sm outline-none transition-colors focus:border-[#86a5c9] focus:ring-1 focus:ring-[#155eef]/15 disabled:opacity-60 dark:border-white/15 dark:bg-[#161616]"
                  disabled={creatingCustomer}
                />
              </label>
            </div>
            <div className="flex min-h-[67px] items-center justify-end gap-2 border-t border-[#e4e7ec] bg-white px-5 py-3 dark:border-white/10 dark:bg-[#171717]">
              <button
                type="button"
                onClick={() => setShowNewCustomer(false)}
                className="h-[38px] rounded-[5px] border border-[#092c4c] bg-[#092c4c] px-[13px] text-sm font-semibold text-white transition-colors hover:bg-[#05192c]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateCustomer}
                disabled={
                  creatingCustomer ||
                  !newCustomerName.trim() ||
                  !newCustomerPhone.trim()
                }
                className="h-[38px] rounded-[5px] border border-[#e94e16] bg-[#e94e16] px-[13px] text-sm font-bold text-white transition-colors hover:bg-[#cf3f0b] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creatingCustomer ? 'Creating…' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
      <AlertDialog
        open={mpesaExitConfirmation.open}
        onOpenChange={(open) => {
          if (!mpesaExitConfirmation.busy)
            setMpesaExitConfirmation((current) => ({ ...current, open }));
        }}
      >
        <AlertDialogContent className="w-[calc(100%_-_2rem)] max-w-[480px] gap-0 overflow-hidden rounded-[7px] border border-[#e4e7ec] !bg-white px-7 py-8 !text-[#273142] opacity-100 shadow-[0_20px_55px_rgba(16,24,40,.28)] dark:border-[#2c2c2e] dark:!bg-[#1c1c1e] dark:!text-white sm:px-9">
          <AlertDialogHeader className="items-center space-y-0 text-center sm:text-center">
            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#fdb022] text-white shadow-[0_4px_12px_rgba(253,176,34,.22)] dark:bg-[#f59e0b]">
              <AlertTriangle className="h-6 w-6" strokeWidth={2.25} />
            </span>
            <AlertDialogTitle className="text-[19px] font-bold leading-7 tracking-[-0.01em]">
              Cancel M-Pesa payment?
            </AlertDialogTitle>
            <AlertDialogDescription className="mt-1.5 max-w-[380px] text-center text-[13px] leading-5 !text-[#667085] dark:!text-[#b3b3b8]">
              Switch to{' '}
              <strong className="text-[#273142] dark:text-white">
                {mpesaExitConfirmation.destination}
              </strong>{' '}
              and cancel the pending payment of{' '}
              <strong className="text-[#273142] dark:text-white">
                {formatMpesaAmount(total)}
              </strong>
              ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 flex-row justify-center space-x-2 sm:justify-center">
            <AlertDialogCancel
              disabled={mpesaExitConfirmation.busy}
              className="mt-0 h-9 rounded-[5px] border-[#092c4c] bg-[#092c4c] px-4 text-xs font-semibold text-white hover:border-[#05192c] hover:bg-[#05192c] hover:text-white dark:border-[#092c4c] dark:bg-[#092c4c]"
            >
              Keep waiting
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={mpesaExitConfirmation.busy}
              onClick={(event) => {
                event.preventDefault();
                void confirmMpesaExit();
              }}
              className="h-9 gap-2 rounded-[5px] bg-[#e94e16] px-4 text-xs font-semibold text-white hover:bg-[#cf3f0b]"
            >
              {mpesaExitConfirmation.busy && <Loader2 className="h-4 w-4" />}
              Cancel &amp; switch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
