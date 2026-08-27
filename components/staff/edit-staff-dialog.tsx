'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { notify } from '@/lib/notify'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { updateEmployee } from '@/app/actions/staff-actions'
import type { Employee } from '@/lib/db/schema'
import { RoleEnum, STAFF_ROLE_LABELS, isStaffManagedRole, type StaffManagedRole } from '@/lib/types/permissions'
import { STAFF_DEPARTMENTS, STAFF_DEPARTMENT_LABELS, normalizeStaffDepartment, type StaffDepartment } from '@/lib/types/staff'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StaffPhotoField } from './staff-photo-field'

interface EditStaffDialogProps {
  employee: Employee & { image?: string | null }
  open: boolean
  onOpenChange: (open: boolean) => void
  assignableRoles: StaffManagedRole[]
}

function editableRole(role: string): StaffManagedRole | '' {
  const normalized = role as RoleEnum
  return isStaffManagedRole(normalized) ? normalized : ''
}

export function EditStaffDialog({ employee, open, onOpenChange, assignableRoles }: EditStaffDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: employee.name,
    email: employee.email || '',
    phone: employee.phone || '',
    image: employee.image || '',
    role: editableRole(employee.role),
    department: normalizeStaffDepartment(employee.department),
    salary: employee.salary.toString(),
    status: employee.status,
  })

  useEffect(() => {
    setFormData({
      name: employee.name,
      email: employee.email || '',
      phone: employee.phone || '',
      image: employee.image || '',
      role: editableRole(employee.role),
      department: normalizeStaffDepartment(employee.department),
      salary: employee.salary.toString(),
      status: employee.status,
    })
  }, [employee])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const role = formData.role
    if (!formData.name.trim() || !role) return notify.error('Name and role are required')

    setIsLoading(true)
    try {
      await updateEmployee(employee.id, {
        ...formData,
        role,
        salary: parseFloat(formData.salary),
      })
      notify.success('Employee updated successfully')
      onOpenChange(false)
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Failed to update employee')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Staff Member</DialogTitle>
          <DialogDescription>Update employee information.</DialogDescription>
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
              <label className="text-sm font-medium">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground accent-amber-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
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

          <div className="grid grid-cols-2 gap-4">
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
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger className="w-full !border-0 bg-background text-sm text-foreground !shadow-none outline-none ring-0 focus:!border-0 focus:ring-2 focus:ring-amber-500/20"><SelectValue /></SelectTrigger>
                <SelectContent className="!border-0 bg-popover text-popover-foreground shadow-lg">
                  <SelectItem value="active" className="focus:bg-amber-100 focus:text-amber-950 dark:focus:bg-amber-400/15 dark:focus:text-amber-100">Active</SelectItem>
                  <SelectItem value="inactive" className="focus:bg-amber-100 focus:text-amber-950 dark:focus:bg-amber-400/15 dark:focus:text-amber-100">Inactive</SelectItem>
                  <SelectItem value="terminated" className="focus:bg-amber-100 focus:text-amber-950 dark:focus:bg-amber-400/15 dark:focus:text-amber-100">Terminated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Employee
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
