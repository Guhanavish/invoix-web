'use strict';
// Uploads ONE file from server/downloads to Vercel Blob.
// Usage: node scripts/up-one.js "<name>" <contentType>
// Logs progress lines; exits 0 on success, 1 on failure.
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env.local') });
require('dotenv').config();

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
if (!TOKEN) { console.error('Missing BLOB_READ_WRITE_TOKEN'); process.exit(1); }

const name = process.argv[2];
const contentType = process.argv[3] || 'application/octet-stream';
if (!name) { console.error('Usage: node scripts/up-one.js "<name>" <contentType>'); process.exit(1); }

const full = path.join(__dirname, '..', 'server', 'downloads', name);
if (!fs.existsSync(full)) { console.error('Missing local file: ' + full); process.exit(1); }

const { put } = require('@vercel/blob');
(async () => {
  const buf = fs.readFileSync(full);
  console.log(`[${new Date().toISOString()}] Uploading ${name} (${(buf.length / 1048576).toFixed(1)} MB)...`);
  let res;
  try {
    res = await put('downloads/' + name, buf, { token: TOKEN, access: 'public', contentType, addRandomSuffix: false, allowOverwrite: true });
  } catch (e) {
    if (e.name === 'BlobAccessError' || /access/i.test(e.message || '')) {
      res = await put('downloads/' + name, buf, { token: TOKEN, access: 'private', contentType, addRandomSuffix: false, allowOverwrite: true });
    } else throw e;
  }
  console.log(`[${new Date().toISOString()}] DONE ${name} -> ${res.url}`);
})().catch((e) => { console.error(`[${new Date().toISOString()}] FAIL ${name}: ${e.message}`); process.exit(1); });
