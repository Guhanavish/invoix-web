'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { USERS_DIR, TOKEN_SECRET, TOKEN_TTL_HOURS } = require('../config');

const USERS_FILE = path.join(USERS_DIR, 'users.json');

function loadUsers() {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  } catch (e) {
    return { users: {} };
  }
}

function saveUsers(store) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(store, null, 2));
}

function hashPassword(password, salt) {
  return crypto.scryptSync(String(password), salt, 64).toString('hex');
}

function findUser(userId) {
  const store = loadUsers();
  return store.users[String(userId).toLowerCase()] || null;
}

function createUser(userId, password) {
  const id = String(userId).trim().toLowerCase();
  if (!id) throw new Error('User id is required');
  if (!password || String(password).length < 4) throw new Error('Password must be at least 4 characters');
  if (findUser(id)) throw new Error('User id already exists');

  const salt = crypto.randomBytes(16).toString('hex');
  const store = loadUsers();
  store.users[id] = {
    salt,
    hash: hashPassword(password, salt),
    createdAt: new Date().toISOString(),
  };
  saveUsers(store);
  return { userId: id };
}

function verifyUser(userId, password) {
  const user = findUser(userId);
  if (!user) return false;
  const hash = hashPassword(password, user.salt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(user.hash, 'hex'));
}

function issueToken(userId) {
  const payload = {
    uid: String(userId).toLowerCase(),
    exp: Date.now() + TOKEN_TTL_HOURS * 3600 * 1000,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifyToken(token) {
  try {
    const [body, sig] = String(token).split('.');
    if (!body || !sig) return null;
    const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(body).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp < Date.now()) return null;
    return payload.uid;
  } catch (e) {
    return null;
  }
}

module.exports = { createUser, verifyUser, issueToken, verifyToken, findUser };
