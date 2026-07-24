import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface PerformanceGoal {
  id: string
  title: string
  target: number
  current: number
  unit: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: number
}

interface PerformanceGoalsProps {
  goals: PerformanceGoal[]
  currency?: string
}

export function PerformanceGoals({ goals, currency }: PerformanceGoalsProps) {
  if (goals.length === 0) return null

  const getStatusColor = (current: number, target: number) => {
    const percentage = (current / target) * 100
    if (percentage >= 100) return 'bg-[#116d4f]'
    if (percentage >= 80) return 'bg-[#6b5200]'
    return 'bg-[#8a94a5]'
  }

  const getPercentage = (current: number, target: number) => {
    const percentage = (current / target) * 100
    return Math.min(Math.round(percentage), 100)
  }

  return (
    <article className="overflow-hidden rounded-xl border border-[#dfe3ea] bg-white shadow-[0_1px_2px_rgba(16,24,40,.03)]">
      <div className="border-b border-[#edf0f4] px-5 py-4">
        <h2 className="text-[0.95rem] font-bold text-[#101828]">Performance goals</h2>
        <p className="mt-1 text-xs text-[#7b8495]">Today's targets vs. current performance</p>
      </div>

      <div className="divide-y divide-[#edf0f4] px-5">
        {goals.map((goal) => {
          const percentage = getPercentage(goal.current, goal.target)
          const TrendIcon = goal.trend === 'up' ? TrendingUp : goal.trend === 'down' ? TrendingDown : Minus

          return (
            <div key={goal.id} className="py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#101828]">{goal.title}</p>
                  <p className="mt-1 text-xs text-[#667085]">
                    Target: {goal.target} {goal.unit}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[#101828]">{goal.current}</p>
                    {goal.trendValue !== undefined && (
                      <div className={`mt-0.5 flex items-center gap-1 text-xs font-medium ${goal.trend === 'up' ? 'text-[#116d4f]' : goal.trend === 'down' ? 'text-[#c51f21]' : 'text-[#667085]'}`}>
                        <TrendIcon className="h-3 w-3" />
                        <span>{goal.trendValue > 0 ? '+' : ''}{goal.trendValue}%</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-3 overflow-hidden rounded-full bg-[#edf0f4]">
                <div
                  className={`h-2 transition-all ${getStatusColor(goal.current, goal.target)}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>

              <div className="mt-2 flex items-center justify-between text-[0.65rem] text-[#8a94a5]">
                <span>{percentage}% achieved</span>
                <span>{goal.target - goal.current} {goal.unit} remaining</span>
              </div>
            </div>
          )
        })}
      </div>
    </article>
  )
}
