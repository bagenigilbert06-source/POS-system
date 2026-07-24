'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Edit2, Trash2, CheckCircle2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { deleteEmployee } from '@/app/actions/staff-actions'
import { EditStaffDialog } from './edit-staff-dialog'
import type { Employee } from '@/lib/db/schema'

interface StaffManagementTableProps {
  employees: Employee[]
  orgId: string
}

export function StaffManagementTable({ employees, orgId }: StaffManagementTableProps) {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async (employeeId: string) => {
    if (!confirm('Are you sure you want to delete this employee?')) return

    setIsDeleting(true)
    try {
      await deleteEmployee(employeeId)
      toast.success('Employee deleted successfully')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete employee')
    } finally {
      setIsDeleting(false)
    }
  }

  if (!employees || employees.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed bg-muted/30">
        <div className="text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground/60" />
          <p className="mt-2 text-sm font-medium text-muted-foreground">No employees found</p>
          <p className="text-xs text-muted-foreground">Add your first employee to get started</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-muted">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Department</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Salary</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id} className="border-b border-muted/50 hover:bg-muted/50 transition-colors">
                <td className="px-4 py-3 font-medium">{emp.name}</td>
                <td className="px-4 py-3 capitalize">{emp.role}</td>
                <td className="px-4 py-3 text-muted-foreground">{emp.department || '-'}</td>
                <td className="px-4 py-3 text-muted-foreground">{emp.email || '-'}</td>
                <td className="px-4 py-3">{formatCurrency(parseFloat(emp.salary.toString()))}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {emp.status === 'active' ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-xs font-medium text-green-700">Active</span>
                      </>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                        {emp.status}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedEmployee(emp)
                        setShowEditDialog(true)
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(emp.id)}
                      disabled={isDeleting}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedEmployee && (
        <EditStaffDialog
          employee={selectedEmployee}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
        />
      )}
    </>
  )
}
