import Link from 'next/link'
import { CheckCircle2, AlertTriangle, Clock, ChevronRight } from 'lucide-react'

interface ActionTask {
  id: string
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  href: string
  dueDate?: Date
  completed?: boolean
}

interface ActionTasksProps {
  tasks: ActionTask[]
  onComplete?: (taskId: string) => void
}

const priorityColors = {
  high: 'bg-[#ffeaea] text-[#c51f21] border-[#f5d5d5]',
  medium: 'bg-[#fff7d1] text-[#6b5200] border-[#ffeea3]',
  low: 'bg-[#e7f7f0] text-[#116d4f] border-[#d5f1e8]',
}

const priorityLabels = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

export function ActionTasks({ tasks, onComplete }: ActionTasksProps) {
  const activeTasks = tasks.filter((t) => !t.completed)
  const completedCount = tasks.filter((t) => t.completed).length

  if (tasks.length === 0) return null

  return (
    <article className="overflow-hidden rounded-xl border border-[#dfe3ea] bg-white shadow-[0_1px_2px_rgba(16,24,40,.03)]">
      <div className="border-b border-[#edf0f4] px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[0.95rem] font-bold text-[#101828]">Action items</h2>
            <p className="mt-1 text-xs text-[#7b8495]">
              {activeTasks.length} of {tasks.length} pending
            </p>
          </div>
          {completedCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#e7f7f0] px-2.5 py-1 text-[0.65rem] font-semibold text-[#116d4f]">
              <CheckCircle2 className="h-3 w-3" />
              {completedCount} done
            </span>
          )}
        </div>
      </div>

      {activeTasks.length === 0 ? (
        <div className="flex min-h-[120px] flex-col items-center justify-center px-6 py-8 text-center">
          <CheckCircle2 className="h-10 w-10 text-[#e7f7f0] text-[#116d4f]" />
          <p className="mt-2 text-sm font-semibold text-[#101828]">All caught up!</p>
          <p className="mt-1 text-xs text-[#8a94a5]">No pending action items</p>
        </div>
      ) : (
        <div className="divide-y divide-[#edf0f4]">
          {activeTasks.slice(0, 5).map((task) => (
            <Link
              key={task.id}
              href={task.href}
              className="group flex items-start justify-between gap-4 px-5 py-4 transition-colors hover:bg-[#fafbfc]"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-3">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[0.65rem] font-semibold border ${priorityColors[task.priority]}`}>
                    {priorityLabels[task.priority]}
                  </span>
                </div>
                <p className="mt-2 text-sm font-semibold text-[#101828]">{task.title}</p>
                <p className="mt-0.5 text-xs text-[#667085]">{task.description}</p>
                {task.dueDate && (
                  <div className="mt-2 flex items-center gap-1.5 text-[0.65rem] text-[#8a94a5]">
                    <Clock className="h-3 w-3" />
                    <span>{task.dueDate.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })}</span>
                  </div>
                )}
              </div>
              <ChevronRight className="h-5 w-5 flex-shrink-0 text-[#c7cdd8] transition-transform group-hover:translate-x-1" />
            </Link>
          ))}
        </div>
      )}

      {activeTasks.length > 5 && (
        <div className="border-t border-[#edf0f4] bg-[#fafbfc] px-5 py-3">
          <p className="text-xs text-[#8a94a5]">
            {activeTasks.length - 5} more task{activeTasks.length - 5 !== 1 ? 's' : ''} pending
          </p>
        </div>
      )}
    </article>
  )
}
