'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Edit2, Trash2, CheckCircle2, AlertCircle, Mail, Search, KeyRound, Power, PauseCircle, Ban, MoreHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { deleteEmployee, resendStaffInvitation, updateEmployee } from '@/app/actions/staff-actions'
import { resetStaffPosPin } from '@/app/actions/pos-pin'
import { EditStaffDialog } from './edit-staff-dialog'
import type { Employee } from '@/lib/db/schema'
import { canManageExistingRole, RoleEnum, type StaffManagedRole } from '@/lib/types/permissions'
import { normalizeStaffDepartment, STAFF_DEPARTMENT_LABELS, STAFF_DEPARTMENTS } from '@/lib/types/staff'
import { GmailMark } from '@/components/ui/contact-marks'

const toTitleCase = (value: string) => value.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())

function SalaryAmount({ value }: { value: number }) {
  if (value <= 0) {
    return <span className="text-sm text-muted-foreground">Not set</span>
  }

  return (
    <span className="whitespace-nowrap text-sm font-medium tabular-nums text-foreground">
      KSh {value.toLocaleString('en-KE', { maximumFractionDigits: 0 })}
    </span>
  )
}

function StaffStatusBadge({ status }: { status: string }) {
  const styles = {
    active: {
      label: 'Active',
      icon: CheckCircle2,
      className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300',
    },
    inactive: {
      label: 'Inactive',
      icon: PauseCircle,
      className: 'bg-slate-100 text-slate-600 dark:bg-slate-400/10 dark:text-slate-300',
    },
    invited: {
      label: 'Invited',
      icon: Mail,
      className: 'bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300',
    },
    terminated: {
      label: 'Terminated',
      icon: Ban,
      className: 'bg-red-50 text-red-700 dark:bg-red-400/10 dark:text-red-300',
    },
  } as const
  const config = styles[status as keyof typeof styles] ?? styles.inactive
  const Icon = config.icon

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium leading-none ${config.className}`}>
      <Icon className="h-3 w-3" strokeWidth={2} />
      {config.label}
    </span>
  )
}

function StaffRoleBadge({ role }: { role: string }) {
  const labels: Record<string, string> = { owner: 'Owner', admin: 'Admin', manager: 'Manager', supervisor: 'Supervisor', cashier: 'Cashier', inventory: 'Storekeeper', accountant: 'Accountant', staff: 'Staff', pharmacist: 'Pharmacist', pharmacy_staff: 'Pharmacy assistant' }
  return <span className="text-sm font-normal text-slate-600 dark:text-slate-300">{labels[role] ?? toTitleCase(role)}</span>
}

function StaffDepartmentBadge({ department }: { department: ReturnType<typeof normalizeStaffDepartment> }) {
  return <span className="text-sm font-normal text-slate-500 dark:text-slate-400">{STAFF_DEPARTMENT_LABELS[department]}</span>
}

function StaffAvatar({ name }: { name: string }) {
  const normalizedName = name.trim()
  const initials = normalizedName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase() || 'ST'

  const avatarThemes = [
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/90 dark:text-emerald-300',
    'bg-sky-100 text-sky-700 dark:bg-sky-950/90 dark:text-sky-300',
    'bg-violet-100 text-violet-700 dark:bg-violet-950/90 dark:text-violet-300',
    'bg-amber-100 text-amber-700 dark:bg-amber-950/90 dark:text-amber-300',
    'bg-rose-100 text-rose-700 dark:bg-rose-950/90 dark:text-rose-300',
    'bg-teal-100 text-teal-700 dark:bg-teal-950/90 dark:text-teal-300',
  ]
  const colorIndex = Array.from(normalizedName).reduce((total, character) => total + character.charCodeAt(0), 0) % avatarThemes.length

  return (
    <span
      className={`flex h-9 w-9 shrink-0 select-none items-center justify-center rounded-full border border-slate-200/80 text-[11px] font-semibold uppercase tracking-[0.02em] dark:border-white/10 ${avatarThemes[colorIndex]}`}
      aria-hidden="true"
    >
      {initials}
    </span>
  )
}

interface StaffManagementTableProps {
  employees: Array<Employee & { posPinSet?: boolean }>
  actorRole: RoleEnum
  assignableRoles: StaffManagedRole[]
}

export function StaffManagementTable({ employees, actorRole, assignableRoles }: StaffManagementTableProps) {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [resendingEmployeeId, setResendingEmployeeId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [confirmation, setConfirmation] = useState<{ title: string; description: string; action: () => Promise<void> } | null>(null)
  const pageSize = 25

  const handleDelete = async (employeeId: string) => {
    const employee = employees.find(({ id }) => id === employeeId)
    if (!employee) return
    setConfirmation({ title: `Revoke ${employee.name}'s access?`, description: 'This keeps the employee record for audit history but removes their organization access. This action should only be used when access must be removed.', action: async () => {
    setIsDeleting(true)
    try {
      await deleteEmployee(employeeId)
      toast.success('Employee access revoked')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete employee')
    } finally {
      setIsDeleting(false)
    }
    } })
  }
  const handleResend = async (employeeId: string) => {
    setResendingEmployeeId(employeeId)
    try { const result = await resendStaffInvitation(employeeId); result.reused ? toast.info('A current invitation was already sent. Wait one minute before resending.') : result.delivered ? toast.success('Invitation resent — previous links are no longer valid') : toast.warning('Invitation refreshed, but transactional email is not configured') }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to resend invitation') }
    finally { setResendingEmployeeId(null) }
  }
  const handlePinReset = async (employeeId: string) => { if (!confirm('Disable the existing PIN? The employee must create a new PIN after signing in with their password.')) return; try { await resetStaffPosPin(employeeId); toast.success('POS PIN reset') } catch(error) { toast.error(error instanceof Error?error.message:'Unable to reset PIN') } }
  const handleStatusToggle = async (employee: Employee) => {
    const nextStatus = employee.status === 'active' ? 'inactive' : 'active'
    setConfirmation({ title: `${nextStatus === 'active' ? 'Activate' : 'Deactivate'} ${employee.name}?`, description: nextStatus === 'active' ? 'This restores the staff member’s access.' : 'This disables the staff member without deleting their record or history.', action: async () => { try { await updateEmployee(employee.id, { status: nextStatus }); toast.success(`${employee.name} is now ${nextStatus}`) } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to update staff status') } } })
  }

  const filteredEmployees = useMemo(() => employees.filter((emp) => {
    const department = normalizeStaffDepartment(emp.department)
    const searchable = `${emp.name} ${emp.email ?? ''}`.toLowerCase()
    return (!query || searchable.includes(query.toLowerCase())) &&
      (roleFilter === 'all' || emp.role === roleFilter) &&
      (departmentFilter === 'all' || department === departmentFilter) &&
      (statusFilter === 'all' || emp.status === statusFilter)
  }), [employees, query, roleFilter, departmentFilter, statusFilter])
  const pageCount = Math.max(1, Math.ceil(filteredEmployees.length / pageSize))
  const visibleEmployees = filteredEmployees.slice((page - 1) * pageSize, page * pageSize)
  const changeFilter = (setter: (value: string) => void, value: string) => { setter(value); setPage(1) }

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
      <div className="rounded-xl bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)] dark:bg-card/80 dark:shadow-sm">
      <div className="grid gap-2 bg-slate-50/50 p-3 md:grid-cols-[minmax(220px,1fr)_repeat(3,160px)] dark:bg-white/[0.015]">
        <label className="relative block">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <input value={query} onChange={(event) => changeFilter(setQuery, event.target.value)} placeholder="Search staff" className="w-full rounded-lg border-0 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none ring-0 placeholder:text-slate-400 focus:bg-slate-100 dark:bg-white/[0.04] dark:focus:bg-white/[0.07]" />
        </label>
        <Select value={roleFilter} onValueChange={(value) => changeFilter(setRoleFilter, value)}><SelectTrigger className="!border-0 !ring-0 bg-slate-50 text-foreground focus:!border-0 focus:!ring-0 dark:bg-white/[0.04]"><SelectValue placeholder="All roles" /></SelectTrigger><SelectContent className="!border-0 bg-popover shadow-xl"><SelectItem value="all">All roles</SelectItem>{assignableRoles.map((role) => <SelectItem key={role} value={role}>{role}</SelectItem>)}</SelectContent></Select>
        <Select value={departmentFilter} onValueChange={(value) => changeFilter(setDepartmentFilter, value)}><SelectTrigger className="!border-0 !ring-0 bg-slate-50 text-foreground focus:!border-0 focus:!ring-0 dark:bg-white/[0.04]"><SelectValue placeholder="All departments" /></SelectTrigger><SelectContent className="!border-0 bg-popover shadow-xl"><SelectItem value="all">All departments</SelectItem>{STAFF_DEPARTMENTS.map((department) => <SelectItem key={department} value={department}>{STAFF_DEPARTMENT_LABELS[department]}</SelectItem>)}</SelectContent></Select>
        <Select value={statusFilter} onValueChange={(value) => changeFilter(setStatusFilter, value)}><SelectTrigger className="!border-0 !ring-0 bg-slate-50 text-foreground focus:!border-0 focus:!ring-0 dark:bg-white/[0.04]"><SelectValue placeholder="All statuses" /></SelectTrigger><SelectContent className="!border-0 bg-popover shadow-xl"><SelectItem value="all">All statuses</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="invited">Invited</SelectItem><SelectItem value="terminated">Terminated</SelectItem></SelectContent></Select>
      </div>
      {filteredEmployees.length === 0 ? <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">No staff match these filters. Clear the filters and try again.</div> : <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
              <tr className="bg-slate-50/80 dark:bg-white/[0.025]">
              <th className="rounded-l-lg px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Role</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Department</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Salary</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">POS PIN</th>
              <th className="rounded-r-lg px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleEmployees.map((emp) => {
              const canManage = canManageExistingRole(actorRole, emp.role as RoleEnum)
              return (
              <tr key={emp.id} className="group border-b border-slate-100 last:border-0 hover:bg-slate-50/70 dark:border-white/[0.045] dark:hover:bg-white/[0.025]">
                <td className="px-4 py-3.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <StaffAvatar name={emp.name} />
                    <span className="truncate text-sm font-medium text-foreground">{toTitleCase(emp.name)}</span>
                  </div>
                </td>
                <td className="px-4 py-3.5"><StaffRoleBadge role={emp.role} /></td>
                <td className="px-4 py-3.5"><StaffDepartmentBadge department={normalizeStaffDepartment(emp.department)} /></td>
                <td className="px-4 py-3.5 text-sm">
                  {emp.email ? (
                    <a
                      href={`mailto:${emp.email}`}
                      className="inline-flex max-w-[230px] items-center gap-2 text-sm font-normal text-slate-600 hover:text-slate-950 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 dark:text-slate-300 dark:hover:text-white"
                      title={`Email ${emp.name}`}
                    >
                      <GmailMark />
                      <span className="truncate">{emp.email}</span>
                    </a>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3.5"><SalaryAmount value={parseFloat(emp.salary.toString())} /></td>
                <td className="px-4 py-3.5"><StaffStatusBadge status={emp.status} /></td>
                <td className="whitespace-nowrap px-4 py-3.5">{emp.posPinSet ? <span className="inline-flex items-center gap-1.5 text-sm font-normal text-slate-600 dark:text-slate-300"><KeyRound className="h-3.5 w-3.5" />Configured</span> : <span className="inline-flex items-center gap-1.5 text-sm font-normal text-slate-500 dark:text-slate-400"><KeyRound className="h-3.5 w-3.5" />Not configured</span>}{canManage && emp.posPinSet&&<button onClick={()=>handlePinReset(emp.id)} className="ml-2 text-xs text-destructive underline">Reset</button>}</td>
                  <td className="px-4 py-3.5 text-right">
                    {canManage ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Actions for ${emp.name}`}
                            className="h-8 w-8 rounded-md text-muted-foreground transition-colors hover:bg-slate-100 hover:text-foreground focus-visible:bg-slate-100 dark:hover:bg-white/[0.08]"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-48 border-slate-200 bg-white p-1.5 shadow-lg dark:border-white/10 dark:bg-zinc-950"
                        >
                          <DropdownMenuLabel className="truncate px-2 py-1.5 text-xs font-medium text-muted-foreground">
                            {emp.name}
                          </DropdownMenuLabel>
                          <DropdownMenuItem
                            onSelect={() => {
                              setSelectedEmployee(emp)
                              setShowEditDialog(true)
                            }}
                            className="gap-2.5"
                          >
                            <Edit2 className="h-4 w-4" />
                            Edit staff
                          </DropdownMenuItem>
                          {emp.status === 'invited' ? (
                            <DropdownMenuItem
                              disabled={resendingEmployeeId === emp.id}
                              onSelect={() => handleResend(emp.id)}
                              className="gap-2.5"
                            >
                              <Mail className="h-4 w-4" />
                              {resendingEmployeeId === emp.id ? 'Sending invitation…' : 'Resend invitation'}
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onSelect={() => handleStatusToggle(emp)} className="gap-2.5">
                              <Power className="h-4 w-4" />
                              {emp.status === 'active' ? 'Deactivate staff' : 'Activate staff'}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator className="bg-slate-100 dark:bg-white/10" />
                          <DropdownMenuItem
                            disabled={isDeleting}
                            onSelect={() => handleDelete(emp.id)}
                            className="gap-2.5 text-red-600 focus:bg-red-50 focus:text-red-700 dark:text-red-300 dark:focus:bg-red-400/10 dark:focus:text-red-200"
                          >
                            <Trash2 className="h-4 w-4" />
                            Revoke access
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-border/60 px-3 py-3 text-sm text-muted-foreground"><span>Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredEmployees.length)} of {filteredEmployees.length} staff</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><Button variant="outline" size="sm" disabled={page === pageCount} onClick={() => setPage((value) => value + 1)}>Next</Button></div></div>
      </>}
      </div>

      {selectedEmployee && (
        <EditStaffDialog
          employee={selectedEmployee}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          assignableRoles={assignableRoles}
        />
      )}
      <AlertDialog open={Boolean(confirmation)} onOpenChange={(open) => !open && setConfirmation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{confirmation?.title}</AlertDialogTitle><AlertDialogDescription>{confirmation?.description}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={async () => { await confirmation?.action(); setConfirmation(null) }}>Confirm</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
