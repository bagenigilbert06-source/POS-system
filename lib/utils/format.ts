/**
 * Formatting Utilities
 * Centralized formatting functions for dates, numbers, currency, etc.
 */

import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { DATE_FORMAT, TIME_FORMAT, DATETIME_FORMAT } from '../constants';

/**
 * Format date to readable string
 */
export function formatDate(date: Date | string): string {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  return format(parsedDate, DATE_FORMAT);
}

/**
 * Format time to readable string
 */
export function formatTime(date: Date | string): string {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  return format(parsedDate, TIME_FORMAT);
}

/**
 * Format datetime to readable string
 */
export function formatDateTime(date: Date | string): string {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  return format(parsedDate, DATETIME_FORMAT);
}

/**
 * Format date relative to now (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(parsedDate, { addSuffix: true });
}

/**
 * Format currency with symbol
 */
export function formatCurrency(amount: number, currency: string = 'KES'): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatter.format(amount);
}

/**
 * Format number with thousand separators
 */
export function formatNumber(value: number, fractionDigits: number = 0): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format large numbers as abbreviations (1.2K, 3.5M, etc.)
 */
export function formatCompactNumber(value: number): string {
  const units = ['', 'K', 'M', 'B', 'T'];
  let unitIndex = 0;
  let num = value;

  while (num >= 1000 && unitIndex < units.length - 1) {
    num /= 1000;
    unitIndex++;
  }

  const decimals = num >= 100 ? 0 : num >= 10 ? 1 : 2;
  return `${num.toFixed(decimals)}${units[unitIndex]}`;
}

/**
 * Format phone number
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

/**
 * Format file size (KB, MB, GB)
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format duration in minutes to readable format (e.g., "1h 30m")
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Format SKU with checksum or custom format
 */
export function formatSku(sku: string): string {
  return sku.toUpperCase().replace(/\s/g, '');
}

/**
 * Truncate string with ellipsis
 */
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

/**
 * Capitalize first letter
 */
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Format enum value to readable string (e.g., "pending_order" -> "Pending Order")
 */
export function formatEnumValue(value: string): string {
  return value
    .split('_')
    .map((word) => capitalize(word))
    .join(' ');
}

/**
 * Format status badge text
 */
export function formatStatusText(status: string): string {
  return status
    .split('_')
    .map((word) => capitalize(word))
    .join(' ');
}
