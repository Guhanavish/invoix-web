'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const { DOWNLOADS_DIR } = require('../config');

const router = express.Router();

function listInstallers() {
  try {
    return fs.readdirSync(DOWNLOADS_DIR).filter((f) => /\.(zip|exe)$/i.test(f));
  } catch (e) {
    return [];
  }
}

router.get('/installer/info', (req, res) => {
  const files = listInstallers().map((name) => {
    const full = path.join(DOWNLOADS_DIR, name);
    const stat = fs.statSync(full);
    return {
      name,
      size: stat.size,
      modified: stat.mtime,
      isExe: name.toLowerCase().endsWith('.exe'),
    };
  });
  res.json({ success: true, files });
});

router.get('/installer/:name', (req, res) => {
  const name = path.basename(req.params.name);
  const full = path.join(DOWNLOADS_DIR, name);
  if (!/\.(zip|exe)$/i.test(name) || !fs.existsSync(full)) {
    return res.status(404).json({ success: false, error: 'Installer not found' });
  }
  res.download(full, name);
});

module.exports = router;
