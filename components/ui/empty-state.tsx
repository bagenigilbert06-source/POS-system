import type { ElementType, ReactNode } from 'react'
import { Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'

export function EmptyState({ title, description, icon: Icon = Inbox, action, className }: { title: string; description?: string; icon?: ElementType; action?: ReactNode; className?: string }) {
  return <div className={cn('flex flex-col items-center justify-center px-5 py-10 text-center', className)}>
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground"><Icon className="h-[18px] w-[18px]" aria-hidden="true"/></div>
    <p className="mt-3 text-sm font-semibold text-foreground">{title}</p>
    {description && <p className="mt-1 max-w-md text-xs leading-5 text-muted-foreground">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
}
