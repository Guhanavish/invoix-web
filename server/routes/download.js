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
  if (USE_BLOB) {
    const { list } = require('@vercel/blob');
    const res = await list({ token: TOKEN, prefix: BLOB_PREFIX, limit: 1000 });
    return res.blobs
      .filter((b) => /\.(zip|exe)$/i.test(b.pathname))
      .map((b) => ({
        name: path.basename(b.pathname),
        size: b.size,
        modified: new Date(b.uploadedAt),
        isExe: b.pathname.toLowerCase().endsWith('.exe'),
      }))
      .sort((a, b) => b.modified - a.modified);
  }
  return listLocalInstallers().map(localInfo);
}

router.get('/installer/info', asyncHandler(async (req, res) => {
  res.json({ success: true, files: await listInstallers() });
}));

router.get('/installer/:name', asyncHandler(async (req, res) => {
  const name = path.basename(req.params.name);
  if (!/\.(zip|exe)$/i.test(name)) {
    return res.status(404).json({ success: false, error: 'Installer not found' });
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
