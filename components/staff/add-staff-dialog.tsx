'use client'

import Link from 'next/link'
import { useState } from 'react'
import { CirclePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/page-loader'
import type { StaffManagedRole } from '@/lib/types/permissions'

export function AddStaffDialog({
  branches,
  assignableRoles,
}: {
  branches: Array<{ id: string; name: string }>
  assignableRoles: StaffManagedRole[]
}) {
  const unavailable = branches.length === 0 || assignableRoles.length === 0
  const [isOpening, setIsOpening] = useState(false)

  return (
    <Button
      asChild={!unavailable && !isOpening}
      disabled={unavailable || isOpening}
      className="h-10 gap-2 bg-[var(--dashboard-accent-cta)] px-4 font-semibold text-[var(--dashboard-accent-cta-ink)] shadow-none hover:bg-[var(--dashboard-accent-cta-hover)]"
    >
      {isOpening ? (
        <span><LoadingSpinner className="h-4 w-4" label="Opening employee form" />Opening…</span>
      ) : unavailable ? (
        <span><CirclePlus className="h-4 w-4" />Add Employee</span>
      ) : (
        <Link href="/dashboard/staff/new" onClick={() => setIsOpening(true)}><CirclePlus className="h-4 w-4" />Add Employee</Link>
      )}
    </Button>
  )
}
