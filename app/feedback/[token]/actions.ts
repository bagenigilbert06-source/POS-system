'use server'
import { submitFeedback } from '@/lib/feedback/service'
export async function submitPublicFeedback(token: string, form: FormData) {
  return submitFeedback(token, { score: Number(form.get('score')), tags: form.getAll('tags').map(String), comment: String(form.get('comment') ?? '') })
}
