'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');

function createApp() {
  const { WEB_DIR } = require('./config');
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  app.get('/api/health', (req, res) => {
    const { storageStatus } = require('./lib/storage');
    res.json({ ok: true, time: new Date().toISOString(), storage: storageStatus() });
  });

  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/sync', require('./routes/sync'));
  app.use('/api/data', require('./routes/data'));
  app.use('/api/pending', require('./routes/pending'));
  app.use('/api/download', require('./routes/download'));
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
    res.status(500).json({ success: false, error: 'Internal server error' });
  });

  return app;
}

module.exports = { createApp };
