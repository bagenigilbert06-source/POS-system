import Link from 'next/link'
import { ArrowRight, Package, ShoppingCart, Users, TrendingUp, AlertTriangle } from 'lucide-react'

interface ActivityItem {
  id: string
  type: 'sale' | 'stock' | 'customer' | 'milestone' | 'alert'
  title: string
  description: string
  timestamp: Date
  icon: React.ReactNode
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple'
}

interface ActivityFeedProps {
  activities: ActivityItem[]
}

const colorClasses = {
  blue: 'bg-[#e7f0ff] text-[#004ee6]',
  green: 'bg-[#e7f7f0] text-[#116d4f]',
  yellow: 'bg-[#fff7d1] text-[#6b5200]',
  red: 'bg-[#ffeaea] text-[#c51f21]',
  purple: 'bg-[#f0e7ff] text-[#7c3aed]',
}

function formatTime(date: Date) {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`

  return date.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <article className="overflow-hidden rounded-xl border border-[#dfe3ea] bg-white shadow-[0_1px_2px_rgba(16,24,40,.03)]">
        <div className="border-b border-[#edf0f4] px-5 py-4">
          <h2 className="text-[0.95rem] font-bold text-[#101828]">Recent activity</h2>
          <p className="mt-1 text-xs text-[#7b8495]">System events and updates</p>
        </div>
        <div className="flex min-h-[200px] flex-col items-center justify-center px-6 py-8 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f3f5f7] text-[#7b8495]">
            <TrendingUp className="h-5 w-5" />
          </div>
          <p className="mt-3 text-sm font-semibold text-[#101828]">No activity yet</p>
          <p className="mt-1 text-xs text-[#8a94a5]">New events will appear here</p>
        </div>
      </article>
    )
  }

  return (
    <article className="overflow-hidden rounded-xl border border-[#dfe3ea] bg-white shadow-[0_1px_2px_rgba(16,24,40,.03)]">
      <div className="border-b border-[#edf0f4] px-5 py-4">
        <h2 className="text-[0.95rem] font-bold text-[#101828]">Recent activity</h2>
        <p className="mt-1 text-xs text-[#7b8495]">System events and updates</p>
      </div>

      <div className="divide-y divide-[#edf0f4]">
        {activities.slice(0, 6).map((activity, index) => (
          <div key={activity.id} className="flex gap-4 px-5 py-4">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0 ${colorClasses[activity.color]}`}>
              {activity.icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#101828]">{activity.title}</p>
              <p className="mt-0.5 text-xs text-[#667085]">{activity.description}</p>
              <p className="mt-1 text-[0.65rem] text-[#8a94a5]">{formatTime(activity.timestamp)}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-[#edf0f4] px-5 py-3">
        <Link href="/dashboard/operations" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#e42527] hover:text-[#b81c1f]">
          View all activity <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </article>
  )
}
