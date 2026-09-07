'use strict';

// One-command release publisher. Guarantees EXE + ZIP ship together:
//   1. Resolves target version (--version X.Y.Z or --bump patch|minor|major, default patch)
//   2. Updates desktop + web package.json + server/version.json
//   3. REFUSES to continue unless BOTH versioned artifacts exist in server/downloads
//      (this is what guarantees "zip updated without fail" on every exe update)
//   4. Uploads EXE + ZIP + version.json to Vercel Blob
//   5. Emails every verified user about the update (unless --skip-email)
//
// Usage:
//   node scripts/publish-update.js --notes "Dark mode fix, auto-update" [--version 1.0.1] [--mandatory] [--skip-email] [--skip-upload]
//
// The desktop side must first run its build-release script so both artifacts exist.

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env.local') });
require('dotenv').config();

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
if (!TOKEN) {
  console.error('Missing BLOB_READ_WRITE_TOKEN. Get it from Vercel -> Storage -> Blob store -> Settings.');
  process.exit(1);
}

const ROOT = path.join(__dirname, '..');
const DESKTOP_PKG = 'G:\\Business Software Development\\Business Software Development\\package.json';
const WEB_PKG = path.join(ROOT, 'package.json');
const DOWNLOADS_DIR = path.join(ROOT, 'server', 'downloads');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { bump: 'patch', version: null, notes: '', mandatory: false, skipEmail: false, skipUpload: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--version') out.version = args[++i];
    else if (a === '--bump') out.bump = args[++i];
    else if (a === '--notes') out.notes = args[++i];
    else if (a === '--mandatory') out.mandatory = true;
    else if (a === '--skip-email') out.skipEmail = true;
    else if (a === '--skip-upload') out.skipUpload = true;
  }
  return out;
}

function bumpVersion(current, kind) {
  const parts = String(current).replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
  while (parts.length < 3) parts.push(0);
  if (kind === 'major') return `${parts[0] + 1}.0.0`;
  if (kind === 'minor') return `${parts[0]}.${parts[1] + 1}.0`;
  return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
}

function setPkgVersion(file, version) {
  const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
  pkg.version = version;
  fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');
}

async function putFile(name, buffer, contentType) {
  const { put } = require('@vercel/blob');
  try {
    return await put('downloads/' + name, buffer, { token: TOKEN, access: 'public', contentType, addRandomSuffix: false, allowOverwrite: true });
  } catch (e) {
    if (e.name === 'BlobAccessError' || /access/i.test(e.message || '')) {
      return await put('downloads/' + name, buffer, { token: TOKEN, access: 'private', contentType, addRandomSuffix: false, allowOverwrite: true });
    }
    throw e;
  }
}

async function putVersion(payload) {
  const { put } = require('@vercel/blob');
  const buf = Buffer.from(JSON.stringify(payload, null, 2), 'utf8');
  try {
    return await put('version.json', buf, { token: TOKEN, access: 'public', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true });
  } catch (e) {
    if (e.name === 'BlobAccessError' || /access/i.test(e.message || '')) {
      return await put('version.json', buf, { token: TOKEN, access: 'private', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true });
    }
    throw e;
  }
}

async function loadAllUsers() {
  // Read users.json straight from Blob (production truth)
  const { get } = require('@vercel/blob');
  const tryAccess = async (access) => {
    const r = await get('users.json', { token: TOKEN, access });
    if (!r) return null;
    const chunks = [];
    for await (const c of r.stream) chunks.push(Buffer.from(c));
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  };
  try {
    try { return await tryAccess('private'); } catch (e) { return await tryAccess('public'); }
  } catch (e) {
    console.log('Could not read users.json from Blob:', e.message);
    return null;
  }
}

