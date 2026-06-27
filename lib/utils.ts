import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string, currency = 'KES'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(num);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function generateReceiptNo(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `RCP-${year}${month}${day}-${random}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export const generatePagination = (currentPage: number, totalPages: number) => {
  const pagination: (number | string)[] = [];
  const pageRange = 2;

  if (totalPages <= 3) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  pagination.push(1);

  if (currentPage > pageRange + 2) {
    pagination.push('...');
  }

  for (
    let i = Math.max(2, currentPage - pageRange);
    i <= Math.min(totalPages - 1, currentPage + pageRange);
    i++
  ) {
    pagination.push(i);
  }

  if (currentPage < totalPages - pageRange - 1) {
    pagination.push('...');
  }

  pagination.push(totalPages);

  return pagination;
};
