'use client'

import Link from 'next/link'
import { CirclePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { StaffManagedRole } from '@/lib/types/permissions'

export function AddStaffDialog({
  branches,
  assignableRoles,
}: {
  branches: Array<{ id: string; name: string }>
  assignableRoles: StaffManagedRole[]
}) {
  const unavailable = branches.length === 0 || assignableRoles.length === 0

  return (
    <Button
      asChild={!unavailable}
      disabled={unavailable}
      className="h-10 gap-2 bg-[var(--dashboard-accent-cta)] px-4 font-semibold text-[var(--dashboard-accent-cta-ink)] shadow-none hover:bg-[var(--dashboard-accent-cta-hover)]"
    >
      {unavailable ? (
        <span><CirclePlus className="h-4 w-4" />Add Employee</span>
      ) : (
        <Link href="/dashboard/staff/new"><CirclePlus className="h-4 w-4" />Add Employee</Link>
      )}
    </Button>
  )
}
