'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2 } from 'lucide-react'
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

export function AddStaffDialog({ branches, assignableRoles }: { branches: Array<{ id: string; name: string }>; assignableRoles: StaffManagedRole[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: '' as StaffManagedRole | '',
    branchId: branches[0]?.id ?? '',
    department: '',
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
      setFormData({ name: '', email: '', phone: '', role: '', branchId: branches[0]?.id ?? '', department: '', salary: '0' })
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
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Staff
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Staff Member</DialogTitle>
          <DialogDescription>Create a login account and assign its role and branch access.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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
                className="w-full rounded-lg border px-3 py-2 text-sm"
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

          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm text-blue-900">The employee will receive a secure email link to choose their own password. The link expires in one hour.</div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Role*</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as StaffManagedRole | '' })}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                required
              >
                <option value="" disabled>Select role...</option>
                {assignableRoles.map((role) => <option key={role} value={role}>{STAFF_ROLE_LABELS[role]}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Department</label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="Sales"
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Assigned branch*</label>
            <select value={formData.branchId} onChange={(e) => setFormData({ ...formData, branchId: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" required>
              <option value="" disabled>Choose branch</option>
              {branches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
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
