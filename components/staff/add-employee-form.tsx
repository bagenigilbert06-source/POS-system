'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Banknote,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  KeyRound,
  MapPin,
  RefreshCw,
  UserRound,
} from 'lucide-react'
import { notify } from '@/lib/notify'
import { createEmployee } from '@/app/actions/staff-actions'
import { StaffPhotoField } from './staff-photo-field'
import { LoadingSpinner as Loader2 } from '@/components/ui/page-loader'
import { STAFF_DEPARTMENTS, STAFF_DEPARTMENT_LABELS, type StaffDepartment } from '@/lib/types/staff'
import { STAFF_ROLE_LABELS, type StaffManagedRole } from '@/lib/types/permissions'

type Props = {
  branches: Array<{ id: string; name: string }>
  shifts: Array<{ id: string; name: string; startTime: string; endTime: string }>
  assignableRoles: StaffManagedRole[]
}

const inputClass = 'h-10 w-full rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] px-3 text-sm text-[var(--dashboard-text)] outline-none transition focus:border-[var(--dashboard-accent-soft-border)] focus:ring-2 focus:ring-[var(--dashboard-accent-soft)]'
const labelClass = 'grid gap-2 text-sm font-medium text-[var(--dashboard-text)]'

export function AddEmployeeForm({ branches, shifts, assignableRoles }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState<Record<string, boolean>>({ employee: true, address: false, emergency: false, bank: false, password: false })
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', employeeCode: '', dateOfBirth: '', gender: '', nationality: 'Kenyan', joinDate: new Date().toISOString().slice(0, 10), shiftId: '', department: 'unassigned' as StaffDepartment, role: '' as StaffManagedRole | '', bloodGroup: '', about: '', image: '', branchId: branches[0]?.id ?? '', salary: '0',
    address: '', country: 'Kenya', state: '', city: '', zipcode: '',
    emergencyPhone1: '', emergencyRelation1: '', emergencyName1: '', emergencyPhone2: '', emergencyRelation2: '', emergencyName2: '',
    bankName: '', bankAccountNumber: '', bankCode: '', bankBranch: '',
  })
  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }))
  const reset = () => setForm((current) => ({ ...current, firstName: '', lastName: '', email: '', phone: '', employeeCode: '', dateOfBirth: '', gender: '', shiftId: '', role: '', bloodGroup: '', about: '', image: '', salary: '0', address: '', state: '', city: '', zipcode: '', emergencyPhone1: '', emergencyRelation1: '', emergencyName1: '', emergencyPhone2: '', emergencyRelation2: '', emergencyName2: '', bankName: '', bankAccountNumber: '', bankCode: '', bankBranch: '' }))

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email || !form.phone || !form.branchId || !form.role) {
      setOpen((current) => ({ ...current, employee: true }))
      return notify.error('Complete the required employee information')
    }
    setSaving(true)
    try {
      const result = await createEmployee({
        name: `${form.firstName.trim()} ${form.lastName.trim()}`,
        email: form.email,
        phone: form.phone,
        image: form.image || null,
        role: form.role,
        branchId: form.branchId,
        department: form.department,
        salary: Number(form.salary || 0),
        joinDate: form.joinDate,
        shiftId: form.shiftId || undefined,
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
      if (result.existingUser) notify.success('Existing Pesaby user added as an employee')
      else if (result.invitationSent) notify.success('Employee created and invitation sent')
      else notify.warning('Employee created. Configure transactional email to deliver the setup invitation.')
      router.push('/dashboard/staff')
      router.refresh()
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Failed to add employee')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-[1600px] space-y-5 pb-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Link href="/dashboard/staff" aria-label="Back to employees" className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--dashboard-accent-cta)] text-[var(--dashboard-accent-cta-ink)] transition hover:bg-[var(--dashboard-accent-cta-hover)]"><ArrowLeft className="h-4 w-4" /></Link>
          <div>
            <h1 className="text-xl font-bold text-[var(--dashboard-text)]">Add Employee</h1>
            <p className="mt-1 text-sm text-[var(--dashboard-muted)]">Create new employee</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={reset} title="Reset form" aria-label="Reset form" className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] text-[var(--dashboard-muted)] hover:bg-[var(--dashboard-surface-subtle)]"><RefreshCw className="h-4 w-4" /></button>
          <button type="button" onClick={() => setOpen({ employee: false, address: false, emergency: false, bank: false, password: false })} title="Collapse all sections" aria-label="Collapse all sections" className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] text-[var(--dashboard-muted)] hover:bg-[var(--dashboard-surface-subtle)]"><ChevronUp className="h-4 w-4" /></button>
          <Link href="/dashboard/staff" className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--dashboard-text)] px-4 text-sm font-semibold text-[var(--dashboard-surface)]"><ArrowLeft className="h-4 w-4" />Back to List</Link>
        </div>
      </header>

      <FormSection id="employee" title="Employee Information" icon={UserRound} open={open.employee} toggle={() => setOpen((current) => ({ ...current, employee: !current.employee }))}>
        <div className="mb-6"><StaffPhotoField name={`${form.firstName} ${form.lastName}`} value={form.image} onChange={(value) => set('image', value)} variant="employee-form" /></div>
        <div className="grid gap-x-6 gap-y-5 md:grid-cols-2 xl:grid-cols-3">
          <Field label="First Name" required><input required value={form.firstName} onChange={(e) => set('firstName', e.target.value)} className={inputClass} /></Field>
          <Field label="Last Name" required><input required value={form.lastName} onChange={(e) => set('lastName', e.target.value)} className={inputClass} /></Field>
          <Field label="Email" required><input required type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className={inputClass} /></Field>
          <Field label="Contact Number" required><input required type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} className={inputClass} /></Field>
          <Field label="Emp Code"><input value={form.employeeCode} onChange={(e) => set('employeeCode', e.target.value)} placeholder="Generated automatically if blank" className={inputClass} /></Field>
          <Field label="Date of Birth"><input type="date" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} className={inputClass} /></Field>
          <Field label="Gender"><select value={form.gender} onChange={(e) => set('gender', e.target.value)} className={inputClass}><option value="">Select</option><option>Female</option><option>Male</option><option>Non-binary</option><option>Prefer not to say</option></select></Field>
          <Field label="Nationality"><input value={form.nationality} onChange={(e) => set('nationality', e.target.value)} className={inputClass} /></Field>
          <Field label="Joining Date" required><input required type="date" value={form.joinDate} onChange={(e) => set('joinDate', e.target.value)} className={inputClass} /></Field>
          <Field label="Shift"><select value={form.shiftId} onChange={(e) => set('shiftId', e.target.value)} className={inputClass}><option value="">Select</option>{shifts.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.startTime}–{item.endTime}</option>)}</select></Field>
          <Field label="Department" required><select required value={form.department} onChange={(e) => set('department', e.target.value as StaffDepartment)} className={inputClass}>{STAFF_DEPARTMENTS.map((item) => <option key={item} value={item}>{STAFF_DEPARTMENT_LABELS[item]}</option>)}</select></Field>
          <Field label="Designation" required><select required value={form.role} onChange={(e) => set('role', e.target.value as StaffManagedRole)} className={inputClass}><option value="">Select</option>{assignableRoles.map((item) => <option key={item} value={item}>{STAFF_ROLE_LABELS[item]}</option>)}</select></Field>
          <Field label="Assigned Branch" required><select required value={form.branchId} onChange={(e) => set('branchId', e.target.value)} className={inputClass}>{branches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
          <Field label="Monthly Salary"><input type="number" min="0" value={form.salary} onChange={(e) => set('salary', e.target.value)} className={inputClass} /></Field>
          <Field label="Blood Group"><select value={form.bloodGroup} onChange={(e) => set('bloodGroup', e.target.value)} className={inputClass}><option value="">Select</option>{['A+','A-','B+','B-','AB+','AB-','O+','O-'].map((item) => <option key={item}>{item}</option>)}</select></Field>
          <label className={`${labelClass} md:col-span-2 xl:col-span-3`}>About<textarea maxLength={500} rows={4} value={form.about} onChange={(e) => set('about', e.target.value)} className="w-full rounded-md border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] p-3 text-sm outline-none focus:ring-2 focus:ring-[var(--dashboard-accent-soft)]" /><span className="text-xs font-normal text-[var(--dashboard-muted)]">Maximum 500 characters</span></label>
        </div>
      </FormSection>

      <FormSection id="address" title="Address Information" icon={MapPin} open={open.address} toggle={() => setOpen((current) => ({ ...current, address: !current.address }))}>
        <div className="grid gap-x-6 gap-y-5 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Address"><input value={form.address} onChange={(e) => set('address', e.target.value)} className={inputClass} /></Field>
          <Field label="Country"><input value={form.country} onChange={(e) => set('country', e.target.value)} className={inputClass} /></Field>
          <Field label="State / County"><input value={form.state} onChange={(e) => set('state', e.target.value)} className={inputClass} /></Field>
          <Field label="City"><input value={form.city} onChange={(e) => set('city', e.target.value)} className={inputClass} /></Field>
          <Field label="Zipcode"><input value={form.zipcode} onChange={(e) => set('zipcode', e.target.value)} className={inputClass} /></Field>
        </div>
      </FormSection>

      <FormSection id="emergency" title="Emergency Information" icon={CircleAlert} open={open.emergency} toggle={() => setOpen((current) => ({ ...current, emergency: !current.emergency }))}>
        <div className="grid gap-x-6 gap-y-5 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Emergency Contact Number 1"><input value={form.emergencyPhone1} onChange={(e) => set('emergencyPhone1', e.target.value)} className={inputClass} /></Field><Field label="Relation"><input value={form.emergencyRelation1} onChange={(e) => set('emergencyRelation1', e.target.value)} className={inputClass} /></Field><Field label="Name"><input value={form.emergencyName1} onChange={(e) => set('emergencyName1', e.target.value)} className={inputClass} /></Field>
          <Field label="Emergency Contact Number 2"><input value={form.emergencyPhone2} onChange={(e) => set('emergencyPhone2', e.target.value)} className={inputClass} /></Field><Field label="Relation"><input value={form.emergencyRelation2} onChange={(e) => set('emergencyRelation2', e.target.value)} className={inputClass} /></Field><Field label="Name"><input value={form.emergencyName2} onChange={(e) => set('emergencyName2', e.target.value)} className={inputClass} /></Field>
        </div>
      </FormSection>

      <FormSection id="bank" title="Bank Information" icon={Banknote} open={open.bank} toggle={() => setOpen((current) => ({ ...current, bank: !current.bank }))}>
        <div className="grid gap-x-6 gap-y-5 md:grid-cols-2 xl:grid-cols-4"><Field label="Bank Name"><input value={form.bankName} onChange={(e) => set('bankName', e.target.value)} className={inputClass} /></Field><Field label="Account Number"><input value={form.bankAccountNumber} onChange={(e) => set('bankAccountNumber', e.target.value)} className={inputClass} /></Field><Field label="Bank / SWIFT Code"><input value={form.bankCode} onChange={(e) => set('bankCode', e.target.value)} className={inputClass} /></Field><Field label="Branch"><input value={form.bankBranch} onChange={(e) => set('bankBranch', e.target.value)} className={inputClass} /></Field></div>
      </FormSection>

      <FormSection id="password" title="Secure Account Setup" icon={KeyRound} open={open.password} toggle={() => setOpen((current) => ({ ...current, password: !current.password }))}>
        <div className="rounded-lg border border-[var(--dashboard-accent-soft-border)] bg-[var(--dashboard-accent-soft)] p-4 text-sm text-[var(--dashboard-text)]"><p className="font-semibold">The employee creates their own password.</p><p className="mt-1 text-[var(--dashboard-muted)]">After saving, Pesaby sends a secure one-time setup link to the employee’s email. Administrators never need to know or store an employee password.</p></div>
      </FormSection>

      <div className="flex justify-end gap-3 border-t border-[var(--dashboard-border)] pt-5">
        <Link href="/dashboard/staff" className="inline-flex h-10 items-center rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)] px-4 text-sm font-semibold text-[var(--dashboard-text)]">Cancel</Link>
        <button disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--dashboard-accent-cta)] px-5 text-sm font-semibold text-[var(--dashboard-accent-cta-ink)] hover:bg-[var(--dashboard-accent-cta-hover)] disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />}Add Employee</button>
      </div>
    </form>
  )
}

function FormSection({ id, title, icon: Icon, open, toggle, children }: { id: string; title: string; icon: typeof UserRound; open: boolean; toggle: () => void; children: React.ReactNode }) {
  return <section className="overflow-hidden rounded-lg border border-[var(--dashboard-border)] bg-[var(--dashboard-surface)]"><button type="button" onClick={toggle} aria-expanded={open} aria-controls={`${id}-content`} className={`flex min-h-[52px] w-full items-center gap-2 px-5 py-4 text-left text-base font-semibold text-[var(--dashboard-text)] ${open ? 'border-b border-[var(--dashboard-border)]' : ''}`}><Icon className="h-4 w-4 text-[var(--dashboard-accent)]" /><span>{title}</span><ChevronDown className={`ml-auto h-4 w-4 text-[var(--dashboard-muted)] transition-transform ${open ? 'rotate-180' : ''}`} /></button>{open && <div id={`${id}-content`} className="p-5">{children}</div>}</section>
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className={labelClass}><span>{label}{required && <span className="ml-1 text-[var(--dashboard-danger)]">*</span>}</span>{children}</label>
}
