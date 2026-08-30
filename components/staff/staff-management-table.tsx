'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  Check,
  ChevronUp,
  Edit2,
  FileSpreadsheet,
  FileText,
  Grid2X2,
  KeyRound,
  List,
  Mail,
  MoreVertical,
  Power,
  Search,
  RefreshCw,
  Trash2,
  UserCheck,
  UserPlus,
  UserRound,
  UserX,
  Users,
} from 'lucide-react';
import { notify } from '@/lib/notify';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  deleteEmployee,
  resendStaffInvitation,
  updateEmployee,
} from '@/app/actions/staff-actions';
import { resetStaffPosPin } from '@/app/actions/pos-pin';
import { EditStaffDialog } from './edit-staff-dialog';
import { AddStaffDialog } from './add-staff-dialog';
import type { Employee } from '@/lib/db/schema';
import {
  canManageExistingRole,
  RoleEnum,
  STAFF_ROLE_LABELS,
  type StaffManagedRole,
} from '@/lib/types/permissions';
import {
  normalizeStaffDepartment,
  STAFF_DEPARTMENT_LABELS,
} from '@/lib/types/staff';

type EmployeeCardRecord = Employee & {
  image?: string | null;
  posPinSet?: boolean;
};

interface StaffManagementTableProps {
  branches: Array<{ id: string; name: string }>;
  description: string;
  employees: EmployeeCardRecord[];
  actorRole: RoleEnum;
  assignableRoles: StaffManagedRole[];
  summary: { total: number; active: number; inactive: number; newJoiners: number };
}

