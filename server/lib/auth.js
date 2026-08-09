'use strict';

const crypto = require('crypto');
const { TOKEN_SECRET, TOKEN_TTL_HOURS } = require('../config');
const storage = require('./storage');

const USERS_KEY = 'users.json';

async function loadUsers() {
  const data = await storage.readJSON(USERS_KEY);
  return data && data.users ? data : { users: {} };
}

async function saveUsers(store) {
  await storage.writeJSON(USERS_KEY, store);
}

function hashPassword(password, salt) {
  return crypto.scryptSync(String(password), salt, 64).toString('hex');
}

async function findUser(userId) {
  const store = await loadUsers();
  return store.users[String(userId).toLowerCase()] || null;
}

async function createUser(userId, password) {
  const id = String(userId).trim().toLowerCase();
  if (!id) throw new Error('User id is required');
  if (!password || String(password).length < 4) throw new Error('Password must be at least 4 characters');
  if (await findUser(id)) throw new Error('User id already exists');

  const salt = crypto.randomBytes(16).toString('hex');
  const store = await loadUsers();
  store.users[id] = {
    salt,
    hash: hashPassword(password, salt),
    createdAt: new Date().toISOString(),
  };
  await saveUsers(store);
  return { userId: id };
}

async function verifyUser(userId, password) {
  const user = await findUser(userId);
  if (!user || !user.hash) return false;
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

module.exports = { createUser, verifyUser, issueToken, verifyToken, findUser, loadUsers };
