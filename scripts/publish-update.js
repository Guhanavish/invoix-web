'use strict';

// One-command release publisher. Guarantees EXE + ZIP ship together:
//   1. Resolves target version (--version X.Y.Z or --bump patch|minor|major, default patch)
//   2. Updates desktop + web package.json + server/version.json
//   3. REFUSES to continue unless BOTH versioned artifacts exist in server/downloads
//      (this is what guarantees "zip updated without fail" on every exe update)
//   4. Uploads EXE + ZIP + version.json to Backblaze B2 (both buckets, sharded)
//      with an awaited Vercel Blob mirror (capped at 800MB)
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

const { b2Enabled, b2Write, bucketFor } = require('../server/lib/b2');
if (!b2Enabled()) {
  console.error('Backblaze B2 is not configured. Set B2_KEY_ID_1/B2_APP_KEY_1/B2_BUCKET_1 (+ _2).');
  process.exit(1);
}
const TOKEN = process.env.BLOB_READ_WRITE_TOKEN; // Blob mirror only (optional, capped)

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

async function mirrorBlob(key, buffer, contentType) {
  if (!TOKEN) return;
  try {
    const { blobUsageBytes, BLOB_CAP_BYTES, accessMode, withFlip } = require('../server/lib/storage');
    const used = await blobUsageBytes().catch(() => 0);
    if (used + buffer.length > BLOB_CAP_BYTES) {
      console.log(`  Blob mirror skipped for "${key}" (cap 800MB)`);
      return;
    }
    const { put } = require('@vercel/blob');
    const res = await withFlip(await accessMode(), (access) =>
      put(key, buffer, { token: TOKEN, access, contentType, addRandomSuffix: false, allowOverwrite: true })
    );
    console.log(`  Blob mirror -> ${res.url}`);
  } catch (e) {
    console.log(`  Blob mirror failed for "${key}": ${e.message}`);
  }
}

async function putFile(name, buffer, contentType) {
  const key = 'downloads/' + name;
  const out = await b2Write(key, buffer, contentType);
  console.log(`  B2 -> bucket "${out.bucket}"`);
  await mirrorBlob(key, buffer, contentType);
  return out;
}

async function putVersion(payload) {
  const buf = Buffer.from(JSON.stringify(payload, null, 2), 'utf8');
  const out = await b2Write('version.json', buf, 'application/json');
  console.log(`  B2 version.json -> bucket "${out.bucket}"`);
  await mirrorBlob('version.json', buf, 'application/json');
  return out;
}

async function loadAllUsers() {
  // Read users.json via tiered storage (B2 primary, Blob fallback)
  try {
    const { readJSON } = require('../server/lib/storage');
    return await readJSON('users.json');
  } catch (e) {
    console.log('Could not read users.json:', e.message);
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

  // 2. Upload artifacts + version manifest (B2 both buckets + Blob mirror)
  if (!opts.skipUpload) {
    for (const [name, full, type] of [[zipName, zipPath, 'application/zip'], [exeName, exePath, 'application/octet-stream']]) {
      const buf = fs.readFileSync(full);
      console.log(`Uploading ${name} (${(buf.length / 1048576).toFixed(1)} MB) to B2 bucket #${bucketFor('downloads/' + name)}...`);
      await putFile(name, buf, type);
      console.log(`Uploaded ${name}`);
    }
    await putVersion(versionPayload);
    console.log('Uploaded version.json');
  } else {
    console.log('--skip-upload: storage upload skipped.');
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
