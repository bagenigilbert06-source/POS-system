/**
 * Shared Constants
 * Application-wide constants and configurations
 */

export const APP_NAME = 'IMARA POS';
export const APP_DESCRIPTION = 'Enterprise SaaS Business Operating System';

// Payment Methods
export const PAYMENT_METHODS = {
  CASH: 'cash',
  CARD: 'card',
  MPESA: 'mpesa',
  CHECK: 'check',
  CREDIT: 'credit',
} as const;

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  mpesa: 'M-Pesa',
  check: 'Check',
  credit: 'Credit',
};

// Sale Status
export const SALE_STATUS = {
  COMPLETED: 'completed',
  PENDING: 'pending',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
} as const;

export const SALE_STATUS_LABELS: Record<string, string> = {
  completed: 'Completed',
  pending: 'Pending',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

// Order Status
export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  COOKING: 'cooking',
  READY: 'ready',
  SERVED: 'served',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  cooking: 'Cooking',
  ready: 'Ready',
  served: 'Served',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

// Table Status
export const TABLE_STATUS = {
  AVAILABLE: 'available',
  OCCUPIED: 'occupied',
  RESERVED: 'reserved',
  DIRTY: 'dirty',
} as const;

export const TABLE_STATUS_LABELS: Record<string, string> = {
  available: 'Available',
  occupied: 'Occupied',
  reserved: 'Reserved',
  dirty: 'Dirty',
};

// Prescription Status
export const PRESCRIPTION_STATUS = {
  PENDING: 'pending',
  DISPENSED: 'dispensed',
  PARTIAL: 'partial',
  CANCELLED: 'cancelled',
} as const;

export const PRESCRIPTION_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  dispensed: 'Dispensed',
  partial: 'Partial',
  cancelled: 'Cancelled',
};

// Business Size
export const BUSINESS_SIZES = {
  SOLO: 'solo',
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large',
} as const;

export const BUSINESS_SIZE_LABELS: Record<string, string> = {
  solo: 'Solo (Just me)',
  small: 'Small (2-5 employees)',
  medium: 'Medium (6-20 employees)',
  large: 'Large (20+ employees)',
};

// Currency
export const DEFAULT_CURRENCY = 'KES';
export const SUPPORTED_CURRENCIES = ['KES', 'USD', 'EUR', 'GBP', 'UGX', 'TZS'];

// Timezone
export const DEFAULT_TIMEZONE = 'Africa/Nairobi';
export const SUPPORTED_TIMEZONES = [
  'Africa/Nairobi',
  'Africa/Kampala',
  'Africa/Dar_es_Salaam',
  'UTC',
  'Europe/London',
  'America/New_York',
];

// Pagination
export const DEFAULT_PAGE_SIZE = 25;
export const PAGE_SIZES = [10, 25, 50, 100];

// Date Formats
export const DATE_FORMAT = 'MMM dd, yyyy';
export const TIME_FORMAT = 'HH:mm';
export const DATETIME_FORMAT = 'MMM dd, yyyy HH:mm';

// API
export const API_TIMEOUT = 30000; // 30 seconds
export const API_RETRY_ATTEMPTS = 3;

// Cache
export const CACHE_DURATION = {
  SHORT: 60 * 1000, // 1 minute
  MEDIUM: 5 * 60 * 1000, // 5 minutes
  LONG: 30 * 60 * 1000, // 30 minutes
  VERY_LONG: 24 * 60 * 60 * 1000, // 24 hours
} as const;

// Stock Levels
export const STOCK_LEVELS = {
  OUT_OF_STOCK: 0,
  LOW_STOCK_THRESHOLD: 10,
  MEDIUM_STOCK_THRESHOLD: 50,
  HIGH_STOCK_THRESHOLD: 100,
} as const;

// Routes
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  ONBOARDING: '/onboarding',
  DASHBOARD: '/dashboard',
  DASHBOARD_RETAIL: '/dashboard/retail',
  DASHBOARD_RESTAURANT: '/dashboard/restaurant',
  DASHBOARD_PHARMACY: '/dashboard/pharmacy',
  PRODUCTS: '/products',
  SALES: '/sales',
  ORDERS: '/orders',
  CUSTOMERS: '/customers',
  REPORTS: '/reports',
  SETTINGS: '/settings',
  INVENTORY: '/inventory',
  TABLES: '/tables',
  KITCHEN: '/kitchen',
  PRESCRIPTIONS: '/prescriptions',
} as const;

// UI
export const TOAST_DURATION = 3000; // 3 seconds
export const SIDEBAR_WIDTH = 280;
export const SIDEBAR_COLLAPSED_WIDTH = 80;
export const MOBILE_BREAKPOINT = 768; // md in Tailwind

// Validation
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PRODUCT_NAME_LENGTH = 255;
export const MAX_DESCRIPTION_LENGTH = 1000;

// Feature Flags (for future expansion)
export const FEATURE_FLAGS = {
  ENABLE_ADVANCED_ANALYTICS: true,
  ENABLE_LOYALTY_PROGRAM: true,
  ENABLE_MULTI_BRANCH: false, // Coming soon
  ENABLE_INVOICE_PRINTING: true,
  ENABLE_CUSTOMER_PORTAL: false, // Coming soon
} as const;
