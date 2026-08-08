'use strict';

const path = require('path');

const IS_VERCEL = !!process.env.VERCEL;

const DATA_DIR = IS_VERCEL ? path.join('/tmp', 'invoix-data') : path.join(__dirname, 'data');
const USERS_DIR = path.join(DATA_DIR, 'users');
const DOWNLOADS_DIR = process.env.DOWNLOADS_DIR || (IS_VERCEL ? path.join('/tmp', 'invoix-downloads') : path.join(__dirname, 'downloads'));
const WEB_DIR = process.env.WEB_DIR || path.join(__dirname, '..', 'web', 'dist');
const PORT = process.env.PORT || 3000;

const TOKEN_SECRET = process.env.TOKEN_SECRET || 'invoix-web-secret-change-me';
const TOKEN_TTL_HOURS = 24 * 7;

const fs = require('fs');
try {
  fs.mkdirSync(USERS_DIR, { recursive: true });
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
} catch (e) {
  console.error('Could not create data dirs:', e.message);
}

module.exports = { DATA_DIR, USERS_DIR, DOWNLOADS_DIR, WEB_DIR, PORT, TOKEN_SECRET, TOKEN_TTL_HOURS };
