/**
 * Domain Entity Types
 * Core business entities with strong typing
 */

import { BusinessTypeEnum } from './business';

// Organization
export interface Organization {
  id: string;
  name: string;
  slug: string;
  businessType: BusinessTypeEnum;
  userId: string;
  currency: string;
  taxRate: number;
  onboardingCompleted: boolean;
  onboardingStep: number;
  businessEmail?: string;
  country?: string;
  timezone: string;
  businessSize?: 'solo' | 'small' | 'medium' | 'large';
  businessDescription?: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Product & Inventory
export interface Product {
  id: string;
  orgId: string;
  userId: string;
  name: string;
  sku?: string;
  barcode?: string;
  description?: string;
  categoryId?: string;
  buyingPrice: number;
  sellingPrice: number;
  stock: number;
  minStock: number;
  unit: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  orgId: string;
  userId: string;
  name: string;
  description?: string;
  createdAt: Date;
}

// Sales & Transactions
export interface Sale {
  id: string;
  orgId: string;
  userId: string;
  receiptNo: string;
  customerId?: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'mpesa' | 'check' | 'credit';
  mpesaRef?: string;
  status: 'completed' | 'pending' | 'cancelled' | 'refunded';
  createdAt: Date;
}

export interface SaleItem {
  id: string;
  saleId: string;
  orgId: string;
  userId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Expense {
  id: string;
  orgId: string;
  userId: string;
  title: string;
  amount: number;
  category: string;
  notes?: string;
  createdAt: Date;
}

// Customers
export interface Customer {
  id: string;
  orgId: string;
  userId: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  loyaltyPoints: number;
  createdAt: Date;
  updatedAt: Date;
}

// Restaurant Specific
export interface Table {
  id: string;
  orgId: string;
  tableNumber: number;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved' | 'dirty';
  currentOrderId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  id: string;
  orgId: string;
  userId: string;
  tableId?: string;
  customerId?: string;
  status: 'pending' | 'confirmed' | 'cooking' | 'ready' | 'served' | 'completed' | 'cancelled';
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  specialInstructions?: string;
  status: 'pending' | 'cooking' | 'ready' | 'served';
}

// Pharmacy Specific
export interface Prescription {
  id: string;
  orgId: string;
  customerId: string;
  prescriptionNo: string;
  doctorName?: string;
  medicines: PrescriptionMedicine[];
  status: 'pending' | 'dispensed' | 'partial' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

export interface PrescriptionMedicine {
  id: string;
  prescriptionId: string;
  medicineId: string;
  medicineName: string;
  quantity: number;
  dosage?: string;
  instructions?: string;
  dispensedQuantity: number;
}

export interface BatchTracking {
  id: string;
  productId: string;
  orgId: string;
  batchNumber: string;
  expiryDate: Date;
  quantity: number;
  purchaseDate: Date;
  supplier?: string;
  createdAt: Date;
}

// Dashboard Statistics
export interface DashboardStats {
  todaysSales: number;
  todaysTransactions: number;
  todaysProfit: number;
  lastWeekSales: number;
  monthlyRevenue: number;
  averageOrderValue: number;
  conversionRate: number;
  topProduct?: {
    name: string;
    quantity: number;
    revenue: number;
  };
  topCustomer?: {
    name: string;
    totalSpent: number;
  };
}

export interface InventoryStats {
  totalProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalValue: number;
  averageStockTurnover: number;
}

export interface SalesMetrics {
  totalSales: number;
  totalRevenue: number;
  averageOrderValue: number;
  totalTransactions: number;
  averageTransactionValue: number;
  topPaymentMethod: string;
}
