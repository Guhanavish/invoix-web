'use strict';

const fs = require('fs');
const path = require('path');
const { USERS_DIR } = require('../config');

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const USE_BLOB = !!TOKEN;
const IS_VERCEL = !!process.env.VERCEL;

// Vercel Blob is kept as an ASYNC mirror only (never blocking, never required).
// Hard cap: 800 MB of the 1 GB store. Mirror writes that would exceed the cap
// are skipped — B2 remains the source of truth.
const BLOB_CAP_BYTES = 800 * 1024 * 1024;

let b2 = null;
function b2Lib() {
  if (!b2) b2 = require('./b2');
  return b2;
}

function useB2() {
  try { return b2Lib().b2Enabled(); } catch (e) { return false; }
}

// On Vercel, Blob is the ONLY durable store — /tmp is wiped on every redeploy.
// If the token is missing we must fail loudly instead of silently writing to
// /tmp (that is what caused the account data loss).
const STORAGE_UNSET_ERROR = 'Account storage is unavailable. Check that Vercel Blob is connected to this project.';

function assertStorageConfigured() {
  if (IS_VERCEL && !TOKEN && !useB2()) {
    throw new Error(STORAGE_UNSET_ERROR);
  }
}

function storageStatus() {
  let b2Status = { enabled: false, buckets: 0 };
  try {
    const lib = b2Lib();
    b2Status = { enabled: lib.b2Enabled(), buckets: lib.bucketCount() };
  } catch (e) {}
  return {
    vercel: !!IS_VERCEL,
    connected: !!TOKEN,
    mode: blobAccess || null,
    b2: b2Status,
    blobCapMB: Math.round(BLOB_CAP_BYTES / 1024 / 1024),
  };
}

// ---- Blob usage guard (800 MB cap) ----
let blobUsageCache = { bytes: 0, at: 0 };
const BLOB_USAGE_TTL_MS = 5 * 60 * 1000;

async function blobUsageBytes() {
  const now = Date.now();
  if (now - blobUsageCache.at < BLOB_USAGE_TTL_MS) return blobUsageCache.bytes;
  try {
    const { list } = blobLib();
    let total = 0;
    let cursor = undefined;
    for (;;) {
      const res = await list({ token: TOKEN, limit: 1000, ...(cursor ? { cursor } : {}) });
      for (const b of res.blobs || []) total += b.size || 0;
      if (!res.hasMore || !res.cursor) break;
      cursor = res.cursor;
    }
    blobUsageCache = { bytes: total, at: now };
  } catch (e) {}
  return blobUsageCache.bytes;
}

