'use strict';

const express = require('express');
const { createUser, verifyUser, issueToken, findUser, loadUsers, saveUsers } = require('../lib/auth');
const { verifyGoogleIdToken } = require('../lib/google');

const router = express.Router();

// Wrap async route handlers so rejected promises become 500s (not unhandled)
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

const id = (userId) => String(userId).toLowerCase();

// Derive a stable backend user id from a Google account (stable across web + app)
function googleUserId(sub) {
  return `g_${sub}`;
}

router.post('/register', asyncHandler(async (req, res) => {
  const { userId, password } = req.body || {};
  if (!userId || !password) {
    return res.status(400).json({ success: false, error: 'User id and password are required' });
  }
  const existing = await findUser(id(userId));
  if (existing) {
    return res.status(409).json({ success: false, error: 'That user id is already taken. Try signing in, or use Google sign-in.' });
  }
  try {
    const user = await createUser(userId, password);
    res.json({ success: true, user });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
}));

router.post('/login', asyncHandler(async (req, res) => {
  const { userId, password } = req.body || {};
  if (!userId || !password) {
    return res.status(400).json({ success: false, error: 'User id and password are required' });
  }
  if (!(await verifyUser(userId, password))) {
    return res.status(401).json({ success: false, error: 'Invalid user id or password' });
  }
  const uid = id(userId);
  const user = await findUser(uid);
  res.json({
    success: true,
    token: issueToken(uid),
    user: { userId: uid, createdAt: user ? user.createdAt : null },
  });
}));

// Google login / sign-in — works for BOTH the website and the desktop app.
// The client sends a Google ID token; the server verifies it and resolves to a
// single stable account (keyed by Google's `sub`), so web + app share one sync identity.
router.post('/google', asyncHandler(async (req, res) => {
  const { id_token } = req.body || {};
  if (!id_token) {
    return res.status(400).json({ success: false, error: 'Missing Google id_token' });
  }

  let profile;
  try {
    profile = await verifyGoogleIdToken(id_token);
  } catch (e) {
    return res.status(401).json({ success: false, error: 'Invalid Google token: ' + e.message });
  }

  const uid = googleUserId(profile.sub);

  let user = await findUser(uid);
  if (!user) {
    // Auto-provision a password-less Google account
    const store = await loadUsers();
    store.users[uid] = {
      google: true,
      email: profile.email || null,
      name: profile.name || null,
      picture: profile.picture || null,
      createdAt: new Date().toISOString(),
    };
    await saveUsers(store);
    user = store.users[uid];
  } else if (profile.email && user.email !== profile.email) {
    // Keep profile info fresh
    const store = await loadUsers();
    store.users[uid] = { ...store.users[uid], email: profile.email, name: profile.name || store.users[uid].name, picture: profile.picture || store.users[uid].picture };
    await saveUsers(store);
  }

  res.json({
    success: true,
    token: issueToken(uid),
    user: {
      userId: uid,
      email: profile.email || user.email || null,
      name: profile.name || user.name || null,
      picture: profile.picture || user.picture || null,
      createdAt: user.createdAt,
    },
  });
}));

module.exports = router;
