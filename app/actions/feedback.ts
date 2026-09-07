'use server'
import { createFeedbackInvitationForSale } from '@/lib/feedback/service'
export async function createSaleFeedbackInvitation(saleId: string) {
  const invitation = await createFeedbackInvitationForSale(saleId)
  return invitation ? { token: invitation.token } : null
}