// Fire-and-forget Blob mirror (never blocks, never throws).
function mirrorToBlob(key, buffer, contentType) {
  if (!USE_BLOB) return;
  (async () => {
    try {
      const used = await blobUsageBytes();
      if (used + buffer.length > BLOB_CAP_BYTES) {
        console.log(`[storage] Blob mirror skipped for "${key}" (cap 800MB: used ${(used / 1048576).toFixed(0)}MB)`);
        return;
      }
      const { put } = blobLib();
      await withFlip(await accessMode(), async (access) => {
        // cacheControlMaxAge: 0 keeps edge caches from serving stale JSON
        // after overwrites (users/approvals/version must read fresh).
        await put(key, buffer, { token: TOKEN, access, contentType, addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 0 });
      });
      blobUsageCache = { bytes: used + buffer.length, at: Date.now() };
    } catch (e) {
      console.log(`[storage] Blob mirror failed for "${key}": ${e.message}`);
    }
  })().catch(() => {});
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

async function readBlobRaw(key) {
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

// Read order: B2 (primary) -> Blob (mirror/legacy) -> local disk (dev).
async function readRaw(key) {
  assertStorageConfigured();
  if (useB2()) {
    try {
      const buf = await b2Lib().b2Read(key);
      if (buf) return buf;
    } catch (e) {
      console.log(`[storage] B2 read failed for "${key}", falling back: ${e.message}`);
    }
  }
  if (USE_BLOB) {
    const buf = await readBlobRaw(key);
    if (buf) return buf;
  }
  const f = localFile(key);
  return fs.existsSync(f) ? fs.readFileSync(f) : null;
}

// Write order: B2 (awaited, source of truth) + Blob mirror (async, capped).
// Local disk is always written too when not on Vercel (dev convenience).
async function writeRaw(key, buffer, contentType = 'application/octet-stream') {
  assertStorageConfigured();
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  if (useB2()) {
    await b2Lib().b2Write(key, buf, contentType);
    mirrorToBlob(key, buf, contentType);
  } else if (USE_BLOB) {
    // No B2 configured — Blob becomes the awaited primary (legacy behaviour)
    const { put } = blobLib();
    await withFlip(await accessMode(), async (access) => {
      const res = await put(key, buf, {
        token: TOKEN,
        access,
        contentType,
        addRandomSuffix: false,
        allowOverwrite: true,
        // Fresh reads after overwrites matter more than edge caching here.
        ...(contentType.includes('json') ? { cacheControlMaxAge: 0 } : {}),
      });
      if (!res || !res.url || res.pathname !== key) {
        throw new Error(`Write to storage failed for "${key}" (no blob returned by the API)`);
      }
      return res;
    });
  }
  if (!IS_VERCEL) {
    const f = localFile(key);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, buf);
  }
}

async function del(key) {
  assertStorageConfigured();
  if (useB2()) {
    try { await b2Lib().b2Delete(key); } catch (e) {}
  }
  if (USE_BLOB) {
    const { get, del: blobDel } = blobLib();
    try {
      const r = await get(key, { token: TOKEN, access: await accessMode() });
      if (r) await blobDel(r.blob.url, { token: TOKEN }).catch(() => {});
    } catch (e) {}
  }
  // Always clear the dev-local copy too so exists() stays consistent
  try { fs.unlinkSync(localFile(key)); } catch (e) {}
}

async function exists(key) {
  assertStorageConfigured();
  if (useB2()) {
    try {
      if (await b2Lib().b2Exists(key)) return true;
    } catch (e) {}
  }
  if (USE_BLOB) {
    const { get } = blobLib();
    try {
      const r = await get(key, { token: TOKEN, access: await accessMode() });
      if (r) return true;
    } catch (e) {}
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

// Parallel read of every tier. Used by versioned stores (users/approvals) to
// pick the freshest copy instead of trusting tier preference order — Blob/B2
// overwrites can lag behind reads, and a stale preferred tier must never win
// over a fresher fallback (that silently resurrects deleted users or hides
// just-created ones).
async function readTieredRaw(key) {
  const out = { b2: null, blob: null, local: null };
  const jobs = [];
  if (useB2()) {
    jobs.push(
      b2Lib().b2Read(key).then((b) => { out.b2 = b; }).catch(() => {})
    );
  }
  if (USE_BLOB) {
    jobs.push(
      readBlobRaw(key).then((b) => { out.blob = b; }).catch(() => { out.blob = null; })
    );
  }
  jobs.push((async () => {
    try {
      const f = localFile(key);
      out.local = fs.existsSync(f) ? fs.readFileSync(f) : null;
    } catch (e) { out.local = null; }
  })());
  await Promise.all(jobs);
  return out;
}

function parseRev(buf) {
  if (!buf) return { rev: -1, obj: null };
  try {
    const obj = JSON.parse(buf.toString('utf8'));
    const rev = obj && typeof obj.__rev === 'number' ? obj.__rev : 0;
    return { rev, obj };
  } catch (e) {
    return { rev: -1, obj: null };
  }
}

// Load a versioned JSON doc (users/approvals): freshest __rev across tiers
// wins. Returns { obj, rev } with obj possibly an empty shell.
async function loadVersionedJSON(key, emptyShell) {
  const tiers = await readTieredRaw(key);
  let best = { rev: -1, obj: null };
  for (const buf of [tiers.b2, tiers.blob, tiers.local]) {
    const parsed = parseRev(buf);
    if (parsed.obj && parsed.rev > best.rev) best = parsed;
  }
  if (!best.obj) best = { rev: 0, obj: JSON.parse(JSON.stringify(emptyShell)) };
  return best;
}

module.exports = { readRaw, writeRaw, readJSON, writeJSON, del, exists, USE_BLOB, accessMode, withFlip, storageStatus, blobUsageBytes, BLOB_CAP_BYTES, mirrorToBlob, readTieredRaw, parseRev, loadVersionedJSON };
