const escapeHtml = (value: string) =>
  value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;',
      })[character]!
  );

export function emailVerificationEmail(input: {
  name?: string | null;
  email: string;
  verificationUrl: string;
}) {
  const displayName = escapeHtml(input.name?.trim() || 'there');
  const email = escapeHtml(input.email);
  const verificationUrl = escapeHtml(input.verificationUrl);

  return {
    subject: 'Verify your Pesaby email address',
    text: `Hello ${input.name?.trim() || 'there'},\n\nVerify ${input.email} for your Pesaby account:\n${input.verificationUrl}\n\nThis secure link expires in one hour. If you did not request this email, you can safely ignore it.`,
    html: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="dark light">
    <title>Verify your Pesaby email</title>
  </head>
  <body style="margin:0;background:#070707;color:#f5f5f7;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Confirm your email to secure your Pesaby account.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;background:#070707;">
      <tr>
        <td align="center" style="padding:40px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:560px;">
            <tr>
              <td style="padding:0 0 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="width:42px;height:42px;border-radius:12px;background:#ffd60a;color:#080808;text-align:center;font-size:24px;font-weight:900;line-height:42px;">P</td>
                    <td style="padding-left:12px;">
                      <div style="font-size:18px;font-weight:800;line-height:22px;color:#f5f5f7;">Pesaby</div>
                      <div style="font-size:12px;line-height:18px;color:#9b9ba1;">Business operations, in control</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="overflow:hidden;border:1px solid #292929;border-radius:18px;background:#111111;">
                <div style="height:4px;background:#ffd60a;"></div>
                <div style="padding:36px 36px 32px;">
                  <div style="display:inline-block;border:1px solid rgba(255,214,10,.28);border-radius:999px;background:rgba(255,214,10,.10);padding:6px 10px;color:#ffd60a;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;">Account security</div>
                  <h1 style="margin:22px 0 12px;color:#f5f5f7;font-size:28px;line-height:36px;font-weight:800;letter-spacing:-.02em;">Verify your email address</h1>
                  <p style="margin:0 0 14px;color:#c8c8cc;font-size:15px;line-height:24px;">Hello ${displayName},</p>
                  <p style="margin:0;color:#c8c8cc;font-size:15px;line-height:24px;">Confirm that <strong style="color:#f5f5f7;">${email}</strong> belongs to you. This keeps your Pesaby account secure and ensures important account messages reach the right person.</p>
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:28px 0 24px;">
                    <tr>
                      <td>
                        <a href="${verificationUrl}" style="display:block;border-radius:10px;background:#ffd60a;padding:14px 20px;color:#080808;font-size:15px;font-weight:800;line-height:20px;text-align:center;text-decoration:none;">Verify email address</a>
                      </td>
                    </tr>
                  </table>
                  <div style="border-radius:12px;background:#191919;padding:14px 16px;color:#9b9ba1;font-size:13px;line-height:20px;">
                    This secure link expires in <strong style="color:#d9d9dc;">one hour</strong>. If you did not request it, no action is needed.
                  </div>
                  <p style="margin:24px 0 6px;color:#77777d;font-size:12px;line-height:18px;">Button not working? Copy this link into your browser:</p>
                  <p style="margin:0;word-break:break-all;color:#b9a632;font-size:11px;line-height:17px;">${verificationUrl}</p>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 8px 0;color:#737378;font-size:12px;line-height:18px;text-align:center;">Sent securely by Pesaby · Please do not reply to this automated email.</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  };
}