async function emailAllUsers(version, notes) {
  const data = await loadAllUsers();
  const users = (data && data.users) || {};
  const recipients = [];
  for (const [uid, u] of Object.entries(users)) {
    if (u && u.email && u.emailVerified !== false && /@/.test(String(u.email))) {
      recipients.push({ uid, email: String(u.email).trim().toLowerCase(), name: u.name || uid });
    }
  }
  // De-dupe by email
  const seen = new Set();
  const unique = recipients.filter((r) => (seen.has(r.email) ? false : (seen.add(r.email), true)));
  console.log(`Found ${unique.length} verified user email(s) to notify.`);

  if (unique.length === 0) {
    console.log('No recipients — skipping email.');
    return { sent: 0, failed: 0 };
  }

  // Lazy-require so missing SMTP config fails gracefully, not at import time
  let sendMail;
  try {
    sendMail = require('../server/lib/email').sendMail;
  } catch (e) {
    console.log('Email module unavailable:', e.message);
    return { sent: 0, failed: unique.length };
  }

  let sent = 0;
  const failed = [];
  const subject = `Invoix v${version} is available — auto-update ready`;
  for (const r of unique) {
    const text = [
      `Hi ${r.name},`,
      ``,
      `Invoix v${version} has been released.`,
      notes ? `What's new: ${notes}` : `It includes fixes and improvements.`,
      ``,
      `Your desktop app will detect the update automatically (Settings → App Updates) and install it in place — no need to re-download from the website.`,
      `You can also grab the latest portable ZIP or installer from https://invoixweb.vercel.app/#download`,
      ``,
      `— The Invoix team`,
    ].join('\n');
    try {
      await sendMail({ to: r.email, subject, text, html: `<p>Hi ${r.name},</p><p><b>Invoix v${version}</b> has been released.</p>${notes ? `<p>What's new: ${notes}</p>` : ''}<p>Your desktop app will detect the update automatically (<b>Settings → App Updates</b>) and install it in place — no need to re-download.</p><p><a href="https://invoixweb.vercel.app/#download">Download page</a></p><p>— The Invoix team</p>` });
      sent++;
      console.log(`  mailed ${r.email}`);
    } catch (e) {
      failed.push(r.email);
      console.log(`  FAILED ${r.email}: ${e.message}`);
    }
    await new Promise((r2) => setTimeout(r2, 400)); // gentle rate limit
  }
  return { sent, failed: failed.length, failedList: failed };
}

async function main() {
  const opts = parseArgs();
  const desktopPkg = JSON.parse(fs.readFileSync(DESKTOP_PKG, 'utf8'));
  const target = opts.version ? String(opts.version).replace(/^v/i, '') : bumpVersion(desktopPkg.version, opts.bump);
  if (!/^\d+\.\d+\.\d+$/.test(target)) {
    console.error(`Invalid version "${target}". Use X.Y.Z`);
    process.exit(1);
  }

  const zipName = `Invoix-v${target}.zip`;
  const exeName = `Invoix Setup ${target}.exe`;
  const zipPath = path.join(DOWNLOADS_DIR, zipName);
  const exePath = path.join(DOWNLOADS_DIR, exeName);

  // HARD GATE: both artifacts must exist — this enforces zip+exe together, no silent skip
  const missing = [];
  if (!fs.existsSync(zipPath)) missing.push(zipName);
  if (!fs.existsSync(exePath)) missing.push(exeName);
  if (missing.length > 0) {
    console.error(`REFUSED: missing artifact(s) for v${target} in server/downloads: ${missing.join(', ')}`);
    console.error('Run the desktop build-release script first so BOTH files are rebuilt from the same source, then re-run publish.');
    process.exit(1);
  }

  const zipSize = fs.statSync(zipPath).size;
  const exeSize = fs.statSync(exePath).size;
  console.log(`Publishing v${target} (zip ${(zipSize / 1048576).toFixed(1)} MB, exe ${(exeSize / 1048576).toFixed(1)} MB)`);

  // 1. Bump versions everywhere
  setPkgVersion(DESKTOP_PKG, target);
  try { setPkgVersion(WEB_PKG, target); } catch (e) { console.log('Web package.json version update skipped:', e.message); }
  const versionPayload = {
    version: target,
    notes: opts.notes || '',
    mandatory: !!opts.mandatory,
    publishedAt: new Date().toISOString(),
    zip: { name: zipName, size: zipSize, url: `/api/download/installer/${encodeURIComponent(zipName)}` },
    exe: { name: exeName, size: exeSize, url: `/api/download/installer/${encodeURIComponent(exeName)}` },
  };
  fs.writeFileSync(path.join(ROOT, 'server', 'version.json'), JSON.stringify(versionPayload, null, 2));
  console.log('Version files updated.');

  // 2. Upload artifacts + version manifest
  if (!opts.skipUpload) {
    for (const [name, full, type] of [[zipName, zipPath, 'application/zip'], [exeName, exePath, 'application/octet-stream']]) {
      const buf = fs.readFileSync(full);
      console.log(`Uploading ${name} (${(buf.length / 1048576).toFixed(1)} MB)...`);
      const res = await putFile(name, buf, type);
      console.log(`Uploaded ${name} -> ${res.url}`);
    }
    const vres = await putVersion(versionPayload);
    console.log(`Uploaded version.json -> ${vres.url}`);
  } else {
    console.log('--skip-upload: Blob upload skipped.');
  }

  // 3. Email every verified user
  if (!opts.skipEmail) {
    const result = await emailAllUsers(target, opts.notes);
    console.log(`Email done: ${result.sent} sent, ${result.failed} failed.`);
    if (result.failedList && result.failedList.length) console.log('Failed:', result.failedList.join(', '));
  } else {
    console.log('--skip-email: notification emails skipped.');
  }

  console.log(`\nDone. v${target} published. Commit + push web repo to deploy the landing page.`);
}

main().catch((e) => {
  console.error('Publish failed:', e.message);
  process.exit(1);
});
