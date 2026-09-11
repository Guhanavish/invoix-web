'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');

function createApp() {
  const { WEB_DIR, ALLOWED_ORIGINS } = require('./config');
  const { apiLimiter, authLimiter, otpLimiter } = require('./middleware/rateLimit');
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '2mb' }));

  // Block probes for sensitive files before anything else serves them
  app.use((req, res, next) => {
    const p = String(req.path || '');
    if (/(^|\/)(\.env|\.git|\.well-known\/change-password|wp-admin|wp-login|phpmyadmin|\.DS_Store|.*\.bak|.*\.sql|.*\.log$)/i.test(p)) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }
    next();
  });

  // Security headers (incl. CSP tuned for Google Identity Services + Fonts).
  // Note: style-src allows 'unsafe-inline' because the UI uses React inline
  // styles extensively; script-src stays strict (no inline scripts shipped).
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self' https://accounts.google.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https://*.googleusercontent.com",
        "connect-src 'self' https://accounts.google.com",
        "frame-src https://accounts.google.com",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        'upgrade-insecure-requests',
      ].join('; ')
    );
    next();
  });

  // CORS locked to an allowlist. Requests with no Origin (desktop app, curl,
  // same-origin navigation) are always allowed.
  const allowSet = new Set((ALLOWED_ORIGINS || []).map((o) => String(o).trim().replace(/\/+$/, '')));
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      const clean = String(origin).replace(/\/+$/, '');
      if (allowSet.has(clean)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
      }
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  app.get('/api/health', (req, res) => {
    const { storageStatus } = require('./lib/storage');
    res.json({ ok: true, time: new Date().toISOString(), storage: storageStatus() });
  });

  app.use('/api/', apiLimiter);
  // Tight brakes on auth + OTP/email-sending routes.
  // NOTE: confirm/reset endpoints are intentionally NOT rate-limited here:
  // they already cap attempts per code (5 tries then the code dies), and
  // throttling them locks legitimate users out mid-recovery.
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
  app.use('/api/auth/google', authLimiter);
  app.use('/api/auth/forgot', otpLimiter);
  app.use('/api/auth/verify-email/request', otpLimiter);

  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/sync', require('./routes/sync'));
  app.use('/api/data', require('./routes/data'));
  app.use('/api/pending', require('./routes/pending'));
  app.use('/api/approvals', require('./routes/approvals'));
  app.use('/api/download', require('./routes/download'));
  app.use('/api/version', require('./routes/version'));
  app.use('/api/analytics', require('./routes/analytics'));
  app.use('/api/config', require('./routes/config'));

  if (fs.existsSync(WEB_DIR)) {
    app.use(express.static(WEB_DIR));
    app.get(/^(?!\/api\/).*/, (req, res) => {
      res.sendFile(path.join(WEB_DIR, 'index.html'));
    });
  } else {
    app.get('/', (req, res) => res.send('Invoix Web API running. Build the frontend to serve the site.'));
  }

  app.use('/api', (req, res) => res.status(404).json({ success: false, error: 'Not found' }));

  // Final error handler: return JSON instead of crashing the function
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error('[api error]', err);
    if (res.headersSent) return next(err);
    res.status(500).json({ success: false, error: (err && err.message) || 'Internal server error' });
  });

  return app;
}

module.exports = { createApp };
