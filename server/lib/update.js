'use strict';

// Central app-release store. Persisted in Vercel Blob (production) so every
// serverless instance agrees on the latest version, with a local JSON fallback
// for development. Single source of truth for auto-update + landing page.

const fs = require('fs');
const path = require('path');
const storage = require('./storage');

const VERSION_KEY = 'version.json';
const LOCAL_VERSION_FILE = path.join(__dirname, '..', 'version.json');

function defaultInfo() {
  return {
    version: '1.0.0',
    notes: '',
    mandatory: false,
    publishedAt: null,
    zip: null,
    exe: null,
  };
}

function normalizeVersion(v) {
  return String(v || '').trim().replace(/^v/i, '');
}

function compareSemver(a, b) {
  const pa = normalizeVersion(a).split('.').map((n) => parseInt(n, 10) || 0);
  const pb = normalizeVersion(b).split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
  }
  return 0;
}

function isNewer(latest, current) {
  if (!latest || !current) return false;
  try {
    return compareSemver(latest, current) > 0;
  } catch (e) {
    return false;
  }
}

function readLocalVersion() {
  try {
    if (fs.existsSync(LOCAL_VERSION_FILE)) {
      const raw = JSON.parse(fs.readFileSync(LOCAL_VERSION_FILE, 'utf8'));
      return { ...defaultInfo(), ...raw, version: normalizeVersion(raw.version || '1.0.0') };
    }
  } catch (e) {}
  return null;
}

async function getVersionInfo() {
  // Prefer Blob store when configured (production truth)
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const data = await storage.readJSON(VERSION_KEY);
      if (data && data.version) {
        return { ...defaultInfo(), ...data, version: normalizeVersion(data.version) };
      }
    } catch (e) {}
  }
  const local = readLocalVersion();
  if (local) return local;
  // Last resort: web package.json version
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf8'));
    if (pkg && pkg.version) return { ...defaultInfo(), version: normalizeVersion(pkg.version) };
  } catch (e) {}
  return defaultInfo();
}

async function setVersionInfo(info) {
  const payload = {
    ...defaultInfo(),
    ...info,
    version: normalizeVersion(info.version),
    publishedAt: info.publishedAt || new Date().toISOString(),
  };
  // Always persist locally (dev + publish script source of truth)
  try {
    fs.writeFileSync(LOCAL_VERSION_FILE, JSON.stringify(payload, null, 2));
  } catch (e) {}
  // And to Blob when configured so production serves it immediately
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    await storage.writeRaw(VERSION_KEY, Buffer.from(JSON.stringify(payload, null, 2), 'utf8'), 'application/json');
  }
  return payload;
}

module.exports = { getVersionInfo, setVersionInfo, compareSemver, isNewer, normalizeVersion };
