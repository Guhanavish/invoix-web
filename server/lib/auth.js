'use strict';

const crypto = require('crypto');
const { TOKEN_SECRET, TOKEN_TTL_HOURS } = require('../config');
const storage = require('./storage');

const USERS_KEY = 'users.json';

// In-memory cache to avoid Blob eventual-consistency stale reads
// (Vercel Blob may return old data immediately after a put)
let usersCache = null;
let usersCacheTime = 0;
const USERS_CACHE_TTL_MS = 30000;

async function loadUsers() {
  const now = Date.now();
  // Use cache if fresh
  if (usersCache && now - usersCacheTime < USERS_CACHE_TTL_MS) {
    return usersCache;
  }
  const data = await storage.readJSON(USERS_KEY);
  const store = data && data.users ? data : { users: {} };
  // Ensure every user has emailVerified field (migration for old accounts)
  for (const k of Object.keys(store.users)) {
    if (store.users[k].emailVerified === undefined) {
      // Google accounts are implicitly verified via Google
      store.users[k].emailVerified = store.users[k].google ? true : false;
    }
  }
  usersCache = store;
  usersCacheTime = now;
  return store;
}

async function saveUsers(store) {
  // Update cache immediately to prevent stale reads in same instance
  usersCache = store;
  usersCacheTime = Date.now();
  await storage.writeJSON(USERS_KEY, store);
}

function invalidateUsersCache() {
  usersCache = null;
  usersCacheTime = 0;
}

// OTP paths must never trust the 30s instance cache: on serverless, the
// request that created the code and the request that verifies it routinely
// land on different instances, so a cached read returns "no OTP pending".
// Always re-read straight from storage here.
async function loadUsersFresh() {
  invalidateUsersCache();
  return loadUsers();
}

function hashPassword(password, salt) {
  return crypto.scryptSync(String(password), salt, 64).toString('hex');
}

async function findUser(userId) {
  const store = await loadUsers();
  return store.users[String(userId).toLowerCase()] || null;
}

const USER_ID_RE = /^[a-z0-9][a-z0-9._-]{1,31}$/i;

async function createUser(userId, password, email) {
  const id = String(userId).trim().toLowerCase();
  if (!id) throw new Error('User id is required');
  // Strict charset: user ids become storage keys/paths, so slashes, dots abuse
  // and traversal sequences must never reach the filesystem or Blob/B2 keys.
  if (!USER_ID_RE.test(id)) throw new Error('User id must be 2-32 characters: letters, numbers, dot, dash or underscore.');
  if (!password || String(password).length < 4 || String(password).length > 128) throw new Error('Password must be 4-128 characters');
  if (!email || !String(email).includes('@') || String(email).length > 320) throw new Error('A valid email address is required');
  if (await findUser(id)) throw new Error('User id already exists');
  if (await findUserByEmail(email)) throw new Error('That email is already registered to another account');

  const salt = crypto.randomBytes(16).toString('hex');
  const store = await loadUsers();
  store.users[id] = {
    salt,
    hash: hashPassword(password, salt),
    email: String(email).trim().toLowerCase(),
    emailVerified: false,
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
  const newEmail = String(email).trim().toLowerCase();
  if (store.users[id].email !== newEmail) {
    store.users[id].email = newEmail;
    store.users[id].emailVerified = false;
    delete store.users[id].emailVerificationOtp;
  }
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

async function createEmailVerificationOtp(userId) {
  const id = String(userId).toLowerCase();
  const store = await loadUsersFresh();
  const user = store.users[id];
  if (!user) throw new Error('User not found');
  if (!user.email) throw new Error('No email address on this account');
  if (user.emailVerified) throw new Error('Email is already verified');
  // Resend friendliness: if a live code already exists, re-send the SAME code
  // instead of killing the one sitting in the user's inbox.
  const live = user.emailVerificationOtp;
  if (live && live.exp > Date.now() && (live.attempts || 0) <= OTP_MAX_ATTEMPTS) {
    return live.code;
  }
  const code = generateOtp();
  user.emailVerificationOtp = {
    code,
    exp: Date.now() + OTP_TTL_MS,
    attempts: 0,
  };
  await saveUsers(store);
  return code;
}

async function verifyEmailOtp(userId, code) {
  const id = String(userId).toLowerCase();
  const store = await loadUsersFresh();
  const user = store.users[id];
  if (!user) throw new Error('User not found');
  if (user.emailVerified) return true;
  const otp = user.emailVerificationOtp;
  if (!otp) throw new Error('No verification code pending. Request a new code.');
  otp.attempts = (otp.attempts || 0) + 1;
  if (otp.attempts > OTP_MAX_ATTEMPTS) {
    delete user.emailVerificationOtp;
    await saveUsers(store);
    throw new Error('Too many incorrect attempts. Request a new code.');
  }
  if (otp.exp < Date.now()) {
    delete user.emailVerificationOtp;
    await saveUsers(store);
    throw new Error('Code has expired. Request a new one.');
  }
  if (String(code).trim() !== String(otp.code)) {
    await saveUsers(store);
    throw new Error('Invalid code');
  }
  user.emailVerified = true;
  delete user.emailVerificationOtp;
  await saveUsers(store);
  return true;
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
  const store = await loadUsersFresh();
  const user = store.users[id];
  if (!user) throw new Error('User not found');
  if (!user.email) throw new Error('No email address on this account');
  // Resend friendliness: re-send the SAME live code instead of killing the
  // one sitting in the user's inbox.
  if (user.otp && user.otp.exp > Date.now() && (user.otp.attempts || 0) <= OTP_MAX_ATTEMPTS) {
    return user.otp.code;
  }
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
  const store = await loadUsersFresh();
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
  if (String(code).trim() !== String(otp.code)) {
    await saveUsers(store);
    throw new Error('Invalid OTP');
  }
  delete user.otp;
  await saveUsers(store);
  return true;
}

module.exports = { createUser, verifyUser, issueToken, verifyToken, findUser, loadUsers, saveUsers, invalidateUsersCache, findUserByEmail, setUserEmail, setUserPassword, createOtp, verifyOtp, createEmailVerificationOtp, verifyEmailOtp };
