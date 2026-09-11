'use client'

import { useEffect, useState } from 'react'
import { Banknote, CircleAlert, KeyRound, MapPin, UserRound, ChevronDown } from 'lucide-react'
import { notify } from '@/lib/notify'
import { updateEmployee } from '@/app/actions/staff-actions'
import type { Employee } from '@/lib/db/schema'
import { RoleEnum, STAFF_ROLE_LABELS, isStaffManagedRole, type StaffManagedRole } from '@/lib/types/permissions'
import { STAFF_DEPARTMENTS, STAFF_DEPARTMENT_LABELS, normalizeStaffDepartment, type StaffDepartment } from '@/lib/types/staff'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { StaffPhotoField } from './staff-photo-field'
import { LoadingSpinner as Loader2 } from '@/components/ui/page-loader'

type Profile = Record<string, unknown>
type FormState = {
  firstName: string
  lastName: string
  email: string
  phone: string
  image: string
  employeeCode: string
  dateOfBirth: string
  gender: string
  nationality: string
  joinDate: string
  department: StaffDepartment
  role: StaffManagedRole | ''
  bloodGroup: string
  about: string
  salary: string
  address: string
  country: string
  state: string
  city: string
  zipcode: string
  emergencyPhone1: string
  emergencyRelation1: string
  emergencyName1: string
  emergencyPhone2: string
  emergencyRelation2: string
  emergencyName2: string
  bankName: string
  bankAccountNumber: string
  bankCode: string
  bankBranch: string
  status: string
}

interface EditStaffDialogProps {
  employee: Employee & { image?: string | null }
  open: boolean
  onOpenChange: (open: boolean) => void
  assignableRoles: StaffManagedRole[]
}

const inputClass = 'h-10 w-full rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] px-3 text-sm text-[var(--dashboard-text)] outline-none transition focus:border-[var(--dashboard-accent-soft-border)] focus:ring-2 focus:ring-[var(--dashboard-accent-soft)]'
const labelClass = 'grid gap-2 text-sm font-medium text-[var(--dashboard-text)]'

function editableRole(role: string): StaffManagedRole | '' {
  const normalized = role as RoleEnum
  return isStaffManagedRole(normalized) ? normalized : ''
}

function profileValue(profile: Profile, key: string) {
  return typeof profile[key] === 'string' ? profile[key] as string : ''
}

function splitEmergencyContact(value: string) {
  const [name = '', relation = '', phone = ''] = value.split(' · ')
  return { name, relation, phone }
}

function toDateInput(value: Date | string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
}

function getInitialForm(employee: EditStaffDialogProps['employee']): FormState {
  const profile = (employee.profile && typeof employee.profile === 'object' ? employee.profile : {}) as Profile
  const emergency1 = splitEmergencyContact(profileValue(profile, 'emergencyContact1'))
  const emergency2 = splitEmergencyContact(profileValue(profile, 'emergencyContact2'))
  const [firstName = '', ...lastNameParts] = employee.name.split(' ')
  return {
    firstName,
    lastName: lastNameParts.join(' '),
    email: employee.email || '',
    phone: employee.phone || '',
    image: employee.image || '',
    employeeCode: profileValue(profile, 'employeeCode'),
    dateOfBirth: profileValue(profile, 'dateOfBirth'),
    gender: profileValue(profile, 'gender'),
    nationality: profileValue(profile, 'nationality') || 'Kenyan',
    joinDate: toDateInput(employee.joinDate),
    department: normalizeStaffDepartment(employee.department),
    role: editableRole(employee.role),
    bloodGroup: profileValue(profile, 'bloodGroup'),
    about: profileValue(profile, 'about'),
    salary: employee.salary.toString(),
    address: profileValue(profile, 'address'),
    country: profileValue(profile, 'country') || 'Kenya',
    state: profileValue(profile, 'state'),
    city: profileValue(profile, 'city'),
    zipcode: profileValue(profile, 'zipcode'),
    emergencyPhone1: emergency1.phone,
    emergencyRelation1: emergency1.relation,
    emergencyName1: emergency1.name,
    emergencyPhone2: emergency2.phone,
    emergencyRelation2: emergency2.relation,
    emergencyName2: emergency2.name,
    bankName: profileValue(profile, 'bankName'),
    bankAccountNumber: profileValue(profile, 'bankAccountNumber'),
    bankCode: profileValue(profile, 'bankCode'),
    bankBranch: profileValue(profile, 'bankBranch'),
    status: employee.status,
  }
}

