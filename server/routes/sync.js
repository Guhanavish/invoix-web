'use strict';

const express = require('express');
const multer = require('multer');
const { requireAuth } = require('../middleware/auth');
const { hasUserDb, openUserDb, countTables, queryGet, userDbKey, userMetaKey } = require('../lib/db');
const storage = require('../lib/storage');

const router = express.Router();

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 },
});

router.post('/upload', requireAuth, upload.single('db'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No database file received' });
  }
  const userId = req.userId;

  const SQL = await (require('sql.js/dist/sql-asm.js'))();
  const sqlDb = new SQL.Database(req.file.buffer);
  const tables = countTables(sqlDb);
  sqlDb.close();

  const meta = {
    lastSync: new Date().toISOString(),
    size: req.file.size,
    tables: tables.tables,
    counts: tables.counts,
  };

  await storage.writeRaw(userDbKey(userId), req.file.buffer);
  await storage.writeJSON(userMetaKey(userId), meta);

  res.json({ success: true, syncedAt: meta.lastSync, counts: tables.counts });
}));

router.get('/status', requireAuth, asyncHandler(async (req, res) => {
  const userId = req.userId;
  const dbExists = await hasUserDb(userId);
  if (!dbExists) {
    return res.json({
      success: true,
      synced: false,
      message: 'No data synced yet. Open the Invoix desktop app and sync from Settings.',
    });
  }
  let meta = { lastSync: null };
  try {
    meta = (await storage.readJSON(userMetaKey(userId))) || meta;
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
}));

module.exports = router;
