'use strict';

const express = require('express');
const { createUser, verifyUser, issueToken, findUser, loadUsers, saveUsers, findUserByEmail, setUserEmail, setUserPassword, createOtp, verifyOtp } = require('../lib/auth');
const { verifyGoogleIdToken } = require('../lib/google');
const { sendMail } = require('../lib/email');

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
  const { userId, password, email } = req.body || {};
  if (!userId || !password) {
    return res.status(400).json({ success: false, error: 'User id and password are required' });
  }
  if (!email || !String(email).includes('@')) {
    return res.status(400).json({ success: false, error: 'A valid email address is required' });
  }
  const existing = await findUser(id(userId));
  if (existing) {
    return res.status(409).json({ success: false, error: 'That user id is already taken. Try signing in, or use Google sign-in.' });
  }
  try {
    const user = await createUser(userId, password, email);
    res.json({ success: true, user, token: issueToken(id(userId)) });
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

// Request a password-reset OTP. The account's email (or the email provided when
// the account was created) must match — we never reveal whether a user id exists.
router.post('/forgot', asyncHandler(async (req, res) => {
  const { userId, email } = req.body || {};
  if (!userId || !email || !String(email).includes('@')) {
    return res.status(400).json({ success: false, error: 'User id and email are required' });
  }
  const user = await findUser(id(userId));
  const emailMatches = user && user.email && String(user.email).toLowerCase() === String(email).trim().toLowerCase();
  if (!user || !emailMatches) {
    // Always respond success-ish to avoid user-id enumeration.
    return res.json({ success: true, message: 'If the user id and email match, an OTP has been sent.' });
  }
  const code = await createOtp(user.userId || id(userId));
  await sendMail({
    to: String(email).trim(),
    subject: 'Invoix password reset OTP',
    text: `Your Invoix password reset code is ${code}. It expires in 10 minutes. If you did not request this, ignore this email.`,
    html: `<p>Your Invoix password reset code is</p><h2 style="letter-spacing:4px">${code}</h2><p>It expires in 10 minutes. If you did not request this, you can ignore this email.</p>`,
  });
  res.json({ success: true, message: 'If the user id and email match, an OTP has been sent.' });
}));

// Verify OTP and set a new password.
router.post('/reset', asyncHandler(async (req, res) => {
  const { userId, email, otp, newPassword } = req.body || {};
  if (!userId || !otp || !newPassword) {
    return res.status(400).json({ success: false, error: 'User id, OTP and new password are required' });
  }
  const user = await findUser(id(userId));
  const emailMatches = user && user.email && String(user.email).toLowerCase() === String(email || '').trim().toLowerCase();
  if (!user || !emailMatches) {
    return res.status(400).json({ success: false, error: 'Invalid request. Try requesting a new OTP.' });
  }
  try {
    await verifyOtp(id(userId), otp);
    await setUserPassword(id(userId), newPassword);
    res.json({ success: true, message: 'Password updated. You can now sign in.' });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
}));

// Google login / sign-in — works for BOTH the website and the desktop app.
// The client sends a Google ID token; the server verifies it and resolves to a
// single stable account (keyed by Google's `sub`), so web + app share one sync identity.
// If the Google account has no existing profile, a new password-less account is
// auto-provisioned so "Sign in with Google" always succeeds for any Google user.
router.post('/google', asyncHandler(async (req, res) => {
  const { id_token } = req.body || {};
  if (!id_token) {
    return res.status(400).json({ success: false, error: 'Missing Google id_token' });
  }

  let profile;
  try {
    profile = await verifyGoogleIdToken(id_token);
  } catch (e) {
    console.error('[auth/google] token verification failed:', e.message);
    const hint = !process.env.GOOGLE_CLIENT_ID
      ? ' Server is missing GOOGLE_CLIENT_ID env var.'
      : /audience|origin|authorized/i.test(e.message)
        ? ' This usually means https://invoixweb.vercel.app is not added as an Authorized JavaScript origin in Google Cloud Console for this OAuth client ID.'
        : '';
    return res.status(401).json({ success: false, error: 'Google sign-in failed: ' + e.message + hint });
  }

  if (!profile || !profile.sub) {
    return res.status(401).json({ success: false, error: 'Google sign-in failed: missing subject in token' });
  }

  const uid = googleUserId(profile.sub);
  const normalizedEmail = profile.email ? String(profile.email).trim().toLowerCase() : null;

  let user;
  try {
    user = await findUser(uid);
    if (!user) {
      // Auto-provision a password-less Google account for first-time Google users.
      // This is the requested behaviour: any Google account without a profile gets a new account.
      const store = await loadUsers();
      // Re-check after loading to avoid race with concurrent provisioning
      if (!store.users[uid]) {
        store.users[uid] = {
          google: true,
          email: normalizedEmail,
          name: profile.name ? String(profile.name).trim() : null,
          picture: profile.picture || null,
          createdAt: new Date().toISOString(),
        };
        await saveUsers(store);
      }
      user = store.users[uid];
    } else {
      // Keep profile info fresh (email/name/picture) if Google profile changed
      const needsUpdate =
        (normalizedEmail && user.email !== normalizedEmail) ||
        (profile.name && user.name !== profile.name) ||
        (profile.picture && user.picture !== profile.picture);
      if (needsUpdate) {
        const store = await loadUsers();
        const existing = store.users[uid] || user;
        store.users[uid] = {
          ...existing,
          email: normalizedEmail || existing.email || null,
          name: profile.name ? String(profile.name).trim() : existing.name || null,
          picture: profile.picture || existing.picture || null,
        };
        await saveUsers(store);
        user = store.users[uid];
      }
    }
  } catch (e) {
    console.error('[auth/google] storage error:', e);
    const isStorageUnset = e && /Account storage is unavailable/i.test(e.message);
    return res.status(500).json({
      success: false,
      error: isStorageUnset
        ? 'Account storage is unavailable. Check that Vercel Blob is connected to this project.'
        : 'Google sign-in failed: ' + (e.message || 'storage error'),
    });
  }

  res.json({
    success: true,
    token: issueToken(uid),
    user: {
      userId: uid,
      email: normalizedEmail || user.email || null,
      name: profile.name || user.name || null,
      picture: profile.picture || user.picture || null,
      createdAt: user.createdAt,
    },
  });
}));

module.exports = router;
