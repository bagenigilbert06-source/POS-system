'use client'

import { useTransition } from 'react'
import { Loader2, RotateCw } from 'lucide-react'
import { retryEtimsCreditNote, retryEtimsSubmission } from '@/app/actions/etims'
import { toast } from 'sonner'

export function EtimsRetryButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()
  return <button disabled={pending} onClick={() => startTransition(async () => { try { const result = await retryEtimsSubmission(id); result.status === 'ACCEPTED' ? toast.success('eTIMS invoice accepted') : toast.warning(result.message ?? `eTIMS status: ${result.status}`) } catch (error) { toast.error(error instanceof Error ? error.message : 'Retry failed') } })} className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold disabled:opacity-60">{pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCw className="h-3.5 w-3.5" />}Retry</button>
}

export function EtimsCreditRetryButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()
  return <button disabled={pending} onClick={() => startTransition(async () => { try { const result = await retryEtimsCreditNote(id); result.status === 'ACCEPTED' ? toast.success('eTIMS credit note accepted') : toast.warning('eTIMS credit note still requires review') } catch (error) { toast.error(error instanceof Error ? error.message : 'Credit-note retry failed') } })} className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold disabled:opacity-60">{pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCw className="h-3.5 w-3.5" />}Retry</button>
}
