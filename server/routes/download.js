'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const { DOWNLOADS_DIR } = require('../config');

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

router.get('/installer/info', asyncHandler(async (req, res) => {
  const names = listLocalInstallers();
  const files = names.map((name) => {
    const full = path.join(DOWNLOADS_DIR, name);
    let stat = { size: 0, mtime: new Date(0) };
    try { stat = fs.statSync(full); } catch (e) {}
    return {
      name,
      size: stat.size,
      modified: stat.mtime,
      isExe: name.toLowerCase().endsWith('.exe'),
    };
  });
  res.json({ success: true, files });
}));

router.get('/installer/:name', (req, res) => {
  const name = path.basename(req.params.name);
  const full = path.join(DOWNLOADS_DIR, name);
  if (!/\.(zip|exe)$/i.test(name) || !fs.existsSync(full)) {
    return res.status(404).json({ success: false, error: 'Installer not found' });
  }
  res.download(full, name);
});

module.exports = router;
