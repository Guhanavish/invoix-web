'use strict';
// Emails every verified user about an app update.
// Usage: node scripts/notify-update.js [--version X.Y.Z] [--notes "..."]
// Reads version/notes from server/version.json by default.
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env.local') });
require('dotenv').config();

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
if (!TOKEN) { console.error('Missing BLOB_READ_WRITE_TOKEN'); process.exit(1); }

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { version: null, notes: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--version') out.version = args[++i];
    if (args[i] === '--notes') out.notes = args[++i];
  }
  return out;
}

async function readUsers() {
  const { get } = require('@vercel/blob');
  const parse = async (access) => {
    const r = await get('users.json', { token: TOKEN, access });
    if (!r) return null;
    const chunks = [];
    for await (const c of r.stream) chunks.push(Buffer.from(c));
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  };
  try { return await parse('private'); } catch (e) { return await parse('public'); }
}

async function main() {
  const opts = parseArgs();
  let version = opts.version;
  let notes = opts.notes;
  if (!version || notes === null) {
    try {
      const v = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'server', 'version.json'), 'utf8'));
      version = version || v.version;
      if (notes === null) notes = v.notes || '';
    } catch (e) {}
  }
  if (!version) { console.error('No version given and server/version.json unreadable'); process.exit(1); }

  const data = await readUsers().catch((e) => { console.log('Could not read users.json:', e.message); return null; });
  const users = (data && data.users) || {};
  const seen = new Set();
  const recipients = [];
  for (const [uid, u] of Object.entries(users)) {
    if (u && u.email && u.emailVerified !== false && /@/.test(String(u.email))) {
      const email = String(u.email).trim().toLowerCase();
      if (!seen.has(email)) { seen.add(email); recipients.push({ uid, email, name: u.name || uid }); }
    }
  }
  console.log(`Notifying ${recipients.length} verified user(s) about v${version}.`);
  if (!recipients.length) { console.log('No recipients — done.'); return; }

  const { sendMail } = require('../server/lib/email');
  const subject = `Invoix v${version} is available — auto-update ready`;
  let sent = 0;
  const failed = [];
  for (const r of recipients) {
    const text = [`Hi ${r.name},`, ``, `Invoix v${version} has been released.`, notes ? `What's new: ${notes}` : `It includes fixes and improvements.`, ``, `Your desktop app will detect the update automatically (Settings → App Updates) and install it in place — no need to re-download from the website.`, `You can also grab the latest portable ZIP or installer from https://invoixweb.vercel.app/#download`, ``, `— The Invoix team`].join('\n');
    try {
      await sendMail({ to: r.email, subject, text, html: `<p>Hi ${r.name},</p><p><b>Invoix v${version}</b> has been released.</p>${notes ? `<p>What's new: ${notes}</p>` : ''}<p>Your desktop app will detect the update automatically (<b>Settings → App Updates</b>) and install it in place — no need to re-download.</p><p><a href="https://invoixweb.vercel.app/#download">Download page</a></p><p>— The Invoix team</p>` });
      sent++;
      console.log(`  sent → ${r.email}`);
    } catch (e) {
      failed.push(r.email);
      console.log(`  FAILED ${r.email}: ${e.message}`);
    }
    await new Promise((r2) => setTimeout(r2, 400));
  }
  console.log(`Done: ${sent} sent, ${failed.length} failed.`);
  if (failed.length) { console.log('Failed: ' + failed.join(', ')); process.exit(1); }
}

main().catch((e) => { console.error('Notify failed:', e.message); process.exit(1); });
