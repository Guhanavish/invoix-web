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

async function createUser(userId, password, email) {
  const id = String(userId).trim().toLowerCase();
  if (!id) throw new Error('User id is required');
  if (!password || String(password).length < 4) throw new Error('Password must be at least 4 characters');
  if (!email || !String(email).includes('@')) throw new Error('A valid email address is required');
  if (await findUser(id)) throw new Error('User id already exists');
  if (await findUserByEmail(email)) throw new Error('That email is already registered to another account');

  const salt = crypto.randomBytes(16).toString('hex');
  const store = await loadUsers();
  store.users[id] = {
    salt,
    hash: hashPassword(password, salt),
    email: String(email).trim().toLowerCase(),
    createdAt: new Date().toISOString(),
  };
  await saveUsers(store);
  return { userId: id };
}

async function findUserByEmail(email) {
  if (!email) return null;
  const target = String(email).trim().toLowerCase();
  const store = await loadUsers();
  for (const key of Object.keys(store.users)) {
    const u = store.users[key];
    if (u.email && String(u.email).toLowerCase() === target) return u;
  }
  return null;
}

async function setUserEmail(userId, email) {
  const id = String(userId).toLowerCase();
  const store = await loadUsers();
  if (!store.users[id]) throw new Error('User not found');
  store.users[id].email = String(email).trim().toLowerCase();
  await saveUsers(store);
}

async function setUserPassword(userId, password) {
  const id = String(userId).toLowerCase();
  if (!password || String(password).length < 4) throw new Error('Password must be at least 4 characters');
  const store = await loadUsers();
  if (!store.users[id]) throw new Error('User not found');
  const salt = crypto.randomBytes(16).toString('hex');
  store.users[id].salt = salt;
  store.users[id].hash = hashPassword(password, salt);
  await saveUsers(store);
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

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const OTP_MAX_ATTEMPTS = 5;

function generateOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

async function createOtp(userId) {
  const id = String(userId).toLowerCase();
  const store = await loadUsers();
  const user = store.users[id];
  if (!user) throw new Error('User not found');
  if (!user.email) throw new Error('No email address on this account');
  user.otp = {
    code: generateOtp(),
    exp: Date.now() + OTP_TTL_MS,
    attempts: 0,
  };
  await saveUsers(store);
  return user.otp.code;
}

async function verifyOtp(userId, code) {
  const id = String(userId).toLowerCase();
  const store = await loadUsers();
  const user = store.users[id];
  if (!user || !user.otp) throw new Error('No OTP pending for this account');
  const otp = user.otp;
  otp.attempts = (otp.attempts || 0) + 1;
  if (otp.attempts > OTP_MAX_ATTEMPTS) {
    delete user.otp;
    await saveUsers(store);
    throw new Error('Too many incorrect attempts. Request a new OTP.');
  }
  if (otp.exp < Date.now()) {
    delete user.otp;
    await saveUsers(store);
    throw new Error('OTP has expired. Request a new one.');
  }
  if (String(code) !== String(otp.code)) {
    await saveUsers(store);
    throw new Error('Invalid OTP');
  }
  delete user.otp;
  await saveUsers(store);
  return true;
}

module.exports = { createUser, verifyUser, issueToken, verifyToken, findUser, loadUsers, findUserByEmail, setUserEmail, setUserPassword, createOtp, verifyOtp };
