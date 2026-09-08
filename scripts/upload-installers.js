'use strict';

// Uploads the local installers in server/downloads to Backblaze B2
// (primary, sharded across both buckets) with an awaited Vercel Blob mirror
// (capped at 800MB) so the production site can serve them.
// Requires B2 keys + BLOB_READ_WRITE_TOKEN in env or server/.env.local.
// Usage: node scripts/upload-installers.js

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env.local') });
require('dotenv').config();

const { b2Enabled, b2Write, bucketFor } = require('../server/lib/b2');
const { blobUsageBytes, BLOB_CAP_BYTES } = require('../server/lib/storage');
const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

const DOWNLOADS_DIR = path.join(__dirname, '..', 'server', 'downloads');

async function mirrorToBlob(name, buffer, contentType) {
  if (!TOKEN) return;
  const used = await blobUsageBytes().catch(() => 0);
  if (used + buffer.length > BLOB_CAP_BYTES) {
    console.log(`  Blob mirror skipped (cap 800MB: used ${(used / 1048576).toFixed(0)}MB)`);
    return;
  }
  const { put } = require('@vercel/blob');
  const { accessMode, withFlip } = require('../server/lib/storage');
  const res = await withFlip(await accessMode(), (access) =>
    put('downloads/' + name, buffer, { token: TOKEN, access, contentType, addRandomSuffix: false, allowOverwrite: true })
  );
  console.log(`  Blob mirror -> ${res.url}`);
}

async function main() {
  if (!b2Enabled()) {
    console.error('Backblaze B2 is not configured. Set B2_KEY_ID_1/B2_APP_KEY_1/B2_BUCKET_1 (+ _2).');
    process.exit(1);
  }
  const names = fs.readdirSync(DOWNLOADS_DIR).filter((f) => /\.(zip|exe)$/i.test(f));
  for (const name of names) {
    const full = path.join(DOWNLOADS_DIR, name);
    const buffer = fs.readFileSync(full);
    const ext = path.extname(name).toLowerCase();
    const contentType = ext === '.exe' ? 'application/octet-stream' : 'application/zip';
    console.log(`Uploading ${name} (${(buffer.length / 1024 / 1024).toFixed(1)} MB) to B2 bucket #${bucketFor('downloads/' + name)}...`);
    const out = await b2Write('downloads/' + name, buffer, contentType);
    console.log(`  B2 -> bucket "${out.bucket}" (${(out.size / 1024 / 1024).toFixed(1)} MB)`);
    await mirrorToBlob(name, buffer, contentType);
  }
  console.log('Done.');
}

main().catch((e) => {
  console.error('Upload failed:', e.message);
  process.exit(1);
});