export function EditStaffDialog({ employee, open, onOpenChange, assignableRoles }: EditStaffDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ employee: true, address: false, emergency: false, bank: false, account: false })
  const [form, setForm] = useState(() => getInitialForm(employee))

  useEffect(() => setForm(getInitialForm(employee)), [employee])

  const set = (key: keyof FormState, value: string) => setForm((current) => ({ ...current, [key]: value }))
  const toggle = (key: string) => setOpenSections((current) => ({ ...current, [key]: !current[key] }))

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email || !form.phone || !form.role) {
      setOpenSections((current) => ({ ...current, employee: true }))
      return notify.error('Complete the required employee information')
    }
    setIsLoading(true)
    try {
      await updateEmployee(employee.id, {
        name: `${form.firstName.trim()} ${form.lastName.trim()}`,
        email: form.email,
        phone: form.phone,
        image: form.image || null,
        role: form.role,
        department: form.department,
        salary: Number(form.salary || 0),
        status: form.status,
        joinDate: form.joinDate,
        profile: {
          employeeCode: form.employeeCode,
          dateOfBirth: form.dateOfBirth,
          gender: form.gender,
          nationality: form.nationality,
          bloodGroup: form.bloodGroup,
          about: form.about,
          address: form.address,
          country: form.country,
          state: form.state,
          city: form.city,
          zipcode: form.zipcode,
          emergencyContact1: [form.emergencyName1, form.emergencyRelation1, form.emergencyPhone1].filter(Boolean).join(' · '),
          emergencyContact2: [form.emergencyName2, form.emergencyRelation2, form.emergencyPhone2].filter(Boolean).join(' · '),
          bankName: form.bankName,
          bankAccountNumber: form.bankAccountNumber,
          bankCode: form.bankCode,
          bankBranch: form.bankBranch,
        },
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
      <DialogContent className="max-h-[94vh] overflow-y-auto border-[var(--dashboard-border)] bg-[var(--dashboard-background)] p-0 sm:max-w-[1200px]">
        <DialogHeader className="border-b border-[var(--dashboard-border)] px-6 py-5">
          <DialogTitle className="text-xl font-bold text-[var(--dashboard-text)]">Edit Employee</DialogTitle>
          <p className="text-sm text-[var(--dashboard-muted)]">Update employee information</p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <FormSection id="employee" title="Employee Information" icon={UserRound} open={openSections.employee} toggle={() => toggle('employee')}>
            <div className="mb-6"><StaffPhotoField name={`${form.firstName} ${form.lastName}`} value={form.image} onChange={(value) => set('image', value)} variant="employee-form" /></div>
            <div className="grid gap-x-6 gap-y-5 md:grid-cols-2 xl:grid-cols-3">
              <Field label="First Name" required><input required value={form.firstName} onChange={(e) => set('firstName', e.target.value)} className={inputClass} /></Field>
              <Field label="Last Name" required><input required value={form.lastName} onChange={(e) => set('lastName', e.target.value)} className={inputClass} /></Field>
              <Field label="Email" required><input required type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className={inputClass} /></Field>
              <Field label="Contact Number" required><input required type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} className={inputClass} /></Field>
              <Field label="Emp Code"><input value={form.employeeCode} onChange={(e) => set('employeeCode', e.target.value)} className={inputClass} /></Field>
              <Field label="Date of Birth"><input type="date" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} className={inputClass} /></Field>
              <Field label="Gender"><select value={form.gender} onChange={(e) => set('gender', e.target.value)} className={inputClass}><option value="">Select</option><option>Female</option><option>Male</option><option>Non-binary</option><option>Prefer not to say</option></select></Field>
              <Field label="Nationality"><input value={form.nationality} onChange={(e) => set('nationality', e.target.value)} className={inputClass} /></Field>
              <Field label="Joining Date" required><input required type="date" value={form.joinDate} onChange={(e) => set('joinDate', e.target.value)} className={inputClass} /></Field>
              <Field label="Department" required><select required value={form.department} onChange={(e) => set('department', e.target.value as StaffDepartment)} className={inputClass}>{STAFF_DEPARTMENTS.map((item) => <option key={item} value={item}>{STAFF_DEPARTMENT_LABELS[item]}</option>)}</select></Field>
              <Field label="Designation" required><select required value={form.role} onChange={(e) => set('role', e.target.value as StaffManagedRole)} className={inputClass}><option value="">Select</option>{assignableRoles.map((item) => <option key={item} value={item}>{STAFF_ROLE_LABELS[item]}</option>)}</select></Field>
              <Field label="Monthly Salary"><input type="number" min="0" value={form.salary} onChange={(e) => set('salary', e.target.value)} className={inputClass} /></Field>
              <Field label="Blood Group"><select value={form.bloodGroup} onChange={(e) => set('bloodGroup', e.target.value)} className={inputClass}><option value="">Select</option>{['A+','A-','B+','B-','AB+','AB-','O+','O-'].map((item) => <option key={item}>{item}</option>)}</select></Field>
              <Field label="Status"><select value={form.status} onChange={(e) => set('status', e.target.value)} className={inputClass}><option value="active">Active</option><option value="inactive">Inactive</option><option value="terminated">Terminated</option></select></Field>
              <label className={`${labelClass} md:col-span-2 xl:col-span-3`}>About<textarea maxLength={500} rows={4} value={form.about} onChange={(e) => set('about', e.target.value)} className="w-full rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] p-3 text-sm text-[var(--dashboard-text)] outline-none focus:ring-2 focus:ring-[var(--dashboard-accent-soft)]" /><span className="text-xs font-normal text-[var(--dashboard-muted)]">Maximum 500 characters</span></label>
            </div>
          </FormSection>

          <FormSection id="address" title="Address Information" icon={MapPin} open={openSections.address} toggle={() => toggle('address')}>
            <div className="grid gap-x-6 gap-y-5 md:grid-cols-2 xl:grid-cols-3"><Field label="Address"><input value={form.address} onChange={(e) => set('address', e.target.value)} className={inputClass} /></Field><Field label="Country"><input value={form.country} onChange={(e) => set('country', e.target.value)} className={inputClass} /></Field><Field label="State / County"><input value={form.state} onChange={(e) => set('state', e.target.value)} className={inputClass} /></Field><Field label="City"><input value={form.city} onChange={(e) => set('city', e.target.value)} className={inputClass} /></Field><Field label="Zipcode"><input value={form.zipcode} onChange={(e) => set('zipcode', e.target.value)} className={inputClass} /></Field></div>
          </FormSection>

          <FormSection id="emergency" title="Emergency Information" icon={CircleAlert} open={openSections.emergency} toggle={() => toggle('emergency')}>
            <div className="grid gap-x-6 gap-y-5 md:grid-cols-2 xl:grid-cols-3"><Field label="Emergency Contact Number 1"><input value={form.emergencyPhone1} onChange={(e) => set('emergencyPhone1', e.target.value)} className={inputClass} /></Field><Field label="Relation"><input value={form.emergencyRelation1} onChange={(e) => set('emergencyRelation1', e.target.value)} className={inputClass} /></Field><Field label="Name"><input value={form.emergencyName1} onChange={(e) => set('emergencyName1', e.target.value)} className={inputClass} /></Field><Field label="Emergency Contact Number 2"><input value={form.emergencyPhone2} onChange={(e) => set('emergencyPhone2', e.target.value)} className={inputClass} /></Field><Field label="Relation"><input value={form.emergencyRelation2} onChange={(e) => set('emergencyRelation2', e.target.value)} className={inputClass} /></Field><Field label="Name"><input value={form.emergencyName2} onChange={(e) => set('emergencyName2', e.target.value)} className={inputClass} /></Field></div>
          </FormSection>

          <FormSection id="bank" title="Bank Information" icon={Banknote} open={openSections.bank} toggle={() => toggle('bank')}>
            <div className="grid gap-x-6 gap-y-5 md:grid-cols-2 xl:grid-cols-4"><Field label="Bank Name"><input value={form.bankName} onChange={(e) => set('bankName', e.target.value)} className={inputClass} /></Field><Field label="Account Number"><input value={form.bankAccountNumber} onChange={(e) => set('bankAccountNumber', e.target.value)} className={inputClass} /></Field><Field label="Bank / SWIFT Code"><input value={form.bankCode} onChange={(e) => set('bankCode', e.target.value)} className={inputClass} /></Field><Field label="Branch"><input value={form.bankBranch} onChange={(e) => set('bankBranch', e.target.value)} className={inputClass} /></Field></div>
          </FormSection>

          <FormSection id="account" title="Account Status" icon={KeyRound} open={openSections.account} toggle={() => toggle('account')}>
            <p className="rounded-lg border border-[var(--dashboard-accent-soft-border)] bg-[var(--dashboard-accent-soft)] p-4 text-sm text-[var(--dashboard-text)]">Changing employee details updates the employee profile and linked login account. Passwords are managed by the employee through their secure account setup.</p>
          </FormSection>

          <div className="flex justify-end gap-3 border-t border-[var(--dashboard-border)] pt-5"><button type="button" onClick={() => onOpenChange(false)} disabled={isLoading} className="inline-flex h-10 items-center rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] px-4 text-sm font-semibold text-[var(--dashboard-text)] disabled:opacity-60">Cancel</button><button type="submit" disabled={isLoading} aria-label={isLoading ? 'Updating employee' : undefined} className={`inline-flex h-10 items-center justify-center rounded-lg bg-[var(--dashboard-accent-cta)] text-sm font-semibold text-[var(--dashboard-accent-cta-ink)] hover:bg-[var(--dashboard-accent-cta-hover)] disabled:opacity-60 ${isLoading ? 'w-10 px-0' : 'px-5'}`}>{isLoading ? <Loader2 className="h-4 w-4" label="Updating employee" /> : 'Update Employee'}</button></div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function FormSection({ id, title, icon: Icon, open, toggle, children }: { id: string; title: string; icon: typeof UserRound; open: boolean; toggle: () => void; children: React.ReactNode }) {
  return <section className="overflow-hidden rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)]"><button type="button" onClick={toggle} aria-expanded={open} aria-controls={`${id}-content`} className={`flex min-h-[52px] w-full items-center gap-2 px-5 py-4 text-left text-base font-semibold text-[var(--dashboard-text)] ${open ? 'border-b border-[var(--dashboard-border)]' : ''}`}><Icon className="h-4 w-4 text-[var(--dashboard-accent)]" /><span>{title}</span><ChevronDown className={`ml-auto h-4 w-4 text-[var(--dashboard-muted)] transition-transform ${open ? 'rotate-180' : ''}`} /></button>{open && <div id={`${id}-content`} className="p-5">{children}</div>}</section>
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className={labelClass}><span>{label}{required && <span className="ml-1 text-[var(--dashboard-danger)]">*</span>}</span>{children}</label>
}
