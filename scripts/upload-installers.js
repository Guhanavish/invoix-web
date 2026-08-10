'use strict';

// Uploads the local installers in server/downloads to Vercel Blob so the
// production site can serve them. Requires BLOB_READ_WRITE_TOKEN in env or
// server/.env.local. Usage: node scripts/upload-installers.js

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env.local') });
require('dotenv').config();

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
if (!TOKEN) {
  console.error('Missing BLOB_READ_WRITE_TOKEN. Get it from Vercel -> Storage -> Blob store -> Settings.');
  process.exit(1);
}

const { put } = require('@vercel/blob');
const DOWNLOADS_DIR = path.join(__dirname, '..', 'server', 'downloads');

async function putFile(name, buffer, contentType) {
  try {
    return await put('downloads/' + name, buffer, {
      token: TOKEN,
      access: 'public',
      contentType,
      addRandomSuffix: false,
    });
  } catch (e) {
    if (/private access/i.test(e.message)) {
      return await put('downloads/' + name, buffer, {
        token: TOKEN,
        access: 'private',
        contentType,
        addRandomSuffix: false,
      });
    }
    throw e;
  }
}

async function main() {
  const names = fs.readdirSync(DOWNLOADS_DIR).filter((f) => /\.(zip|exe)$/i.test(f));
  for (const name of names) {
    const full = path.join(DOWNLOADS_DIR, name);
    const buffer = fs.readFileSync(full);
    const ext = path.extname(name).toLowerCase();
    const contentType = ext === '.exe' ? 'application/octet-stream' : 'application/zip';
    const res = await putFile(name, buffer, contentType);
    console.log(`Uploaded ${name} (${(buffer.length / 1024 / 1024).toFixed(1)} MB) -> ${res.url}`);
  }
  console.log('Done.');
}

main().catch((e) => {
  console.error('Upload failed:', e.message);
  process.exit(1);
});
