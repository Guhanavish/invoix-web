'use strict';

const fs = require('fs');
const path = require('path');
const { USERS_DIR } = require('../config');

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const USE_BLOB = !!TOKEN;
const IS_VERCEL = !!process.env.VERCEL;

if (IS_VERCEL && !TOKEN) {
  console.error(
    '[storage] Running on Vercel without BLOB_READ_WRITE_TOKEN. Persistent storage will fail. ' +
    'Create a Blob store in the Vercel dashboard and connect it to this project.'
  );
}

let blob = null;
function blobLib() {
  if (!blob) blob = require('@vercel/blob');
  return blob;
}

let blobAccess = 'public';
let blobAccessChecked = false;

async function putBlob(key, buffer, contentType) {
  const { put } = blobLib();
  if (!blobAccessChecked) {
    blobAccessChecked = true;
    try {
      await put(key, buffer, { token: TOKEN, access: 'public', contentType, addRandomSuffix: false });
      return;
    } catch (e) {
      if (/private access/i.test(e.message)) {
        blobAccess = 'private';
      } else {
        throw e;
      }
    }
  }
  await put(key, buffer, { token: TOKEN, access: blobAccess, contentType, addRandomSuffix: false });
}

function localFile(key) {
  return path.join(USERS_DIR, ...key.split('/'));
}

async function readRaw(key) {
  if (USE_BLOB) {
    const { get } = blobLib();
    try {
      const res = await get(key, { token: TOKEN });
      if (!res || !res.url) return null;
      const r = await fetch(res.url);
      if (!r.ok) return null;
      return Buffer.from(await r.arrayBuffer());
    } catch (e) {
      return null;
    }
  }
  const f = localFile(key);
  return fs.existsSync(f) ? fs.readFileSync(f) : null;
}

async function writeRaw(key, buffer, contentType = 'application/octet-stream') {
  if (USE_BLOB) {
    await putBlob(key, buffer, contentType);
    return;
  }
  const f = localFile(key);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, buffer);
}

async function del(key) {
  if (USE_BLOB) {
    const { del: blobDel } = blobLib();
    await blobDel(key, { token: TOKEN }).catch(() => {});
    return;
  }
  const f = localFile(key);
  try { fs.unlinkSync(f); } catch (e) {}
}

async function exists(key) {
  if (USE_BLOB) {
    const { get } = blobLib();
    try {
      const res = await get(key, { token: TOKEN });
      return !!(res && res.url);
    } catch (e) {
      return false;
    }
  }
  return fs.existsSync(localFile(key));
}

async function readJSON(key) {
  const buf = await readRaw(key);
  if (!buf) return null;
  try { return JSON.parse(buf.toString('utf8')); } catch (e) { return null; }
}

async function writeJSON(key, obj) {
  await writeRaw(key, Buffer.from(JSON.stringify(obj, null, 2), 'utf8'), 'application/json');
}

module.exports = { readRaw, writeRaw, readJSON, writeJSON, del, exists, USE_BLOB };
