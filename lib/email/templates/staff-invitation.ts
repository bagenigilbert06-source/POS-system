const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]!)

export function staffInvitationEmail(input: { employeeName: string; organizationName: string; branchName: string; role: string; inviterName: string; setupUrl: string }) {
  const name = escapeHtml(input.employeeName), business = escapeHtml(input.organizationName), location = escapeHtml(input.branchName), role = escapeHtml(input.role), inviter = escapeHtml(input.inviterName)
  return {
    subject: `You’ve been invited to ${input.organizationName} on Pesaby`,
    text: `${input.inviterName} invited you to join ${input.organizationName} as ${input.role} at ${input.branchName}. Set up your account: ${input.setupUrl}\n\nThis link expires in one hour and can only be used once.`,
    html: `<div style="background:#f6f7f9;padding:32px;font-family:Inter, sans-serif;color:#18181b"><div style="max-width:560px;margin:auto;background:#fff;border:1px solid #e4e4e7;border-radius:16px;padding:32px"><div style="font-weight:800;font-size:20px">Pesaby</div><h1 style="font-size:24px;margin:28px 0 8px">You’ve been invited</h1><p>Hello ${name},</p><p>${inviter} created an account for you.</p><table style="width:100%;background:#fafafa;border-radius:10px;padding:16px"><tr><td>Business</td><td><b>${business}</b></td></tr><tr><td>Location</td><td><b>${location}</b></td></tr><tr><td>Role</td><td><b>${role}</b></td></tr></table><p style="margin:28px 0"><a href="${escapeHtml(input.setupUrl)}" style="background:#e42527;color:white;text-decoration:none;padding:13px 20px;border-radius:8px;font-weight:700">Set up my account</a></p><p style="font-size:13px;color:#71717a">This secure link expires in one hour and can only be used once. If you were not expecting this invitation, ignore this email.</p></div></div>`,
  }
}
