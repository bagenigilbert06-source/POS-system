'use client'

import { useTransition } from 'react'
import { RotateCw } from 'lucide-react'
import { LoadingSpinner as Loader2 } from '@/components/ui/page-loader'
import { retryEtimsCreditNote, retryEtimsSubmission } from '@/app/actions/etims'
import { notify } from '@/lib/notify'

export function EtimsRetryButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()
  return <button disabled={pending} onClick={() => startTransition(async () => { try { const result = await retryEtimsSubmission(id); result.status === 'ACCEPTED' ? notify.success('eTIMS invoice accepted') : notify.warning(result.message ?? `eTIMS status: ${result.status}`) } catch (error) { notify.error(error instanceof Error ? error.message : 'Retry failed') } })} className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold disabled:opacity-60">{pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCw className="h-3.5 w-3.5" />}Retry</button>
}

export function EtimsCreditRetryButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()
  return <button disabled={pending} onClick={() => startTransition(async () => { try { const result = await retryEtimsCreditNote(id); result.status === 'ACCEPTED' ? notify.success('eTIMS credit note accepted') : notify.warning('eTIMS credit note still requires review') } catch (error) { notify.error(error instanceof Error ? error.message : 'Credit-note retry failed') } })} className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold disabled:opacity-60">{pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCw className="h-3.5 w-3.5" />}Retry</button>
}
