/**
 * Core Interfaces
 * Abstract definitions for services, repositories, and utilities
 */

import type {
  Product,
  Customer,
  Sale,
  Order,
  Prescription,
  Organization,
  DashboardStats,
} from '../types';

// Repository Pattern
export interface IRepository<T> {
  findById(id: string): Promise<T | null>;
  findAll(filters?: any): Promise<T[]>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

// Product Service
export interface IProductService {
  getProductById(id: string, orgId: string): Promise<Product | null>;
  getProductsByOrg(orgId: string): Promise<Product[]>;
  getLowStockProducts(orgId: string): Promise<Product[]>;
  getProductsByCategory(categoryId: string, orgId: string): Promise<Product[]>;
  createProduct(data: Partial<Product>, orgId: string): Promise<Product>;
  updateProduct(id: string, data: Partial<Product>, orgId: string): Promise<Product>;
  deleteProduct(id: string, orgId: string): Promise<void>;
  updateStock(productId: string, quantity: number, orgId: string): Promise<void>;
}

// Inventory Service
export interface IInventoryService {
  getInventorySummary(orgId: string): Promise<any>;
  adjustStock(productId: string, quantity: number, reason: string, orgId: string): Promise<void>;
  transferStock(fromProductId: string, toProductId: string, quantity: number, orgId: string): Promise<void>;
  getInventoryHistory(productId: string, orgId: string): Promise<any[]>;
}

// Sales Service
export interface ISalesService {
  createSale(data: Partial<Sale>, items: any[], orgId: string): Promise<Sale>;
  getSaleById(id: string, orgId: string): Promise<Sale | null>;
  getSalesByOrg(orgId: string, filters?: any): Promise<Sale[]>;
  refundSale(saleId: string, orgId: string): Promise<Sale>;
  getSalesMetrics(orgId: string, startDate: Date, endDate: Date): Promise<any>;
}

// Customer Service
export interface ICustomerService {
  getCustomerById(id: string, orgId: string): Promise<Customer | null>;
  getCustomersByOrg(orgId: string): Promise<Customer[]>;
  createCustomer(data: Partial<Customer>, orgId: string): Promise<Customer>;
  updateCustomer(id: string, data: Partial<Customer>, orgId: string): Promise<Customer>;
  addLoyaltyPoints(customerId: string, points: number, orgId: string): Promise<void>;
  getTopCustomers(orgId: string, limit: number): Promise<Customer[]>;
}

// Order Service (Restaurant)
export interface IOrderService {
  createOrder(data: Partial<Order>, orgId: string): Promise<Order>;
  getOrderById(id: string, orgId: string): Promise<Order | null>;
  getOrdersByOrg(orgId: string, filters?: any): Promise<Order[]>;
  updateOrderStatus(orderId: string, status: string, orgId: string): Promise<Order>;
  getKitchenQueue(orgId: string): Promise<Order[]>;
  updateItemStatus(itemId: string, status: string, orgId: string): Promise<void>;
}

// Prescription Service (Pharmacy)
export interface IPrescriptionService {
  createPrescription(data: Partial<Prescription>, orgId: string): Promise<Prescription>;
  getPrescriptionById(id: string, orgId: string): Promise<Prescription | null>;
  getPrescriptionsByOrg(orgId: string, filters?: any): Promise<Prescription[]>;
  dispensePrescription(prescriptionId: string, items: any[], orgId: string): Promise<Prescription>;
  getPendingPrescriptions(orgId: string): Promise<Prescription[]>;
}

// Dashboard Service
export interface IDashboardService {
  getDashboardStats(orgId: string, startDate?: Date, endDate?: Date): Promise<DashboardStats>;
  getRecentSales(orgId: string, limit: number): Promise<Sale[]>;
  getChartData(orgId: string, metric: string, period: string): Promise<any>;
  getAlerts(orgId: string): Promise<any[]>;
  getTopProducts(orgId: string, limit: number): Promise<Product[]>;
}

// Report Service
export interface IReportService {
  generateSalesReport(orgId: string, startDate: Date, endDate: Date): Promise<any>;
  generateInventoryReport(orgId: string): Promise<any>;
  generateCustomerReport(orgId: string): Promise<any>;
  exportReport(reportId: string, format: 'pdf' | 'csv' | 'xlsx'): Promise<Buffer>;
}

// Permission Service
export interface IPermissionService {
  checkPermission(userId: string, orgId: string, permission: string): Promise<boolean>;
  hasAnyPermission(userId: string, orgId: string, permissions: string[]): Promise<boolean>;
  hasAllPermissions(userId: string, orgId: string, permissions: string[]): Promise<boolean>;
  getUserPermissions(userId: string, orgId: string): Promise<string[]>;
}

// Notification Service
export interface INotificationService {
  sendNotification(userId: string, title: string, message: string, type: string): Promise<void>;
  sendBulkNotification(userIds: string[], title: string, message: string): Promise<void>;
  getNotifications(userId: string, limit: number): Promise<any[]>;
  markAsRead(notificationId: string): Promise<void>;
}

// Analytics Service
export interface IAnalyticsService {
  trackEvent(event: string, data: any, orgId: string): Promise<void>;
  getAnalytics(orgId: string, metric: string, period: string): Promise<any>;
  getCustomMetric(orgId: string, query: string): Promise<any>;
}

// Business Service
export interface IBusinessService {
  getBusinessConfig(businessType: string): Promise<any>;
  getAvailableModules(businessType: string): Promise<string[]>;
  getAvailableFeatures(businessType: string): Promise<string[]>;
}

// Database Service
export interface IDatabaseService {
  query<T>(sql: string, params?: any[]): Promise<T[]>;
  queryOne<T>(sql: string, params?: any[]): Promise<T | null>;
  execute(sql: string, params?: any[]): Promise<{ rowCount: number }>;
  transaction<T>(callback: () => Promise<T>): Promise<T>;
}

// Cache Service
export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  exists(key: string): Promise<boolean>;
}

// Email Service
export interface IEmailService {
  sendEmail(to: string, subject: string, html: string): Promise<void>;
  sendBulkEmail(recipients: string[], subject: string, html: string): Promise<void>;
  sendTemplatedEmail(to: string, template: string, data: any): Promise<void>;
}

// File Service
export interface IFileService {
  uploadFile(file: File, path: string): Promise<string>;
  deleteFile(path: string): Promise<void>;
  getFileUrl(path: string): Promise<string>;
  listFiles(directory: string): Promise<string[]>;
}
