'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const { DOWNLOADS_DIR } = require('../config');
const { accessMode, withFlip } = require('../lib/storage');

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const USE_BLOB = !!TOKEN;
const BLOB_PREFIX = 'downloads/';

const router = express.Router();

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function useB2() {
  try { return require('../lib/b2').b2Enabled(); } catch (e) { return false; }
}

function listLocalInstallers() {
  try {
    return fs.readdirSync(DOWNLOADS_DIR).filter((f) => /\.(zip|exe)$/i.test(f));
  } catch (e) {
    return [];
  }
}

function localInfo(name) {
  const full = path.join(DOWNLOADS_DIR, name);
  let stat = { size: 0, mtime: new Date(0) };
  try { stat = fs.statSync(full); } catch (e) {}
  return {
    name,
    size: stat.size,
    modified: stat.mtime,
    isExe: name.toLowerCase().endsWith('.exe'),
  };
}

async function listInstallers() {
  // Union of B2 (primary) + Blob (mirror) + local, de-duplicated by name
  // with the newest copy winning.
  const byName = new Map();
  const add = (info) => {
    const prev = byName.get(info.name);
    if (!prev || new Date(info.modified) > new Date(prev.modified)) byName.set(info.name, info);
  };
  if (useB2()) {
    try {
      const { b2List } = require('../lib/b2');
      for (const b of await b2List(BLOB_PREFIX)) {
        if (!/\.(zip|exe)$/i.test(b.pathname)) continue;
        add({ name: path.basename(b.pathname), size: b.size, modified: new Date(b.uploadedAt), isExe: b.pathname.toLowerCase().endsWith('.exe') });
      }
    } catch (e) {}
  }
  if (USE_BLOB) {
    try {
      const { list } = require('@vercel/blob');
      const res = await list({ token: TOKEN, prefix: BLOB_PREFIX, limit: 1000 });
      for (const b of (res.blobs || [])) {
        if (!/\.(zip|exe)$/i.test(b.pathname)) continue;
        add({ name: path.basename(b.pathname), size: b.size, modified: new Date(b.uploadedAt), isExe: b.pathname.toLowerCase().endsWith('.exe') });
      }
    } catch (e) {}
  }
  for (const info of listLocalInstallers().map(localInfo)) add(info);
  return [...byName.values()].sort((a, b) => b.modified - a.modified);
}

router.get('/installer/info', asyncHandler(async (req, res) => {
  res.json({ success: true, files: await listInstallers() });
}));

router.get('/installer/:name', asyncHandler(async (req, res) => {
  const name = path.basename(req.params.name);
  if (!/\.(zip|exe)$/i.test(name)) {
    return res.status(404).json({ success: false, error: 'Installer not found' });
  }
  // B2 first (streams without buffering the whole file)
  if (useB2()) {
    try {
      const { b2DownloadStream } = require('../lib/b2');
      const dl = await b2DownloadStream(BLOB_PREFIX + name);
      if (dl) {
        res.setHeader('Content-Type', dl.contentType || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        if (dl.size) res.setHeader('Content-Length', String(dl.size));
        Readable.fromWeb(dl.stream).pipe(res);
        return;
      }
    } catch (e) {
      console.log(`[download] B2 stream failed for "${name}", trying Blob: ${e.message}`);
    }
  }
  if (USE_BLOB) {
    const { get } = require('@vercel/blob');
    const blobRes = await withFlip(await accessMode(), (access) =>
      get(BLOB_PREFIX + name, { token: TOKEN, access })
    );
    if (!blobRes) {
      return res.status(404).json({ success: false, error: 'Installer not found' });
    }
    res.setHeader('Content-Type', blobRes.blob.contentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    if (blobRes.blob.size) res.setHeader('Content-Length', String(blobRes.blob.size));
    Readable.fromWeb(blobRes.stream).pipe(res);
    return;
  }
  const full = path.join(DOWNLOADS_DIR, name);
  if (!fs.existsSync(full)) {
    return res.status(404).json({ success: false, error: 'Installer not found' });
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.download(full, name);
}));

module.exports = router;
module.exports.listInstallers = listInstallers;
