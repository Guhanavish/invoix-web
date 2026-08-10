'use strict';

const fs = require('fs');
const path = require('path');
const { USERS_DIR } = require('../config');

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const USE_BLOB = !!TOKEN;
const IS_VERCEL = !!process.env.VERCEL;

// On Vercel, Blob is the ONLY durable store — /tmp is wiped on every redeploy.
// If the token is missing we must fail loudly instead of silently writing to
// /tmp (that is what caused the account data loss).
const STORAGE_UNSET_ERROR = 'Account storage is unavailable. Check that Vercel Blob is connected to this project.';

function assertStorageConfigured() {
  if (IS_VERCEL && !TOKEN) {
    throw new Error(STORAGE_UNSET_ERROR);
  }
}

function storageStatus() {
  return {
    vercel: !!IS_VERCEL,
    connected: !!TOKEN,
    mode: blobAccess || null,
  };
}

let blob = null;
function blobLib() {
  if (!blob) blob = require('@vercel/blob');
  return blob;
}

// Some Blob API access-mismatch errors surface as generic errors rather than
// BlobAccessError, so detect by message as well.
function isAccessError(e) {
  if (!e) return false;
  if (e.name === 'BlobAccessError') return true;
  return /public access on a private store|private access|store access/i.test(String(e.message || ''));
}

// @vercel/blob v2 requires an explicit access mode ('public'|'private') that
// must match the store configuration. Detect it once per instance by probing
// the PUT API: it reliably rejects a mismatch, whereas a GET probe is
// ambiguous (the wrong host just 404s).
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
    if (isAccessError(e)) {
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
    if (!isAccessError(e)) throw e;
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
  assertStorageConfigured();
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
  assertStorageConfigured();
  if (USE_BLOB) {
    const { put } = blobLib();
    await withFlip(await accessMode(), async (access) => {
      const res = await put(key, buffer, {
        token: TOKEN,
        access,
        contentType,
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      if (!res || !res.url || res.pathname !== key) {
        throw new Error(`Write to storage failed for "${key}" (no blob returned by the API)`);
      }
      return res;
    });
    return;
  }
  const f = localFile(key);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, buffer);
}

async function del(key) {
  assertStorageConfigured();
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
  assertStorageConfigured();
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

module.exports = { readRaw, writeRaw, readJSON, writeJSON, del, exists, USE_BLOB, accessMode, withFlip, storageStatus };
