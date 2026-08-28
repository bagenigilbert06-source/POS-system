'use client';

import { useState } from 'react';
import { MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { LoadingSpinner as Loader2 } from '@/components/ui/page-loader';
import { useRouter } from 'next/navigation';
import { notify } from '@/lib/notify';
import {
  createBranch,
  deleteEmptyBranch,
  updateBranch,
} from '@/app/actions/admin-actions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

type BranchRecord = {
  id: string;
  code: string;
  name: string;
  phone: string | null;
  address: string | null;
  region: string | null;
  city: string | null;
  timezone: string;
  isMain: boolean;
  staffCount: number;
};

const emptyForm = {
  name: '',
  code: '',
  phone: '',
  address: '',
  region: '',
  city: '',
  timezone: 'Africa/Nairobi',
};

export function BranchManagement({ branches }: { branches: BranchRecord[] }) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<BranchRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const submitCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await createBranch(form);
      notify.success('Branch created');
      setCreateOpen(false);
      setForm(emptyForm);
      router.refresh();
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : 'Unable to create branch'
      );
    } finally {
      setBusy(false);
    }
  };
  const submitEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    setBusy(true);
    try {
      await updateBranch(editing.id, form);
      notify.success('Branch updated');
      setEditing(null);
      router.refresh();
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : 'Unable to update branch'
      );
    } finally {
      setBusy(false);
    }
  };
  const remove = async (record: BranchRecord) => {
    if (
      !confirm(
        `Delete ${record.name}? Only an empty, non-main branch can be deleted.`
      )
    )
      return;
    setBusy(true);
    try {
      await deleteEmptyBranch(record.id);
      notify.success('Empty branch deleted');
      router.refresh();
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : 'Unable to delete branch'
      );
    } finally {
      setBusy(false);
    }
  };
  const startEdit = (record: BranchRecord) => {
    setForm({
      name: record.name,
      code: record.code,
      phone: record.phone || '',
      address: record.address || '',
      region: record.region || '',
      city: record.city || '',
      timezone: record.timezone,
    });
    setEditing(record);
  };

  return (
    <>
      <div className="flex justify-end">
        <Dialog
          open={createOpen}
          onOpenChange={(open) => {
            setCreateOpen(open);
            if (open) setForm(emptyForm);
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add branch
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create branch</DialogTitle>
              <DialogDescription>
                Add a new operating location. The creating admin receives branch
                access automatically.
              </DialogDescription>
            </DialogHeader>
            <BranchForm
              form={form}
              setForm={setForm}
              busy={busy}
              onSubmit={submitCreate}
              submitLabel="Create branch"
            />
          </DialogContent>
        </Dialog>
      </div>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {branches.map((record) => (
          <article key={record.id} className="app-panel overflow-hidden">
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff3be] text-[#8a6500]">
                  <MapPin className="h-4 w-4" />
                </span>
                {record.isMain && (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                    Main branch
                  </span>
                )}
              </div>
              <h2 className="mt-4 font-bold">{record.name}</h2>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {record.code}
              </p>
              <dl className="mt-4 space-y-2 text-sm">
                <Row
                  label="Location"
                  value={
                    [record.city, record.region].filter(Boolean).join(', ') ||
                    'Not configured'
                  }
                />
                <Row label="Phone" value={record.phone || 'Not configured'} />
                <Row label="Staff assigned" value={String(record.staffCount)} />
                <Row label="Timezone" value={record.timezone} />
              </dl>
            </div>
            <div className="flex gap-2 border-t p-3">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-2"
                onClick={() => startEdit(record)}
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
              {!record.isMain && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-destructive"
                  disabled={busy}
                  onClick={() => remove(record)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              )}
            </div>
          </article>
        ))}
      </section>
      <Dialog
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit branch</DialogTitle>
            <DialogDescription>
              Update the location identity and contact details.
            </DialogDescription>
          </DialogHeader>
          <BranchForm
            form={form}
            setForm={setForm}
            busy={busy}
            onSubmit={submitEdit}
            submitLabel="Save changes"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function BranchForm({
  form,
  setForm,
  busy,
  onSubmit,
  submitLabel,
}: {
  form: typeof emptyForm;
  setForm: React.Dispatch<React.SetStateAction<typeof emptyForm>>;
  busy: boolean;
  onSubmit: (event: React.FormEvent) => void;
  submitLabel: string;
}) {
  const field = (
    key: keyof typeof emptyForm,
    label: string,
    required = false
  ) => (
    <label className="space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      <input
        value={form[key]}
        onChange={(event) =>
          setForm((current) => ({ ...current, [key]: event.target.value }))
        }
        required={required}
        className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
      />
    </label>
  );
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {field('name', 'Branch name', true)}
        {field('code', 'Branch code', true)}
        {field('phone', 'Phone')}
        {field('city', 'City')}
        {field('region', 'Region')}
        {field('timezone', 'Timezone', true)}
      </div>
      {field('address', 'Address')}
      <Button type="submit" className="w-full" disabled={busy}>
        {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {submitLabel}
      </Button>
    </form>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="max-w-[60%] text-right font-medium">{value}</dd>
    </div>
  );
}
