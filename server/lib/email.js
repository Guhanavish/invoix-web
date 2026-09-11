'use strict';

const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = Number(process.env.SMTP_PORT) || 465;
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || (SMTP_USER ? `Invoix <${SMTP_USER}>` : 'Invoix <no-reply@invoix.app>');

const EMAIL_ENABLED = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);

let transporter = null;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transporter;
}

// Sends an email. When SMTP is not configured, logs the message (dev mode)
// so flows still work locally without exposing secrets to clients.
async function sendMail({ to, subject, text, html }) {
  if (!EMAIL_ENABLED) {
    console.log(`[email] SMTP not configured — would send to ${to}: ${subject}\n${text || ''}`);
    return { dev: true, to, subject };
  }
  await getTransporter().sendMail({
    from: SMTP_FROM,
    to,
    subject,
    text,
    html: html || text,
  });
  return { dev: false, to, subject };
}

// Branded one-time-code email. Table layout + inline styles for maximum
// client compatibility (Gmail, Outlook, Apple Mail, mobile).
// kind: 'verify' (new account) | 'reset' (password recovery)
function otpEmail({ code, kind = 'verify', userId = '' }) {
  const isReset = kind === 'reset';
  const subject = isReset ? 'Reset your Invoix password' : 'Verify your Invoix email';
  const title = isReset ? 'Reset your password' : 'Verify your email';
  const intro = isReset
    ? 'Someone asked to reset the password for this Invoix account. Use the code below within <b>10 minutes</b>.'
    : 'Welcome to Invoix. Confirm this email address with the code below within <b>10 minutes</b> to open your folio.';
  const accountLine = userId
    ? `<p style="margin:0 0 20px;font-size:13px;color:#8a8580;">Account: <b style="color:#3d3a36;">${escapeHtml(String(userId))}</b></p>`
    : '';
  const text =
    `${title} — Invoix\n\n${isReset ? 'Someone asked to reset the password for this Invoix account.' : 'Welcome to Invoix. Confirm this email address to open your folio.'}\n` +
    (userId ? `Account: ${userId}\n` : '') +
    `\nYour code: ${code}\nValid for 10 minutes.\n\nIf you did not request this, just ignore this email — nothing will change.\n— The Invoix team`;
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f4f1ea;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your Invoix code is ${escapeHtml(String(code))} — valid for 10 minutes.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ea;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#fdfcf8;border:1px solid #e5ded2;border-radius:14px;overflow:hidden;">
<tr><td style="background:#1a1a18;padding:26px 32px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td style="font-family:Georgia,serif;font-size:22px;font-weight:bold;color:#fdfcf8;">Invoix</td>
<td align="right" style="font-family:monospace,monospace;font-size:10px;letter-spacing:2px;color:#9a9590;">LEDGER · BILLING · GST</td>
</tr></table>
</td></tr>
<tr><td style="padding:32px 32px 8px;font-family:Georgia,serif;font-size:24px;font-weight:bold;color:#1a1a18;">${title}</td></tr>
<tr><td style="padding:0 32px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#4a4642;">${intro}</td></tr>
<tr><td style="padding:8px 32px 0;">${accountLine}</td></tr>
<tr><td align="center" style="padding:12px 32px 4px;">
<div style="display:inline-block;background:#1a1a18;border-radius:12px;padding:18px 40px;font-family:monospace,monospace;font-size:34px;font-weight:bold;letter-spacing:10px;color:#f5b942;text-indent:10px;">${escapeHtml(String(code))}</div>
</td></tr>
<tr><td align="center" style="padding:10px 32px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#8a8580;">Valid for 10 minutes · one account, one code</td></tr>
<tr><td style="padding:20px 32px 8px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#6b6560;">If you did not request this, just ignore this email — nothing will change and no one else can use the code.</td></tr>
<tr><td style="padding:16px 32px 28px;border-top:1px solid #e5ded2;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.6;color:#9a9590;">Invoix · offline-first GST billing for Windows + live web mirror<br><a href="https://invoixweb.vercel.app" style="color:#c45a3c;text-decoration:none;">invoixweb.vercel.app</a></td></tr>
</table>
</td></tr>
</table>
</body></html>`;
  return { subject, text, html };
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

module.exports = { sendMail, EMAIL_ENABLED, otpEmail };
