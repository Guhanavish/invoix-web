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

module.exports = { sendMail, EMAIL_ENABLED };
