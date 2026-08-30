'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Delete, LockKeyhole } from 'lucide-react';
import { LoadingSpinner as Loader2 } from '@/components/ui/page-loader';
import { unlockPosByPin } from '@/app/actions/pos-pin';
const keys = ['1','2','3','4','5','6','7','8','9','clear','0','delete'] as const;
export function PosPinLoginForm() {
  const router=useRouter(); const inputRef=useRef<HTMLInputElement>(null); const [pin,setPin]=useState(''); const [error,setError]=useState(''); const [pending,start]=useTransition(); const [context,setContext]=useState<{terminalName:string|null;branchName:string|null}>({terminalName:null,branchName:null});
  useEffect(()=>{inputRef.current?.focus(); void import('@/app/actions/pos-pin').then(({getPosTerminalContext})=>getPosTerminalContext().then(setContext))},[]);
  const submit=(value=pin)=>{if(value.length!==6||pending)return;start(async()=>{setError('');const result=await unlockPosByPin(value);if(!result.success){setPin('');setError('Invalid PIN or you are not authorized to use this terminal.');requestAnimationFrame(()=>inputRef.current?.focus());return;}router.replace('/dashboard/pos');router.refresh()})};
  const updatePin=(value:string)=>{const next=value.replace(/\D/g,'').slice(0,6);setPin(next);if(next.length===6&&!pending)requestAnimationFrame(()=>submit(next))};
  const press=(key:(typeof keys)[number])=>{setError('');if(key==='clear')setPin('');else if(key==='delete')setPin(v=>v.slice(0,-1));else updatePin(pin+key)};
  return <div className="w-full space-y-4">
    <label htmlFor="pos-pin" className="text-sm font-semibold text-zinc-800">POS PIN</label>
    <button type="button" onClick={()=>inputRef.current?.focus()} className="relative flex h-12 w-full items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 focus-within:border-[#d4aa00] focus-within:ring-2 focus-within:ring-[#ffda32]/30" aria-label="Enter six digit PIN">
      <div className="flex gap-4" aria-hidden="true">{Array.from({length:6},(_,i)=><span key={i} className={`h-3.5 w-3.5 rounded-full border-2 ${i<pin.length?'border-slate-900 bg-slate-900':'border-zinc-400 bg-transparent'}`} />)}</div>
      <input ref={inputRef} id="pos-pin" value={pin} onChange={e=>updatePin(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')submit()}} inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label="POS PIN" />
    </button>
    <div className="grid grid-cols-3 gap-2" aria-label="PIN keypad">{keys.map(key=><button key={key} type="button" disabled={pending} onClick={()=>{press(key);inputRef.current?.focus()}} className="flex h-12 items-center justify-center rounded-lg border border-zinc-200 bg-white text-base font-bold text-zinc-800 transition-colors hover:border-[#d4aa00] hover:bg-[#fff9df] active:scale-[.98] disabled:opacity-50">{key==='clear'?<span className="text-xs">Clear</span>:key==='delete'?<Delete className="h-4 w-4"/>:key}</button>)}</div>
    {error&&<p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-center text-sm text-red-700" role="alert">{error}</p>}
    <button type="button" onClick={submit} disabled={pin.length!==6||pending} className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#ffda32] text-sm font-extrabold text-slate-950 transition-colors hover:bg-[#e8c42d] disabled:bg-[#fff3b8] disabled:text-slate-500">{pending?<><Loader2 className="h-4 w-4"/>Unlocking…</>:<><LockKeyhole className="h-4 w-4"/>Unlock POS</>}</button>
    <div className="-mt-1 text-center text-xs leading-5 text-zinc-500"><p>Authorized staff only</p>{(context.terminalName||context.branchName)&&<p className="text-[11px] text-zinc-400">{[context.terminalName,context.branchName].filter(Boolean).join(' • ')}</p>}</div>
  </div>;
}
