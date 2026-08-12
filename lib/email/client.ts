export type TransactionalEmail = { to: { email: string; name?: string }; subject: string; html: string; text: string }

export async function sendEmail(message: TransactionalEmail) {
  const apiKey = process.env.BREVO_API_KEY
  const fromEmail = process.env.EMAIL_FROM_ADDRESS
  const fromName = process.env.EMAIL_FROM_NAME || 'Pesaby'
  if (!apiKey || !fromEmail) {
    if (process.env.NODE_ENV === 'production') throw new Error('Transactional email is not configured')
    console.warn(`[email:development] ${message.subject} -> ${message.to.email}\n${message.text}`)
    return { delivered: false, development: true }
  }
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST', headers: { accept: 'application/json', 'content-type': 'application/json', 'api-key': apiKey },
    body: JSON.stringify({ sender: { email: fromEmail, name: fromName }, to: [message.to], subject: message.subject, htmlContent: message.html, textContent: message.text }),
  })
  if (!response.ok) throw new Error(`Transactional email delivery failed (${response.status})`)
  return { delivered: true, development: false }
}