const roleLabel = (role: string) =>
  STAFF_ROLE_LABELS[role as StaffManagedRole] ??
  role
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
const joinDate = (date: Date) =>
  new Intl.DateTimeFormat('en-KE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));

function StaffAvatar({ employee }: { employee: EmployeeCardRecord }) {
  const initials =
    employee.name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'ST';
  return (
    <div className="h-16 w-16 rounded-full border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] p-1">
      <div className="relative h-full w-full overflow-hidden rounded-full bg-[var(--dashboard-accent-soft)] text-[var(--dashboard-accent-cta-ink)]">
        {employee.image ? (
          <Image
            src={employee.image}
            alt={`${employee.name} profile photo`}
            fill
            sizes="56px"
            unoptimized
            className="object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-lg font-bold">
            {initials}
          </span>
        )}
      </div>
    </div>
  );
}

export function StaffManagementTable({
  branches,
  description,
  employees,
  actorRole,
  assignableRoles,
  summary,
}: StaffManagementTableProps) {
  const router = useRouter();
  const [selectedEmployee, setSelectedEmployee] =
    useState<EmployeeCardRecord | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [resendingEmployeeId, setResendingEmployeeId] = useState<string | null>(
    null
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(true);
  const [page, setPage] = useState(1);
  const [confirmation, setConfirmation] = useState<{
    title: string;
    description: string;
    action: () => Promise<void>;
  } | null>(null);
  const pageSize = 12;

  const employeeCodes = useMemo(
    () => new Map(
      employees.map((employee, index) => [
        employee.id,
        employee.profile &&
        typeof employee.profile === 'object' &&
        'employeeCode' in employee.profile &&
        typeof employee.profile.employeeCode === 'string' &&
        employee.profile.employeeCode.trim()
          ? employee.profile.employeeCode.trim()
          : `POS${String(index + 1).padStart(3, '0')}`,
      ])
    ),
    [employees]
  );
  const roles = useMemo(
    () =>
      Array.from(
        new Set([...assignableRoles, ...employees.map((item) => item.role)])
      ).sort(),
    [assignableRoles, employees]
  );
  const filteredEmployees = useMemo(
    () =>
      employees.filter((employee) => {
        const searchable =
          `${employee.name} ${employee.email ?? ''} ${employee.phone ?? ''} ${employeeCodes.get(employee.id) ?? ''}`.toLowerCase();
        return (
          (!query || searchable.includes(query.trim().toLowerCase())) &&
          (employeeFilter === 'all' || employee.id === employeeFilter) &&
          (roleFilter === 'all' || employee.role === roleFilter)
        );
      }),
    [employees, employeeCodes, query, employeeFilter, roleFilter]
  );
  const pageCount = Math.max(1, Math.ceil(filteredEmployees.length / pageSize));
  const visibleEmployees = filteredEmployees.slice(
    (page - 1) * pageSize,
    page * pageSize
  );
  const changeFilter = (setter: (value: string) => void, value: string) => {
    setter(value);
    setPage(1);
  };
  const refresh = () => router.refresh();

  const downloadCsv = () => {
    const headers = ['Employee ID', 'Name', 'Email', 'Role', 'Department', 'Joined', 'Status'];
    const rows = filteredEmployees.map((employee) => [
      employeeCodes.get(employee.id) ?? '',
      employee.name,
      employee.email ?? '',
      roleLabel(employee.role),
      STAFF_DEPARTMENT_LABELS[normalizeStaffDepartment(employee.department)],
      joinDate(employee.joinDate),
      employee.status,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'employees.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = (employee: EmployeeCardRecord) =>
    setConfirmation({
      title: `Revoke ${employee.name}'s access?`,
      description:
        'Their record remains available for audit history, but they will lose access to this workspace and its branches.',
      action: async () => {
        setIsDeleting(true);
        try {
          await deleteEmployee(employee.id);
          notify.success('Employee access revoked');
          refresh();
        } catch (error) {
          notify.error(
            error instanceof Error
              ? error.message
              : 'Failed to revoke employee access'
          );
        } finally {
          setIsDeleting(false);
        }
      },
    });

  const handleResend = async (employee: EmployeeCardRecord) => {
    setResendingEmployeeId(employee.id);
    try {
      const result = await resendStaffInvitation(employee.id);
      result.reused
        ? notify.info(
            'A current invitation was already sent. Wait one minute before resending.'
          )
        : result.delivered
          ? notify.success('Invitation resent')
          : notify.warning(
              'Invitation refreshed, but transactional email is not configured'
            );
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : 'Unable to resend invitation'
      );
    } finally {
      setResendingEmployeeId(null);
    }
  };

  const handlePinReset = (employee: EmployeeCardRecord) =>
    setConfirmation({
      title: `Reset ${employee.name}'s POS PIN?`,
      description:
        'Their current PIN will stop working. They can create a new one after signing in with their password.',
      action: async () => {
        try {
          await resetStaffPosPin(employee.id);
          notify.success('POS PIN reset');
          refresh();
        } catch (error) {
          notify.error(
            error instanceof Error ? error.message : 'Unable to reset POS PIN'
          );
        }
      },
    });

  const handleStatusToggle = (employee: EmployeeCardRecord) => {
    const nextStatus = employee.status === 'active' ? 'inactive' : 'active';
    setConfirmation({
      title: `${nextStatus === 'active' ? 'Activate' : 'Deactivate'} ${employee.name}?`,
      description:
        nextStatus === 'active'
          ? 'This restores the employee’s workspace access.'
          : 'This temporarily disables the employee without removing their record.',
      action: async () => {
        try {
          await updateEmployee(employee.id, { status: nextStatus });
          notify.success(`${employee.name} is now ${nextStatus}`);
          refresh();
        } catch (error) {
          notify.error(
            error instanceof Error
              ? error.message
              : 'Unable to update employee status'
          );
        }
      },
    });
  };

  const toggleSelected = (id: string) =>
    setSelectedIds((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--dashboard-text)]">Employees</h1>
          <p className="mt-1 text-sm text-[var(--dashboard-muted)]">{description}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2" aria-label="Employee actions">
          <div className="flex items-center gap-1 rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] p-1">
            <button type="button" onClick={() => setView('list')} aria-label="List view" aria-pressed={view === 'list'} className={`flex h-9 w-9 items-center justify-center rounded-md transition ${view === 'list' ? 'bg-[var(--dashboard-accent-cta)] text-[var(--dashboard-accent-cta-ink)]' : 'text-[var(--dashboard-muted)] hover:bg-[var(--dashboard-surface-subtle)]'}`}><List className="h-4 w-4" /></button>
            <button type="button" onClick={() => setView('grid')} aria-label="Grid view" aria-pressed={view === 'grid'} className={`flex h-9 w-9 items-center justify-center rounded-md transition ${view === 'grid' ? 'bg-[var(--dashboard-accent-cta)] text-[var(--dashboard-accent-cta-ink)]' : 'text-[var(--dashboard-muted)] hover:bg-[var(--dashboard-surface-subtle)]'}`}><Grid2X2 className="h-4 w-4" /></button>
          </div>
          <span className="mx-1 hidden h-7 w-px bg-slate-200 dark:bg-white/10 sm:block" />
          <button type="button" onClick={() => window.print()} aria-label="Export PDF" title="PDF" className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] text-[var(--dashboard-danger)] transition hover:bg-[var(--dashboard-surface-subtle)]"><FileText className="h-4 w-4" /></button>
          <button type="button" onClick={downloadCsv} aria-label="Export Excel" title="Excel" className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] text-[var(--dashboard-success)] transition hover:bg-[var(--dashboard-surface-subtle)]"><FileSpreadsheet className="h-4 w-4" /></button>
          <button type="button" onClick={refresh} aria-label="Refresh employees" className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] text-[var(--dashboard-muted)] transition hover:bg-[var(--dashboard-surface-subtle)]"><RefreshCw className="h-4 w-4" /></button>
          <button type="button" onClick={() => setShowFilters((current) => !current)} aria-label={showFilters ? 'Collapse filters' : 'Show filters'} className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] text-[var(--dashboard-muted)] transition hover:bg-[var(--dashboard-surface-subtle)]"><ChevronUp className={`h-4 w-4 transition-transform ${showFilters ? '' : 'rotate-180'}`} /></button>
          <AddStaffDialog branches={branches} assignableRoles={assignableRoles} />
        </div>
      </header>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4" aria-label="Staff summary">
        {[
          { label: 'Total Employee', value: summary.total, icon: Users, card: 'var(--dashboard-accent-cta)', iconBg: 'var(--dashboard-accent-soft-border)', ink: 'var(--dashboard-accent-cta-ink)' },
          { label: 'Active', value: summary.active, icon: UserCheck, card: 'var(--dashboard-success)', iconBg: 'var(--dashboard-success-soft-border)', ink: '#fff' },
          { label: 'Inactive', value: summary.inactive, icon: UserX, card: 'var(--dashboard-danger)', iconBg: 'var(--dashboard-danger-soft-border)', ink: '#fff' },
          { label: 'New Joiners', value: summary.newJoiners, icon: UserPlus, card: 'var(--dashboard-accent-cta)', iconBg: 'var(--dashboard-accent-soft-border)', ink: 'var(--dashboard-accent-cta-ink)' },
        ].map(({ label, value, icon: Icon, card, iconBg, ink }) => (
          <div key={label} style={{ backgroundColor: card, color: ink }} className="flex min-h-[90px] items-center justify-between rounded-lg p-5">
            <div className="min-w-0"><p className="truncate text-sm font-normal">{label}</p><p className="mt-1 text-xl font-bold leading-none">{value}</p></div>
            <span style={{ color: ink }} className="flex h-12 w-12 shrink-0 items-center justify-center bg-transparent"><Icon className="h-5 w-5" aria-hidden="true" /></span>
          </div>
        ))}
      </div>

      <section className="space-y-6">

        {showFilters && <div className="flex flex-col gap-3 rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] p-5 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative block w-full lg:max-w-[214px]">
            <Search
              className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              value={query}
              onChange={(event) => changeFilter(setQuery, event.target.value)}
              placeholder="Search"
              className="h-10 w-full rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] pl-10 pr-3 text-sm text-[var(--dashboard-text)] outline-none transition focus:border-[var(--dashboard-accent-soft-border)] focus:ring-2 focus:ring-[var(--dashboard-accent-soft)]"
            />
          </label>
          <div className="grid grid-cols-2 gap-2 lg:flex">
            <Select
              value={employeeFilter}
              onValueChange={(value) => changeFilter(setEmployeeFilter, value)}
            >
              <SelectTrigger className="h-10 min-w-[145px] border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] text-[var(--dashboard-text)]">
                <SelectValue placeholder="Select Employees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Select Employees</SelectItem>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={roleFilter}
              onValueChange={(value) => changeFilter(setRoleFilter, value)}
            >
              <SelectTrigger className="h-10 min-w-[128px] border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] text-[var(--dashboard-text)]">
                <SelectValue placeholder="Designation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Designation</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {roleLabel(role)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>}

        {employees.length === 0 ? (
          <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] p-8 text-center">
            <div>
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--dashboard-accent-soft)] text-[var(--dashboard-accent)]">
                <UserRound className="h-6 w-6" />
              </span>
              <h3 className="mt-4 font-bold">No employees yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Add your first team member to get started.
              </p>
            </div>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] p-8 text-center">
            <div>
              <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground" />
              <h3 className="mt-3 font-bold">No matching employees</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Try a different search or clear a filter.
              </p>
            </div>
          </div>
        ) : (
          <div className={view === 'grid' ? 'grid gap-6 md:grid-cols-2 xl:grid-cols-3 min-[1400px]:grid-cols-4' : 'space-y-3'}>
            {visibleEmployees.map((employee) => {
              const canManage = canManageExistingRole(
                actorRole,
                employee.role as RoleEnum
              );
              const selected = selectedIds.has(employee.id);
              return (
                <article
                  key={employee.id}
                  className={view === 'grid' ? 'min-h-[284px] rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)]' : 'rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)]'}
                >
                  <div className={view === 'grid' ? 'flex min-h-[282px] flex-col p-5' : 'flex items-center gap-5 p-4'}>
                    <div className="mb-2 flex items-start justify-between">
                      <button
                        type="button"
                        onClick={() => toggleSelected(employee.id)}
                        aria-label={`${selected ? 'Deselect' : 'Select'} ${employee.name}`}
                        className={`mt-1 flex h-5 w-5 items-center justify-center rounded border transition ${selected ? 'border-[var(--dashboard-accent-cta)] bg-[var(--dashboard-accent-cta)] text-[var(--dashboard-accent-cta-ink)]' : 'border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] text-transparent hover:border-[var(--dashboard-accent-soft-border)]'}`}
                      >
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      </button>
                      <StaffAvatar employee={employee} />
                      <div className="h-8 w-8">
                        {canManage && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                aria-label={`Actions for ${employee.name}`}
                                className="h-8 w-8 rounded-full"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuLabel className="truncate text-xs text-muted-foreground">
                                {employee.name}
                              </DropdownMenuLabel>
                              <DropdownMenuItem
                                onSelect={() => {
                                  setSelectedEmployee(employee);
                                  setShowEditDialog(true);
                                }}
                                className="gap-2"
                              >
                                <Edit2 className="h-4 w-4" />
                                Edit employee
                              </DropdownMenuItem>
                              {employee.status === 'invited' ? (
                                <DropdownMenuItem
                                  disabled={resendingEmployeeId === employee.id}
                                  onSelect={() => void handleResend(employee)}
                                  className="gap-2"
                                >
                                  <Mail className="h-4 w-4" />
                                  {resendingEmployeeId === employee.id
                                    ? 'Sending…'
                                    : 'Resend invitation'}
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onSelect={() => handleStatusToggle(employee)}
                                  className="gap-2"
                                >
                                  <Power className="h-4 w-4" />
                                  {employee.status === 'active'
                                    ? 'Deactivate'
                                    : 'Activate'}
                                </DropdownMenuItem>
                              )}
                              {employee.posPinSet && (
                                <DropdownMenuItem
                                  onSelect={() => handlePinReset(employee)}
                                  className="gap-2"
                                >
                                  <KeyRound className="h-4 w-4" />
                                  Reset POS PIN
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                disabled={isDeleting}
                                onSelect={() => handleDelete(employee)}
                                className="gap-2 text-red-600 focus:bg-red-50 focus:text-red-700 dark:focus:bg-red-500/10"
                              >
                                <Trash2 className="h-4 w-4" />
                                Revoke access
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                    <p className={view === 'grid' ? 'mb-2 text-center text-sm font-normal text-[var(--dashboard-accent)]' : 'w-28 shrink-0 text-sm font-normal text-[var(--dashboard-accent)]'}>
                      EMP ID : {employeeCodes.get(employee.id)}
                    </p>
                    <div className={view === 'grid' ? 'mb-3 text-center' : 'w-48 shrink-0 text-left'}>
                      <h3 className="mb-1 max-w-full truncate text-sm font-semibold text-[var(--dashboard-text)]">
                        {employee.name}
                      </h3>
                      <span className="inline-flex min-h-6 items-center rounded-md border border-[var(--dashboard-accent-soft-border)] bg-[var(--dashboard-accent-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--dashboard-accent-strong)] shadow-sm">
                        {roleLabel(employee.role)}
                      </span>
                    </div>

                    <div className={view === 'grid' ? 'mt-auto flex w-full items-center justify-between px-4 pt-3 text-left' : 'ml-auto flex min-w-[280px] items-center justify-between px-4 text-left'}>
                      <div>
                        <p className="text-sm font-semibold text-[var(--dashboard-text)]">
                          Joined
                        </p>
                        <p className="mt-1 truncate text-sm text-[var(--dashboard-muted)]">
                          {joinDate(employee.joinDate)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[var(--dashboard-text)]">
                          Department
                        </p>
                        <p className="mt-1 truncate text-sm text-[var(--dashboard-muted)]">
                          {
                            STAFF_DEPARTMENT_LABELS[
                              normalizeStaffDepartment(employee.department)
                            ]
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {filteredEmployees.length > pageSize && (
          <div className="flex flex-col gap-3 rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] px-4 py-3 text-sm text-[var(--dashboard-muted)] sm:flex-row sm:items-center sm:justify-between">
            <span>
              Showing {(page - 1) * pageSize + 1}–
              {Math.min(page * pageSize, filteredEmployees.length)} of{' '}
              {filteredEmployees.length}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((value) => value - 1)}
              >
                Previous
              </Button>
              <span className="flex h-9 min-w-9 items-center justify-center rounded-md bg-[var(--dashboard-accent-cta)] px-2 text-xs font-bold text-[var(--dashboard-accent-cta-ink)]">
                {page} / {pageCount}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === pageCount}
                onClick={() => setPage((value) => value + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </section>

      {selectedEmployee && (
        <EditStaffDialog
          employee={selectedEmployee}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          assignableRoles={assignableRoles}
        />
      )}
      <AlertDialog
        open={Boolean(confirmation)}
        onOpenChange={(open) => !open && setConfirmation(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmation?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmation?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await confirmation?.action();
                setConfirmation(null);
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
