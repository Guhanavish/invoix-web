'use strict';

// Backblaze B2 tier — PRIMARY storage for the Invoix web portal.
// Two buckets (Invoix-web-1, invoix-web-2), sharded deterministically by key
// hash so both buckets share the load and reads always find their bucket.
// Vercel Blob stays as an async capped mirror (see storage.js).
//
// Config via env (also add to Vercel dashboard):
//   B2_KEY_ID_1 / B2_APP_KEY_1 / B2_BUCKET_1
//   B2_KEY_ID_2 / B2_APP_KEY_2 / B2_BUCKET_2

const crypto = require('crypto');
const path = require('path');
// Load server/.env.local explicitly (module dir is server/lib)
try { require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') }); } catch (e) {}
try { require('dotenv').config(); } catch (e) {}

const B2 = require('backblaze-b2');

// Read lazily so env injected later (Vercel runtime, tests) is honoured.
function getBuckets() {
  return [
    { keyId: process.env.B2_KEY_ID_1 || '', appKey: process.env.B2_APP_KEY_1 || '', name: process.env.B2_BUCKET_1 || '' },
    { keyId: process.env.B2_KEY_ID_2 || '', appKey: process.env.B2_APP_KEY_2 || '', name: process.env.B2_BUCKET_2 || '' },
  ].filter((b) => b.keyId && b.appKey && b.name);
}

function b2Enabled() {
  return getBuckets().length > 0;
}

function bucketCount() {
  return getBuckets().length;
}

// Deterministic shard: same key always maps to the same bucket.
function bucketFor(key) {
  const n = getBuckets().length;
  if (n === 0) throw new Error('Backblaze B2 is not configured');
  if (n === 1) return 0;
  const h = crypto.createHash('md5').update(String(key)).digest();
  return h[0] % n;
}

// ---- client cache (auth tokens last ~24h; refresh proactively) ----
const clients = new Map(); // idx -> { b2, bucketId, authedAt }

async function client(idx) {
  const cfg = getBuckets()[idx];
  if (!cfg) throw new Error(`B2 bucket #${idx} is not configured`);
  let c = clients.get(idx);
  const stale = !c || Date.now() - c.authedAt > 20 * 3600 * 1000;
  if (stale) {
    const b2 = new B2({ applicationKeyId: cfg.keyId, applicationKey: cfg.appKey });
    await b2.authorize();
    const listed = await b2.listBuckets({ accountId: b2.accountId });
    const buckets = (listed && listed.data && listed.data.buckets) || [];
    const match = buckets.find((x) => x.bucketName === cfg.name);
    if (!match) throw new Error(`B2 bucket "${cfg.name}" not found for key ${cfg.keyId}`);
    c = { b2, bucketId: match.bucketId, authedAt: Date.now() };
    clients.set(idx, c);
  }
  return c;
}

function isAuthError(e) {
  const code = e && (e.code || (e.response && e.response.data && e.response.data.code));
  return code === 'expired_auth_token' || code === 'bad_auth_token';
}

// Runs fn(client); re-authorizes once on auth errors.
async function withClient(idx, fn) {
  try {
    return await fn(await client(idx));
  } catch (e) {
    if (!isAuthError(e)) throw e;
    clients.delete(idx);
    return await fn(await client(idx));
  }
}

function sha1(buf) {
  return crypto.createHash('sha1').update(buf).digest('hex');
}

async function findFileId(c, key) {
  const res = await c.b2.listFileNames({ bucketId: c.bucketId, prefix: String(key), maxFileCount: 10 });
  const files = (res && res.data && res.data.files) || [];
  const hit = files.find((f) => f.fileName === String(key) && f.action === 'upload');
  // list_file_names returns contentLength (list_file_versions returns size)
  return hit ? { fileId: hit.fileId, size: hit.size ?? hit.contentLength ?? 0, contentType: hit.contentType, uploadedAt: hit.uploadTimestamp } : null;
}

async function b2Read(key) {
  if (!b2Enabled()) return null;
  const idx = bucketFor(key);
  return withClient(idx, async (c) => {
    const hit = await findFileId(c, key);
    if (!hit) return null;
    const dl = await c.b2.downloadFileById({ fileId: hit.fileId });
    return Buffer.from(dl.data);
  }).catch((e) => {
    if (e && (e.code === 'not_found' || (e.response && e.response.status === 404))) return null;
    throw e;
  });
}

async function b2Write(key, buffer, contentType = 'application/octet-stream') {
  if (!b2Enabled()) throw new Error('Backblaze B2 is not configured');
  const idx = bucketFor(key);
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  return withClient(idx, async (c) => {
    const up = await c.b2.getUploadUrl({ bucketId: c.bucketId });
    await c.b2.uploadFile({
      uploadUrl: up.data.uploadUrl,
      uploadAuthToken: up.data.authorizationToken,
      fileName: String(key),
      data: buf,
      contentLength: buf.length,
      contentType,
      sha1: sha1(buf),
    });
    return { bucket: getBuckets()[idx].name, key: String(key), size: buf.length };
  });
}

async function b2Delete(key) {
  if (!b2Enabled()) return;
  const idx = bucketFor(key);
  await withClient(idx, async (c) => {
    const hit = await findFileId(c, key);
    if (hit) await c.b2.deleteFileVersion({ fileId: hit.fileId, fileName: String(key) });
  }).catch(() => {});
}

async function b2Exists(key) {
  if (!b2Enabled()) return false;
  const idx = bucketFor(key);
  try {
    return await withClient(idx, async (c) => !!(await findFileId(c, key)));
  } catch (e) {
    return false;
  }
}

// Streaming download for large files (installers): pipes B2 -> HTTP response
// without buffering the whole file in the serverless function.
async function b2DownloadStream(key) {
  if (!b2Enabled()) return null;
  const idx = bucketFor(key);
  const c = await client(idx);
  const hit = await findFileId(c, key);
  if (!hit) return null;
  const url = `${c.b2.downloadUrl}/file/${encodeURIComponent(getBuckets()[idx].name)}/${String(key).split('/').map(encodeURIComponent).join('/')}`;
  const res = await fetch(url, { headers: { Authorization: c.b2.authorizationToken } });
  if (res.status === 401) {
    // Token rotated mid-flight — re-auth once and retry
    clients.delete(idx);
    const c2 = await client(idx);
    const res2 = await fetch(url, { headers: { Authorization: c2.b2.authorizationToken } });
    if (!res2.ok || !res2.body) return null;
    return { stream: res2.body, size: hit.size, contentType: hit.contentType || 'application/octet-stream' };
  }
  if (!res.ok || !res.body) return null;
  return { stream: res.body, size: hit.size, contentType: hit.contentType || 'application/octet-stream' };
}

async function b2List(prefix) {
  if (!b2Enabled()) return [];
  const out = [];
  for (let idx = 0; idx < getBuckets().length; idx++) {
    try {
      await withClient(idx, async (c) => {
        let start = null;
        for (;;) {
          const res = await c.b2.listFileNames({
            bucketId: c.bucketId,
            prefix: String(prefix || ''),
            maxFileCount: 1000,
            ...(start ? { startFileName: start } : {}),
          });
          const files = (res && res.data && res.data.files) || [];
          for (const f of files) {
            if (f.action !== 'upload') continue;
            // list_file_names returns contentLength (list_file_versions returns size)
            out.push({ pathname: f.fileName, size: f.size ?? f.contentLength ?? 0, uploadedAt: new Date(f.uploadTimestamp), bucket: getBuckets()[idx].name });
          }
          if (!res.data || !res.data.nextFileName) break;
          start = res.data.nextFileName;
        }
      });
    } catch (e) {}
  }
  return out;
}

module.exports = { b2Enabled, bucketCount, bucketFor, b2Read, b2Write, b2Delete, b2Exists, b2DownloadStream, b2List };
