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

// @vercel/blob v2 requires an explicit access mode ('public'|'private') that
// must match the store configuration. Detect it once per instance by probing
// the PUT API: it reliably rejects a mismatch with BlobAccessError, whereas a
// GET probe is ambiguous (the wrong host just 404s).
let blobAccess = null;

async function accessMode() {
  if (blobAccess) return blobAccess;
  const { put } = blobLib();
  try {
    await put('__invoix_access_probe__', Buffer.from('probe'), {
      token: TOKEN,
      access: 'public',
      contentType: 'text/plain',
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    blobAccess = 'public';
  } catch (e) {
    if (e && e.name === 'BlobAccessError') {
      blobAccess = 'private';
    } else {
      throw e;
    }
  }
  return blobAccess;
}

// Fall back to the opposite access mode once if the cached mode was wrong.
async function withFlip(access, fn) {
  try {
    return await fn(access);
  } catch (e) {
    if (!e || e.name !== 'BlobAccessError') throw e;
    const flipped = access === 'public' ? 'private' : 'public';
    const out = await fn(flipped);
    blobAccess = flipped;
    return out;
  }
}

function localFile(key) {
  return path.join(USERS_DIR, ...key.split('/'));
}

async function readRaw(key) {
  if (USE_BLOB) {
    const { get } = blobLib();
    try {
      return await withFlip(await accessMode(), async (access) => {
        const r = await get(key, { token: TOKEN, access });
        if (!r) return null;
        const chunks = [];
        for await (const chunk of r.stream) chunks.push(Buffer.from(chunk));
        return Buffer.concat(chunks);
      });
    } catch (e) {
      return null;
    }
  }
  const f = localFile(key);
  return fs.existsSync(f) ? fs.readFileSync(f) : null;
}

async function writeRaw(key, buffer, contentType = 'application/octet-stream') {
  if (USE_BLOB) {
    const { put } = blobLib();
    await withFlip(await accessMode(), (access) =>
      put(key, buffer, {
        token: TOKEN,
        access,
        contentType,
        addRandomSuffix: false,
        allowOverwrite: true,
      })
    );
    return;
  }
  const f = localFile(key);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, buffer);
}

async function del(key) {
  if (USE_BLOB) {
    const { get, del: blobDel } = blobLib();
    try {
      const r = await get(key, { token: TOKEN, access: await accessMode() });
      if (r) await blobDel(r.blob.url, { token: TOKEN }).catch(() => {});
    } catch (e) {}
    return;
  }
  const f = localFile(key);
  try { fs.unlinkSync(f); } catch (e) {}
}

async function exists(key) {
  if (USE_BLOB) {
    const { get } = blobLib();
    try {
      const r = await get(key, { token: TOKEN, access: await accessMode() });
      return !!r;
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

module.exports = { readRaw, writeRaw, readJSON, writeJSON, del, exists, USE_BLOB, accessMode, withFlip };
