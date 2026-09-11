'use strict';

// Minimal first-party analytics: anonymous page-view and key-event counts.
// No cookies, no fingerprints, no IP storage, no PII. Aggregated per day in
// analytics/daily.json. Public write (rate-limited), authenticated read.

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const storage = require('../lib/storage');

const router = express.Router();

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

const KEY = 'analytics/daily.json';
const ALLOWED_TYPES = new Set(['pageview', 'register', 'draft_created', 'installer_download', 'google_login']);

function dayKey(d) {
  return new Date(d).toISOString().slice(0, 10);
}

function cleanPath(p) {
  if (typeof p !== 'string') return '/';
  const cut = p.split('?')[0].split('#')[0].slice(0, 120);
  return cut.startsWith('/') ? cut : '/';
}

async function loadStore() {
  const data = await storage.readJSON(KEY);
  return data && typeof data === 'object' ? data : { days: {} };
}

router.post('/event', asyncHandler(async (req, res) => {
  const { type, path } = req.body || {};
  if (!ALLOWED_TYPES.has(type)) {
    return res.status(400).json({ success: false, error: 'Unknown event type' });
  }
  const store = await loadStore();
  const day = dayKey(Date.now());
  if (!store.days[day]) store.days[day] = { pageviews: {}, events: {} };
  const bucket = store.days[day];
  if (type === 'pageview') {
    const p = cleanPath(path);
    bucket.pageviews[p] = (bucket.pageviews[p] || 0) + 1;
  } else {
    bucket.events[type] = (bucket.events[type] || 0) + 1;
  }
  // Retain 90 days to bound storage growth
  const cutoff = dayKey(Date.now() - 90 * 24 * 3600 * 1000);
  for (const d of Object.keys(store.days)) {
    if (d < cutoff) delete store.days[d];
  }
  await storage.writeJSON(KEY, store);
  res.json({ success: true });
}));

router.get('/summary', requireAuth, asyncHandler(async (req, res) => {
  const store = await loadStore();
  const days = Object.keys(store.days).sort().slice(-30);
  let pageviews = 0;
  const events = {};
  const byDay = days.map((d) => {
    const b = store.days[d];
    const pv = Object.values(b.pageviews || {}).reduce((a, n) => a + n, 0);
    pageviews += pv;
    for (const [k, n] of Object.entries(b.events || {})) events[k] = (events[k] || 0) + n;
    return { day: d, pageviews: pv };
  });
  res.json({ success: true, days: byDay, pageviews, events });
}));

module.exports = router;
