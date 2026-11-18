import nodemailer, { type Transporter } from 'nodemailer';

export type MailTransportMode = 'smtp' | 'ethereal' | 'json';

interface MailerContext {
  transporter: Transporter;
  mode: MailTransportMode;
  from: string;
}

export interface SendPasswordResetEmailInput {
  to: string;
  fullName?: string | null;
  resetUrl: string;
  resetToken: string;
  expiresMinutes: number;
}

export interface SendEmailResult {
  messageId: string;
  transportMode: MailTransportMode;
  previewUrl: string | null;
}

let cachedContextPromise: Promise<MailerContext> | null = null;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function createMailerContext(): Promise<MailerContext> {
  const defaultFrom =
    process.env.SMTP_FROM || 'ElimuCore Security <no-reply@elimucore.ac.ke>';

  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const secure =
    process.env.SMTP_SECURE === 'true' || Number(process.env.SMTP_PORT) === 465;
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();

  if (host && user && pass) {
    const transporter = nodemailer.createTransport({
      host,
      port: Number.isFinite(port) && port > 0 ? port : 587,
      secure,
      auth: { user, pass },
    });

    return {
      transporter,
      mode: 'smtp',
      from: defaultFrom,
    };
  }

  // In non-production or unconfigured preview environments, attempt an Ethereal
  // SMTP test account first and fall back gracefully to jsonTransport if offline.
  if (process.env.NODE_ENV !== 'production') {
    try {
      const testAccount = await Promise.race([
        nodemailer.createTestAccount(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Ethereal account lookup timed out')), 4000)
        ),
      ]);

      const transporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });

      return {
        transporter,
        mode: 'ethereal',
        from: defaultFrom,
      };
    } catch {
      const transporter = nodemailer.createTransport({
        jsonTransport: true,
      });

      return {
        transporter,
        mode: 'json',
        from: defaultFrom,
      };
    }
  }

  throw new Error(
    'SMTP email service is not configured. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS.'
  );
}

async function getMailerContext(): Promise<MailerContext> {
  if (!cachedContextPromise) {
    cachedContextPromise = createMailerContext().catch((err) => {
      cachedContextPromise = null;
      throw err;
    });
  }
  return cachedContextPromise;
}

export async function sendPasswordResetEmail(
  input: SendPasswordResetEmailInput
): Promise<SendEmailResult> {
  const { transporter, mode, from } = await getMailerContext();

  const recipientName = input.fullName?.trim() || 'ElimuCore User';
  const safeName = escapeHtml(recipientName);
  const safeUrl = escapeHtml(input.resetUrl);
  const safeToken = escapeHtml(input.resetToken);

  const subject = 'Reset Your ElimuCore Password (Valid for 60 Minutes)';

  const text = [
    `Hello ${recipientName},`,
    '',
    'We received a request to reset the password for your ElimuCore account.',
    '',
    `Reset your password using this secure link (expires in ${input.expiresMinutes} minutes):`,
    input.resetUrl,
    '',
    `Or enter this single-use recovery token in the Reset Password dialog:`,
    input.resetToken,
    '',
    'If you did not request a password reset, you can safely ignore this email. Your existing password remains unchanged.',
    '',
    'ElimuCore Academic & Institutional Platform Security',
  ].join('\n');

  const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Password Reset — ElimuCore</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 8px 24px rgba(15,23,42,0.06);">
            <tr>
              <td style="background:linear-gradient(135deg,#064e3b,#0f172a);padding:24px 28px;color:#ffffff;">
                <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#6ee7b7;">ElimuCore Security</div>
                <h1 style="margin:6px 0 0;font-size:20px;font-weight:800;line-height:1.3;">Password Reset Request</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 14px;font-size:14px;line-height:1.6;">Hello <strong>${safeName}</strong>,</p>
                <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#334155;">
                  We received a request to reset the password linked to your ElimuCore institutional account. Click the button below to choose a new password.
                </p>
                <div style="margin:24px 0;text-align:center;">
                  <a href="${safeUrl}" style="display:inline-block;background-color:#047857;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 26px;border-radius:10px;">
                    Reset Account Password
                  </a>
                </div>
                <p style="margin:0 0 12px;font-size:12px;line-height:1.5;color:#475569;">
                  This recovery link and token are single-use and will expire automatically in <strong>${input.expiresMinutes} minutes</strong>.
                </p>
                <div style="margin:16px 0;padding:12px 14px;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
                  <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:4px;">Manual Recovery Token</div>
                  <code style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:12px;color:#0f172a;word-break:break-all;">${safeToken}</code>
                </div>
                <p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#64748b;">
                  If the button does not open, copy and paste this URL into your browser:<br />
                  <span style="color:#047857;word-break:break-all;">${safeUrl}</span>
                </p>
                <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 16px;" />
                <p style="margin:0;font-size:11px;line-height:1.5;color:#64748b;">
                  If you did not request this password reset, no action is required — your account remains secure.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();

  const info = await transporter.sendMail({
    from,
    to: input.to,
    subject,
    text,
    html,
  });

  const previewUrl =
    mode === 'ethereal' ? nodemailer.getTestMessageUrl(info) || null : null;

  return {
    messageId: info.messageId,
    transportMode: mode,
    previewUrl,
  };
}
