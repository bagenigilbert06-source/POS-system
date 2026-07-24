import { db } from '@/lib/db'
import { sale, saleItem, customer, product } from '@/lib/db/schema'
import { eq, gte, lte, sql, desc, and } from 'drizzle-orm'

interface TrendData {
  date: string
  revenue: number
  transactions: number
}

interface CohortData {
  period: string
  newCustomers: number
  retained: number
  churn: number
  retention: number
}

interface RepeatData {
  visits: string
  count: number
  percentage: number
}

interface ProductPerf {
  id: string
  name: string
  revenue: number
  units: number
  trend: 'up' | 'down' | 'stable'
  margin: number
}

interface StaffKPI {
  id: string
  name: string
  totalSales: number
  transactions: number
  avgSale: number
  ranking: number
  topPerformer?: boolean
}

interface HourlyData {
  hour: string
  sales: number
  transactions: number
}

interface ForecastData {
  date: string
  actual?: number
  forecast: number
  confidence: 'high' | 'medium' | 'low'
}

interface AnalyticsData {
  trendData: TrendData[]
  cohortData: CohortData[]
  repeatData: RepeatData[]
  productData: ProductPerf[]
  staffData: StaffKPI[]
  hourlyData: HourlyData[]
  forecastData: ForecastData[]
}

/**
 * Generate mock trend data for the last 30 days
 */
function generateMockTrendData(): TrendData[] {
  const data: TrendData[] = []
  for (let i = 29; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const baseRevenue = 50000 + Math.random() * 30000
    const variance = Math.sin(i / 10) * 10000
    data.push({
      date: date.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' }),
      revenue: Math.round(baseRevenue + variance),
      transactions: Math.floor(5 + Math.random() * 8),
    })
  }
  return data
}

/**
 * Generate mock customer cohort data
 */
function generateMockCohortData(): CohortData[] {
  return [
    { period: 'Jan 2025', newCustomers: 42, retained: 35, churn: 7, retention: 83 },
    { period: 'Feb 2025', newCustomers: 58, retained: 46, churn: 12, retention: 79 },
    { period: 'Mar 2025', newCustomers: 67, retained: 52, churn: 15, retention: 78 },
  ]
}

/**
 * Generate mock repeat customer data
 */
function generateMockRepeatData(): RepeatData[] {
  return [
    { visits: '1 visit', count: 142, percentage: 45 },
    { visits: '2-5 visits', count: 98, percentage: 31 },
    { visits: '6-10 visits', count: 55, percentage: 17 },
    { visits: '10+ visits', count: 30, percentage: 7 },
  ]
}

/**
 * Generate mock product performance data
 */
function generateMockProductData(): ProductPerf[] {
  return [
    { id: '1', name: 'Premium Milk (1L)', revenue: 285000, units: 450, trend: 'up', margin: 15 },
    { id: '2', name: 'Bread Loaf (24 slices)', revenue: 198000, units: 620, trend: 'up', margin: 18 },
    { id: '3', name: 'Sugar (1kg)', revenue: 165000, units: 330, trend: 'stable', margin: 12 },
    { id: '4', name: 'Cooking Oil (1L)', revenue: 142000, units: 284, trend: 'down', margin: 16 },
    { id: '5', name: 'Eggs (12pc)', revenue: 128000, units: 256, trend: 'up', margin: 20 },
  ]
}

/**
 * Generate mock staff KPI data
 */
function generateMockStaffData(): StaffKPI[] {
  return [
    { id: '1', name: 'Alice K.', totalSales: 450000, transactions: 67, avgSale: 6716, ranking: 1, topPerformer: true },
    { id: '2', name: 'John M.', totalSales: 428000, transactions: 64, avgSale: 6688, ranking: 2, topPerformer: false },
    { id: '3', name: 'Sarah L.', totalSales: 398000, transactions: 61, avgSale: 6525, ranking: 3, topPerformer: false },
    { id: '4', name: 'James B.', totalSales: 372000, transactions: 58, avgSale: 6414, ranking: 4, topPerformer: false },
  ]
}

/**
 * Generate mock hourly sales pattern data
 */
function generateMockHourlyData(): HourlyData[] {
  const hours = Array.from({ length: 24 }, (_, i) => i)
  return hours.map((hour) => {
    const formatted = `${String(hour).padStart(2, '0')}:00`
    // Business hours (9-18) have higher sales
    const isBusiness = hour >= 9 && hour <= 18
    const baseSales = isBusiness ? 20000 : 8000
    const variance = (Math.random() - 0.5) * 5000
    return {
      hour: formatted,
      sales: Math.round(baseSales + variance),
      transactions: Math.floor((isBusiness ? 3 : 1) + Math.random() * 2),
    }
  })
}

/**
 * Generate mock forecast data
 */
function generateMockForecastData(): ForecastData[] {
  const data: ForecastData[] = []
  const today = new Date()
  
  // Generate last 30 days with actual data
  for (let i = 29; i >= 0; i--) {
    const date = new Date()
    date.setDate(today.getDate() - i)
    const baseRevenue = 50000 + Math.random() * 30000
    const variance = Math.sin(i / 10) * 10000
    data.push({
      date: date.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' }),
      actual: Math.round(baseRevenue + variance),
      forecast: Math.round(baseRevenue + variance + (Math.random() - 0.5) * 5000),
      confidence: 'high',
    })
  }

  // Generate next 10 days forecast
  const avgRevenue = data.reduce((sum, d) => sum + (d.actual || 0), 0) / data.length
  for (let i = 1; i <= 10; i++) {
    const date = new Date()
    date.setDate(today.getDate() + i)
    const forecast = avgRevenue + (Math.random() - 0.5) * 20000
    data.push({
      date: date.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' }),
      forecast: Math.round(forecast),
      confidence: i <= 5 ? 'high' : i <= 7 ? 'medium' : 'low',
    })
  }

  return data
}

/**
 * Get complete analytics data for a given organization
 */
export async function getAnalyticsData(orgId: string, timezone: string = 'Africa/Nairobi'): Promise<AnalyticsData> {
  try {
    // For now, return mock data
    // In production, replace these with real database queries
    return {
      trendData: generateMockTrendData(),
      cohortData: generateMockCohortData(),
      repeatData: generateMockRepeatData(),
      productData: generateMockProductData(),
      staffData: generateMockStaffData(),
      hourlyData: generateMockHourlyData(),
      forecastData: generateMockForecastData(),
    }
  } catch (error) {
    console.error('Failed to fetch analytics data:', error)
    // Return empty data on error
    return {
      trendData: [],
      cohortData: [],
      repeatData: [],
      productData: [],
      staffData: [],
      hourlyData: [],
      forecastData: [],
    }
  }
}
