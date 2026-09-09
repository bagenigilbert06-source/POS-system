'use client'
import { useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
export function ForgotPasswordForm() { const [email,setEmail]=useState(''); const [sent,setSent]=useState(false); return sent ? <p className="text-sm">If this email exists, a secure reset link has been sent.</p> : <form className="space-y-4" onSubmit={async(e)=>{e.preventDefault();await authClient.requestPasswordReset({email,redirectTo:`${window.location.origin}/setup-account`});setSent(true)}}><Input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@business.com" required/><Button className="w-full">Send reset link</Button></form> }
