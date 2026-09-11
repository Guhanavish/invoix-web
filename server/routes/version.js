'use strict';

const express = require('express');
const { getVersionInfo, isNewer } = require('../lib/update');

const router = express.Router();

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// Newest actually-stored files across ALL tiers (B2 + Blob + local).
// version.json stays the source of truth for the release itself; the union
// below only fills gaps and can never downgrade a published file entry.
async function newestStoredFiles() {
  try {
    const { listInstallers } = require('./download');
    const all = await listInstallers();
    const pick = (re) => all.filter((f) => re.test(f.name)).sort((a, b) => new Date(b.modified) - new Date(a.modified))[0] || null;
    const zip = pick(/\.zip$/i);
    const exe = pick(/\.exe$/i);
    return {
      zip: zip ? { name: zip.name, size: zip.size, url: `/api/download/installer/${encodeURIComponent(zip.name)}` } : null,
      exe: exe ? { name: exe.name, size: exe.size, url: `/api/download/installer/${encodeURIComponent(exe.name)}` } : null,
    };
  } catch (e) {
    return { zip: null, exe: null };
  }
}

// Prefer the published manifest; only fill entries the manifest lacks.
function withManifestFallback(manifestFiles, stored) {
  return {
    zip: manifestFiles.zip || stored.zip,
    exe: manifestFiles.exe || stored.exe,
  };
}

// Public: full release info for the landing page + desktop updater
router.get('/', asyncHandler(async (req, res) => {
  const info = await getVersionInfo();
  const stored = await newestStoredFiles();
  const files = withManifestFallback({ zip: info.zip || null, exe: info.exe || null }, stored);

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

  const stored = await newestStoredFiles();
  const files = withManifestFallback({ zip: info.zip || null, exe: info.exe || null }, stored);

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
