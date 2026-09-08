'use strict';
// Uploads ONE file from server/downloads to Backblaze B2 (primary, bucket chosen
// by key-hash shard) with an awaited Vercel Blob mirror (capped at 800MB).
// Usage: node scripts/up-one.js "<name>" <contentType>
// Logs progress lines; exits 0 on success, 1 on failure.
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env.local') });
require('dotenv').config();

const name = process.argv[2];
const contentType = process.argv[3] || 'application/octet-stream';
if (!name) { console.error('Usage: node scripts/up-one.js "<name>" <contentType>'); process.exit(1); }

const full = path.join(__dirname, '..', 'server', 'downloads', name);
if (!fs.existsSync(full)) { console.error('Missing local file: ' + full); process.exit(1); }

const { b2Enabled, b2Write, bucketFor } = require('../server/lib/b2');
if (!b2Enabled()) { console.error('Backblaze B2 is not configured'); process.exit(1); }

(async () => {
  const buf = fs.readFileSync(full);
  console.log(`[${new Date().toISOString()}] Uploading ${name} (${(buf.length / 1048576).toFixed(1)} MB) to B2 bucket #${bucketFor('downloads/' + name)}...`);
  const out = await b2Write('downloads/' + name, buf, contentType);
  console.log(`[${new Date().toISOString()}] B2 DONE ${name} -> bucket "${out.bucket}"`);

  // Awaited Blob mirror (capped)
  const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
  if (TOKEN) {
    const { blobUsageBytes, BLOB_CAP_BYTES, accessMode, withFlip } = require('../server/lib/storage');
    const used = await blobUsageBytes().catch(() => 0);
    if (used + buf.length > BLOB_CAP_BYTES) {
      console.log(`[${new Date().toISOString()}] Blob mirror skipped (cap 800MB)`);
    } else {
      const { put } = require('@vercel/blob');
      const res = await withFlip(await accessMode(), (access) =>
        put('downloads/' + name, buf, { token: TOKEN, access, contentType, addRandomSuffix: false, allowOverwrite: true })
      );
      console.log(`[${new Date().toISOString()}] Blob mirror DONE -> ${res.url}`);
    }
  }
  console.log(`[${new Date().toISOString()}] DONE ${name}`);
})().catch((e) => { console.error(`[${new Date().toISOString()}] FAIL ${name}: ${e.message}`); process.exit(1); });
