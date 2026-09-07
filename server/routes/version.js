'use strict';

const express = require('express');
const path = require('path');
const { getVersionInfo, isNewer } = require('../lib/update');

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const USE_BLOB = !!TOKEN;
const BLOB_PREFIX = 'downloads/';

const router = express.Router();

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

async function listBlobs() {
  const { list } = require('@vercel/blob');
  const { withFlip } = require('../lib/storage');
  const { accessMode } = require('../lib/storage');
  const res = await withFlip(await accessMode(), (access) =>
    list({ token: TOKEN, prefix: BLOB_PREFIX, limit: 1000 })
  );
  return res.blobs || [];
}

// Public: full release info for the landing page + desktop updater
router.get('/', asyncHandler(async (req, res) => {
  const info = await getVersionInfo();
  const files = { zip: info.zip || null, exe: info.exe || null };

  if (USE_BLOB) {
    try {
      const blobs = await listBlobs();
      const zipB = blobs.filter((b) => /\.zip$/i.test(b.pathname)).sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))[0];
      const exeB = blobs.filter((b) => /\.exe$/i.test(b.pathname)).sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))[0];
      if (zipB) files.zip = { name: path.basename(zipB.pathname), size: zipB.size, url: `/api/download/installer/${encodeURIComponent(path.basename(zipB.pathname))}` };
      if (exeB) files.exe = { name: path.basename(exeB.pathname), size: exeB.size, url: `/api/download/installer/${encodeURIComponent(path.basename(exeB.pathname))}` };
    } catch (e) {}
  } else {
    const fs = require('fs');
    const { DOWNLOADS_DIR } = require('../config');
    try {
      const names = fs.readdirSync(DOWNLOADS_DIR).filter((f) => /\.(zip|exe)$/i.test(f));
      const zipN = names.filter((n) => /\.zip$/i.test(n)).sort().reverse()[0];
      const exeN = names.filter((n) => /\.exe$/i.test(n)).sort().reverse()[0];
      if (zipN) {
        const st = fs.statSync(path.join(DOWNLOADS_DIR, zipN));
        files.zip = { name: zipN, size: st.size, url: `/api/download/installer/${encodeURIComponent(zipN)}` };
      }
      if (exeN) {
        const st = fs.statSync(path.join(DOWNLOADS_DIR, exeN));
        files.exe = { name: exeN, size: st.size, url: `/api/download/installer/${encodeURIComponent(exeN)}` };
      }
    } catch (e) {}
  }

  res.json({
    success: true,
    version: info.version,
    notes: info.notes || '',
    mandatory: !!info.mandatory,
    publishedAt: info.publishedAt,
    files,
  });
}));

// Public: lightweight check used by the desktop app on startup
// GET /api/version/check?current=1.0.0
router.get('/check', asyncHandler(async (req, res) => {
  const current = String(req.query.current || '').trim();
  const info = await getVersionInfo();
  const updateAvailable = current ? isNewer(info.version, current) : false;

  let files = { zip: info.zip || null, exe: info.exe || null };
  if (USE_BLOB) {
    try {
      const blobs = await listBlobs();
      const zipB = blobs.filter((b) => /\.zip$/i.test(b.pathname)).sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))[0];
      const exeB = blobs.filter((b) => /\.exe$/i.test(b.pathname)).sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))[0];
      if (zipB) files = { ...files, zip: { name: path.basename(zipB.pathname), size: zipB.size, url: `/api/download/installer/${encodeURIComponent(path.basename(zipB.pathname))}` } };
      if (exeB) files = { ...files, exe: { name: path.basename(exeB.pathname), size: exeB.size, url: `/api/download/installer/${encodeURIComponent(path.basename(exeB.pathname))}` } };
    } catch (e) {}
  }

  res.json({
    success: true,
    current: current || null,
    latest: info.version,
    updateAvailable,
    mandatory: !!info.mandatory,
    notes: info.notes || '',
    publishedAt: info.publishedAt,
    files: updateAvailable ? files : { zip: null, exe: null },
  });
}));

module.exports = router;
