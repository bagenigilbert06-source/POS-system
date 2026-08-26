'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CirclePlus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { createEmployee } from '@/app/actions/staff-actions'
import { STAFF_ROLE_LABELS, type StaffManagedRole } from '@/lib/types/permissions'
import { STAFF_DEPARTMENTS, STAFF_DEPARTMENT_LABELS, type StaffDepartment } from '@/lib/types/staff'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StaffPhotoField } from './staff-photo-field'

export function AddStaffDialog({ branches, assignableRoles }: { branches: Array<{ id: string; name: string }>; assignableRoles: StaffManagedRole[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    image: '',
    role: '' as StaffManagedRole | '',
    branchId: branches[0]?.id ?? '',
    department: 'unassigned' as StaffDepartment,
    salary: '0',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const role = formData.role
    if (!formData.name.trim() || !formData.email || !formData.branchId || !role) return toast.error('Name, email, role and branch are required')

    setIsLoading(true)
    try {
      const result = await createEmployee({
        ...formData,
        role,
        salary: parseFloat(formData.salary),
      })
      if (result.existingUser) toast.success('Existing Pesaby user added to this organization')
      else if (result.invitationSent) toast.success('Employee created and invitation sent')
      else toast.warning('Employee created as Invited, but email was not delivered. Configure Brevo or use Resend invitation.')
      setFormData({ name: '', email: '', phone: '', image: '', role: '', branchId: branches[0]?.id ?? '', department: 'unassigned', salary: '0' })
      setOpen(false)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add employee')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-10 gap-2 bg-[var(--dashboard-accent-cta)] px-4 font-semibold text-[var(--dashboard-accent-cta-ink)] shadow-none hover:bg-[var(--dashboard-accent-cta-hover)]">
          <CirclePlus className="h-4 w-4" />
          Add Employee
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Employee</DialogTitle>
          <DialogDescription>Create a login account and assign its role and branch access.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <StaffPhotoField name={formData.name} value={formData.image} onChange={(image) => setFormData({ ...formData, image })} />
          <div className="space-y-2">
            <label className="text-sm font-medium">Full Name*</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="John Doe"
              className="w-full rounded-lg border px-3 py-2 text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Login email*</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground accent-amber-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="254712345678"
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200">The employee will receive a secure email link to choose their own password. The link expires in one hour.</div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Role*</label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value as StaffManagedRole })}>
                <SelectTrigger className="w-full !border-0 bg-background text-sm text-foreground !shadow-none outline-none ring-0 focus:!border-0 focus:ring-2 focus:ring-amber-500/20"><SelectValue placeholder="Select role..." /></SelectTrigger>
                <SelectContent className="!border-0 bg-popover text-popover-foreground shadow-lg">
                  {assignableRoles.map((role) => <SelectItem key={role} value={role} className="focus:bg-amber-100 focus:text-amber-950 dark:focus:bg-amber-400/15 dark:focus:text-amber-100">{STAFF_ROLE_LABELS[role]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Department</label>
              <Select value={formData.department} onValueChange={(value) => setFormData({ ...formData, department: value as StaffDepartment })}>
                <SelectTrigger className="w-full !border-0 bg-background text-sm text-foreground !shadow-none outline-none ring-0 focus:!border-0 focus:ring-2 focus:ring-amber-500/20"><SelectValue placeholder="Choose department" /></SelectTrigger>
                <SelectContent className="!border-0 bg-popover text-popover-foreground shadow-lg">
                  {STAFF_DEPARTMENTS.map((department) => <SelectItem key={department} value={department} className="focus:bg-amber-100 focus:text-amber-950 dark:focus:bg-amber-400/15 dark:focus:text-amber-100">{STAFF_DEPARTMENT_LABELS[department]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Assigned branch*</label>
            <Select value={formData.branchId} onValueChange={(value) => setFormData({ ...formData, branchId: value })}>
              <SelectTrigger className="w-full !border-0 bg-background text-sm text-foreground !shadow-none outline-none ring-0 focus:!border-0 focus:ring-2 focus:ring-amber-500/20"><SelectValue placeholder="Choose branch" /></SelectTrigger>
              <SelectContent className="!border-0 bg-popover text-popover-foreground shadow-lg">
                {branches.map((item) => <SelectItem key={item.id} value={item.id} className="focus:bg-amber-100 focus:text-amber-950 dark:focus:bg-amber-400/15 dark:focus:text-amber-100">{item.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Monthly Salary</label>
            <input
              type="number"
              value={formData.salary}
              onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
              placeholder="25000"
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Employee
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
