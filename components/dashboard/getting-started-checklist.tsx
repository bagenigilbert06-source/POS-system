'use client'

import { useState } from 'react'
import { ChevronRight, CheckCircle2, Circle } from 'lucide-react'
import { GettingStartedTask } from '@/lib/types/workspace'
import { useRouter } from 'next/navigation'

interface GettingStartedChecklistProps {
  businessName: string
  templateName: string
  tasks: GettingStartedTask[]
}

export function GettingStartedChecklist({
  businessName,
  templateName,
  tasks,
}: GettingStartedChecklistProps) {
  const router = useRouter()
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set())

  const completionPercentage = Math.round(
    (completedTasks.size / tasks.length) * 100
  )

  const toggleTask = (taskId: string) => {
    setCompletedTasks((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(taskId)) {
        newSet.delete(taskId)
      } else {
        newSet.add(taskId)
      }
      return newSet
    })
  }

  const navigateToTask = (action: string) => {
    router.push(action)
  }

  return (
    <div className="w-full bg-card rounded-lg border border-border p-6 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Welcome to PESABY
        </h2>
        <p className="text-muted-foreground mb-6">
          Your {templateName} is ready. Complete these recommended tasks to get
          started.
        </p>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">
              Progress
            </span>
            <span className="text-sm font-semibold text-primary">
              {completionPercentage}%
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {completedTasks.size} of {tasks.length} completed
          </p>
        </div>
      </div>

      {/* Tasks list */}
      <div className="space-y-3">
        {tasks.map((task) => {
          const isCompleted = completedTasks.has(task.id)
          return (
            <div
              key={task.id}
              className="group flex items-center gap-4 p-4 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 cursor-pointer"
              onClick={() => navigateToTask(task.action)}
            >
              {/* Checkbox */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toggleTask(task.id)
                }}
                className="flex-shrink-0 transition-all duration-200"
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-6 h-6 text-primary" />
                ) : (
                  <Circle className="w-6 h-6 text-muted-foreground group-hover:text-primary" />
                )}
              </button>

              {/* Task content */}
              <div className="flex-1 min-w-0">
                <h3
                  className={`font-medium transition-all duration-200 ${
                    isCompleted
                      ? 'text-muted-foreground line-through'
                      : 'text-foreground'
                  }`}
                >
                  {task.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {task.description}
                </p>
              </div>

              {/* Arrow icon */}
              <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 group-hover:translate-x-1 transition-transform duration-200" />
            </div>
          )
        })}
      </div>

      {/* Completion message */}
      {completionPercentage === 100 && (
        <div className="mt-8 p-4 rounded-lg bg-primary/10 border border-primary/20">
          <p className="text-sm font-medium text-primary">
            Great job! You're all set. Start selling and managing your {templateName.toLowerCase()}.
          </p>
        </div>
      )}
    </div>
  )
}
