import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

/** Legacy route: Finance reconciliation is now the single payment workspace. */
export default function MpesaReconciliationPage() {
  redirect('/dashboard/finance/reconciliation?channel=mpesa')
}
