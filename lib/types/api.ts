/**
 * API Response Types
 * Standardized response formats for all API calls
 */

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
}

export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  INTERNAL_SERVER_ERROR = 500,
}

export interface DashboardFilters {
  startDate?: Date;
  endDate?: Date;
  businessTypeFilter?: string;
  paymentMethodFilter?: string;
  statusFilter?: string;
  searchQuery?: string;
  page?: number;
  pageSize?: number;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  displayValue?: string;
}

export interface TimeSeriesData {
  timestamps: string[];
  values: number[];
  labels: string[];
}
