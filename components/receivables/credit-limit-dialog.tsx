'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Settings2 } from 'lucide-react'
import { setCustomerCreditLimit } from '@/app/actions/credit-sales'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/ui/page-loader'
import { notify } from '@/lib/notify'

type CreditCustomer = { id: string; name: string; creditLimit: string | null; currentBalance: string | null; status: string | null }
const currency = (value: string | number | null) => `KES ${Number(value ?? 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export function CreditLimitDialog({ customers }: { customers: CreditCustomer[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false), [customerId, setCustomerId] = useState(customers[0]?.id ?? ''), [limit, setLimit] = useState(customers[0]?.creditLimit ?? '0'), [busy, setBusy] = useState(false)
  const selected = useMemo(() => customers.find((item) => item.id === customerId), [customerId, customers])
  const choose = (id: string) => { setCustomerId(id); setLimit(customers.find((item) => item.id === id)?.creditLimit ?? '0') }
  const save = async () => { setBusy(true); try { await setCustomerCreditLimit({ customerId, creditLimit: Number(limit) }); notify.success('Customer credit limit saved'); setOpen(false); router.refresh() } catch (error) { notify.error(error instanceof Error ? error.message : 'Could not save credit limit') } finally { setBusy(false) } }
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button variant="outline"><Settings2 className="mr-2 h-4 w-4" />Credit limits</Button></DialogTrigger><DialogContent className="max-w-md"><DialogHeader><DialogTitle>Customer credit limit</DialogTitle><DialogDescription>Set the maximum unpaid balance this customer may hold. Existing debt cannot be hidden by lowering the limit.</DialogDescription></DialogHeader><div className="space-y-4"><div className="space-y-2"><Label htmlFor="limit-customer">Customer</Label><select id="limit-customer" value={customerId} onChange={(event) => choose(event.target.value)} className="h-9 w-full rounded-md border bg-background px-3 text-sm">{customers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div><div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/40 p-3 text-sm"><div><p className="text-xs text-muted-foreground">Current balance</p><p className="mt-1 font-semibold">{currency(selected?.currentBalance ?? null)}</p></div><div><p className="text-xs text-muted-foreground">Current limit</p><p className="mt-1 font-semibold">{currency(selected?.creditLimit ?? null)}</p></div></div><div className="space-y-2"><Label htmlFor="credit-limit">New limit (KES)</Label><Input id="credit-limit" type="number" min={selected?.currentBalance ?? 0} step="0.01" value={limit} onChange={(event) => setLimit(event.target.value)} /></div></div><div className="flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={() => setOpen(false)}>Cancel</Button><Button disabled={busy || !customerId || Number(limit) < Number(selected?.currentBalance ?? 0)} onClick={save}>{busy && <LoadingSpinner className="mr-2 h-4 w-4" />}Save limit</Button></div></DialogContent></Dialog>
}
