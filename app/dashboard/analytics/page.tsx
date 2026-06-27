import { redirect } from 'next/navigation'

// Analytics redirects to reports for now — same data, richer view coming later
export default function AnalyticsPage() {
  redirect('/dashboard/reports')
}
