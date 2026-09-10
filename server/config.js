'use strict';

// Load .env.local (or .env) for local development; Vercel injects env vars directly.
require('dotenv').config({ path: require('path').join(__dirname, '.env.local') });
require('dotenv').config();

const path = require('path');

const IS_VERCEL = !!process.env.VERCEL;

const DATA_DIR = IS_VERCEL ? path.join('/tmp', 'invoix-data') : path.join(__dirname, 'data');
const USERS_DIR = path.join(DATA_DIR, 'users');
const DOWNLOADS_DIR = process.env.DOWNLOADS_DIR || (IS_VERCEL ? path.join('/tmp', 'invoix-downloads') : path.join(__dirname, 'downloads'));
const WEB_DIR = process.env.WEB_DIR || path.join(__dirname, '..', 'dist');
const PORT = process.env.PORT || 3000;

const DEFAULT_TOKEN_SECRET = 'invoix-web-secret-change-me';
const TOKEN_SECRET = process.env.TOKEN_SECRET || DEFAULT_TOKEN_SECRET;
const TOKEN_TTL_HOURS = 24 * 7;

// Pre-launch guard: session tokens signed with the public default secret can
// be forged by anyone. Refuse to boot in production without a real secret.
if (IS_VERCEL && (!process.env.TOKEN_SECRET || process.env.TOKEN_SECRET === DEFAULT_TOKEN_SECRET)) {
  throw new Error(
    'FATAL: TOKEN_SECRET is not set (or is still the default). ' +
    'Set a long random TOKEN_SECRET in Vercel -> Settings -> Environment Variables and redeploy. ' +
    'Generate one with: openssl rand -hex 32'
  );
}

// CORS allowlist: same-origin + desktop (no Origin) always pass; browsers from
// other sites must match. Extend via APP_ORIGINS="https://a.com,https://b.com".
const DEFAULT_ORIGINS = [
  'https://invoixweb.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
];
const ALLOWED_ORIGINS = (process.env.APP_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
  .concat(DEFAULT_ORIGINS.filter((o) => !(process.env.APP_ORIGINS || '').includes(o)));

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || null;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || null;

const fs = require('fs');
try {
  fs.mkdirSync(USERS_DIR, { recursive: true });
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
} catch (e) {
  console.error('Could not create data dirs:', e.message);
}

module.exports = { DATA_DIR, USERS_DIR, DOWNLOADS_DIR, WEB_DIR, PORT, TOKEN_SECRET, TOKEN_TTL_HOURS, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, ALLOWED_ORIGINS, IS_VERCEL };
