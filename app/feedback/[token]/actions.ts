'use server'
import { headers } from 'next/headers'
import { submitFeedback } from '@/lib/feedback/service'
const attempts = new Map<string, { count: number; resetAt: number }>()
function allow(key: string) {
  const now = Date.now(); const current = attempts.get(key)
  if (!current || current.resetAt <= now) { attempts.set(key, { count: 1, resetAt: now + 10 * 60_000 }); return true }
  if (current.count >= 5) return false
  current.count += 1; return true
}
export async function submitPublicFeedback(token: string, form: FormData) {
  const requestHeaders = await headers()
  const ip = requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!allow(`${token}:${ip}`)) throw new Error('Please wait a few minutes before trying again.')
  return submitFeedback(token, { score: Number(form.get('score')), tags: form.getAll('tags').map(String), comment: String(form.get('comment') ?? '') })
}
