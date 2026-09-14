export type TransactionalEmail = { to: { email: string; name?: string }; subject: string; html: string; text: string }
export class EmailDeliveryError extends Error {
  constructor(message: string, readonly retryable: boolean) { super(message); this.name = 'EmailDeliveryError' }
}

export async function sendEmail(message: TransactionalEmail) {
  const apiKey = process.env.BREVO_API_KEY
  const fromEmail = process.env.EMAIL_FROM_ADDRESS
  const fromName = process.env.EMAIL_FROM_NAME || 'Pesaby'
  if (!apiKey || !fromEmail) {
    if (process.env.NODE_ENV === 'production') throw new Error('Transactional email is not configured')
    console.warn(`[email:development] ${message.subject} -> ${message.to.email}\n${message.text}`)
    return { delivered: false, development: true, providerMessageId: null }
  }
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST', headers: { accept: 'application/json', 'content-type': 'application/json', 'api-key': apiKey },
    body: JSON.stringify({ sender: { email: fromEmail, name: fromName }, to: [message.to], subject: message.subject, htmlContent: message.html, textContent: message.text }),
  })
  const body = await response.json().catch(() => ({})) as { messageId?: string }
  if (!response.ok) throw new EmailDeliveryError(`Transactional email delivery failed (${response.status})`, response.status === 408 || response.status === 429 || response.status >= 500)
  return { delivered: true, development: false, providerMessageId: body.messageId ?? null }
}
