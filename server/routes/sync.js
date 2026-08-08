'use strict';

const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { USERS_DIR } = require('../config');
const { requireAuth } = require('../middleware/auth');
const { hasUserDb, openUserDb, countTables, queryGet } = require('../lib/db');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 },
});

router.post('/upload', requireAuth, upload.single('db'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No database file received' });
  }
  const userId = req.userId;
  const userDir = path.join(USERS_DIR, userId);
  fs.mkdirSync(userDir, { recursive: true });
  const dbPath = path.join(userDir, 'einvoice.db');

  try {
    const SQL = await (require('sql.js'))();
    const sqlDb = new SQL.Database(req.file.buffer);
    const tables = countTables(sqlDb);
    sqlDb.close();

    fs.writeFileSync(dbPath, req.file.buffer);
    const meta = {
      lastSync: new Date().toISOString(),
      size: req.file.size,
      tables: tables.tables,
      counts: tables.counts,
    };
    fs.writeFileSync(path.join(userDir, 'sync-meta.json'), JSON.stringify(meta, null, 2));
    res.json({ success: true, syncedAt: meta.lastSync, counts: tables.counts });
  } catch (e) {
    res.status(400).json({ success: false, error: 'Invalid database file: ' + e.message });
  }
});

router.get('/status', requireAuth, async (req, res) => {
  const userId = req.userId;
  if (!hasUserDb(userId)) {
    return res.json({
      success: true,
      synced: false,
      message: 'No data synced yet. Open the Invoix desktop app and sync from Settings.',
    });
  }
  let meta = { lastSync: null };
  try {
    meta = JSON.parse(fs.readFileSync(path.join(USERS_DIR, userId, 'sync-meta.json'), 'utf8'));
  } catch (e) {}
  const db = await openUserDb(userId);
  const company = db ? queryGet(db, 'SELECT * FROM company ORDER BY id LIMIT 1') : null;
  if (db) db.close();
  res.json({
    success: true,
    synced: true,
    lastSync: meta.lastSync,
    size: meta.size,
    tables: meta.tables,
    counts: meta.counts,
    company: company ? { name: company.name, gstin: company.gstin } : null,
  });
});

module.exports = router;
