'use strict';

const initSqlJs = require('sql.js');
// Statically reference the wasm binary so serverless bundlers (Vercel) include
// it in the function trace. sql.js itself loads it via a runtime-computed path.
require.resolve('sql.js/dist/sql-wasm.wasm');
const storage = require('./storage');

let SQLPromise = null;
function sql() {
  if (!SQLPromise) SQLPromise = initSqlJs();
  return SQLPromise;
}

function userDbKey(userId) {
  return `${userId}/einvoice.db`;
}

function userMetaKey(userId) {
  return `${userId}/sync-meta.json`;
}

async function getUserDbBuffer(userId) {
  return storage.readRaw(userDbKey(userId));
}

function hasUserDb(userId) {
  return storage.exists(userDbKey(userId));
}

async function openUserDb(userId) {
  const buffer = await getUserDbBuffer(userId);
  if (!buffer) return null;
  const SQL = await sql();
  try {
    const db = new SQL.Database(buffer);
    db.run('PRAGMA foreign_keys = ON');
    return db;
  } catch (e) {
    return null;
  }
}

function queryAll(db, sqlText, params = []) {
  const stmt = db.prepare(sqlText);
  try {
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    return rows;
  } finally {
    stmt.free();
  }
}

function queryGet(db, sqlText, params = []) {
  const stmt = db.prepare(sqlText);
  try {
    stmt.bind(params);
    if (stmt.step()) return stmt.getAsObject();
    return null;
  } finally {
    stmt.free();
  }
}

function queryValue(db, sqlText, params = []) {
  const row = queryGet(db, sqlText, params);
  if (!row) return null;
  return Object.values(row)[0];
}

function countTables(db) {
  const tables = queryAll(
    db,
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
  );
  const counts = {};
  for (const t of tables) {
    try {
      counts[t.name] = Number(queryValue(db, `SELECT COUNT(*) FROM "${t.name}"`)) || 0;
    } catch (e) {
      counts[t.name] = 0;
    }
  }
  return { tables: tables.map((t) => t.name), counts };
}

async function withUserDb(userId, fn) {
  const db = await openUserDb(userId);
  if (!db) return null;
  try {
    return await fn(db);
  } finally {
    db.close();
  }
}

module.exports = {
  openUserDb, withUserDb, queryAll, queryGet, queryValue, countTables,
  hasUserDb, getUserDbBuffer, userDbKey, userMetaKey,
};
