'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ChevronUp, RefreshCw } from 'lucide-react'
import { notify } from '@/lib/notify'
import { updateEmployee } from '@/app/actions/staff-actions'
import type { Employee } from '@/lib/db/schema'
import { RoleEnum, isStaffManagedRole, type StaffManagedRole } from '@/lib/types/permissions'
import { normalizeStaffDepartment } from '@/lib/types/staff'
import { EmployeeFormTemplate, type EmployeeFormState } from './employee-form-template'

type Profile = Record<string, unknown>
type Props = {
  employee: Employee & { image?: string | null }
  branches: Array<{ id: string; name: string }>
  shifts: Array<{ id: string; name: string; startTime: string; endTime: string }>
  assignableRoles: StaffManagedRole[]
  branchId: string
  shiftId: string
}

const profileValue = (profile: Profile, key: string) => typeof profile[key] === 'string' ? profile[key] : ''
const splitEmergency = (value: string) => { const [name = '', relation = '', phone = ''] = value.split(' · '); return { name, relation, phone } }
const toDate = (value: Date | string) => { const date = new Date(value); return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10) }

function initialForm({ employee, branchId, shiftId }: Pick<Props, 'employee' | 'branchId' | 'shiftId'>): EmployeeFormState {
  const profile = (employee.profile && typeof employee.profile === 'object' ? employee.profile : {}) as Profile
  const emergency1 = splitEmergency(profileValue(profile, 'emergencyContact1'))
  const emergency2 = splitEmergency(profileValue(profile, 'emergencyContact2'))
  const [firstName = '', ...lastName] = employee.name.split(' ')
  return { firstName, lastName: lastName.join(' '), email: employee.email || '', phone: employee.phone || '', image: employee.image || '', employeeCode: profileValue(profile, 'employeeCode'), dateOfBirth: profileValue(profile, 'dateOfBirth'), gender: profileValue(profile, 'gender'), nationality: profileValue(profile, 'nationality') || 'Kenyan', joinDate: toDate(employee.joinDate), shiftId, department: normalizeStaffDepartment(employee.department), role: isStaffManagedRole(employee.role as RoleEnum) ? employee.role as StaffManagedRole : '', branchId, salary: employee.salary.toString(), bloodGroup: profileValue(profile, 'bloodGroup'), about: profileValue(profile, 'about'), address: profileValue(profile, 'address'), country: profileValue(profile, 'country') || 'Kenya', state: profileValue(profile, 'state'), city: profileValue(profile, 'city'), zipcode: profileValue(profile, 'zipcode'), emergencyPhone1: emergency1.phone, emergencyRelation1: emergency1.relation, emergencyName1: emergency1.name, emergencyPhone2: emergency2.phone, emergencyRelation2: emergency2.relation, emergencyName2: emergency2.name, bankName: profileValue(profile, 'bankName'), bankAccountNumber: profileValue(profile, 'bankAccountNumber'), bankCode: profileValue(profile, 'bankCode'), bankBranch: profileValue(profile, 'bankBranch'), status: employee.status }
}

export function EditEmployeeForm({ employee, branches, shifts, assignableRoles, branchId, shiftId }: Props) {
  const router = useRouter()
  const original = initialForm({ employee, branchId, shiftId })
  const [form, setForm] = useState(original)
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState<Record<string, boolean>>({ employee: true, address: false, emergency: false, bank: false, password: false })
  const set = (key: keyof EmployeeFormState, value: string) => setForm((current) => ({ ...current, [key]: value }))
  const toggle = (key: string) => setOpen((current) => ({ ...current, [key]: !current[key] }))
  const reset = () => setForm(original)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email || !form.phone || !form.role || !form.branchId) return notify.error('Complete the required employee information')
    setSaving(true)
    try {
      await updateEmployee(employee.id, { name: `${form.firstName.trim()} ${form.lastName.trim()}`, email: form.email, phone: form.phone, image: form.image || null, role: form.role, branchId: form.branchId, shiftId: form.shiftId, department: form.department, salary: Number(form.salary || 0), status: form.status, joinDate: form.joinDate, profile: { employeeCode: form.employeeCode, dateOfBirth: form.dateOfBirth, gender: form.gender, nationality: form.nationality, bloodGroup: form.bloodGroup, about: form.about, address: form.address, country: form.country, state: form.state, city: form.city, zipcode: form.zipcode, emergencyContact1: [form.emergencyName1, form.emergencyRelation1, form.emergencyPhone1].filter(Boolean).join(' · '), emergencyContact2: [form.emergencyName2, form.emergencyRelation2, form.emergencyPhone2].filter(Boolean).join(' · '), bankName: form.bankName, bankAccountNumber: form.bankAccountNumber, bankCode: form.bankCode, bankBranch: form.bankBranch } })
      notify.success('Employee updated successfully')
      router.push('/dashboard/staff')
      router.refresh()
    } catch (error) { notify.error(error instanceof Error ? error.message : 'Failed to update employee') } finally { setSaving(false) }
  }

  return <div className="mx-auto max-w-[1600px] space-y-5 pb-10"><header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><Link href="/dashboard/staff" aria-label="Back to employees" className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--dashboard-accent-cta)] text-[var(--dashboard-accent-cta-ink)]"><ArrowLeft className="h-4 w-4" /></Link><div><h1 className="text-xl font-bold text-[var(--dashboard-text)]">Edit Employee</h1><p className="mt-1 text-sm text-[var(--dashboard-muted)]">Update employee information</p></div></div><div className="flex items-center gap-2"><button type="button" onClick={reset} title="Reset changes" className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)]"><RefreshCw className="h-4 w-4" /></button><button type="button" onClick={() => setOpen({ employee: false, address: false, emergency: false, bank: false, password: false })} title="Collapse all sections" className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)]"><ChevronUp className="h-4 w-4" /></button><Link href="/dashboard/staff" className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--dashboard-text)] px-4 text-sm font-semibold text-[var(--dashboard-surface)]"><ArrowLeft className="h-4 w-4" />Back to List</Link></div></header><EmployeeFormTemplate form={form} set={set} open={open} toggle={toggle} branches={branches} shifts={shifts} assignableRoles={assignableRoles} mode="edit" saving={saving} onSubmit={submit} onCancel={() => router.push('/dashboard/staff')} /></div>
}
