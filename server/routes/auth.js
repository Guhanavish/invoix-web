'use strict';

const express = require('express');
const { createUser, verifyUser, issueToken, findUser, loadUsers, saveUsers, findUserByEmail, setUserEmail, setUserPassword, createOtp, verifyOtp, createEmailVerificationOtp, verifyEmailOtp } = require('../lib/auth');
const { verifyGoogleIdToken } = require('../lib/google');
const { sendMail } = require('../lib/email');
const { requireAuth } = require('../middleware/auth');

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
    await createUser(userId, password, email);
    // Send verification code to the provided email (verified email required at creation)
    let verificationSent = false;
    try {
      const code = await createEmailVerificationOtp(id(userId));
      await sendMail({
        to: String(email).trim().toLowerCase(),
        subject: 'Invoix — verify your email',
        text: `Your verification code is ${code}. It expires in 10 minutes.`,
        html: `<p>Welcome to Invoix! Your verification code is</p><h2 style="letter-spacing:4px">${code}</h2><p>It expires in 10 minutes.</p>`,
      });
      verificationSent = true;
    } catch (e) {
      console.error('[auth/register] verification mail failed:', e.message);
    }
    res.json({
      success: true,
      userId: id(userId),
      email: String(email).trim().toLowerCase(),
      requiresVerification: true,
      verificationSent,
      message: verificationSent ? 'Account created. Verification code sent to your email.' : 'Account created but could not send email. Request a new code from login.',
    });
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
  // If email not yet verified, require verification (only once per account)
  if (user && user.emailVerified === false) {
    return res.status(403).json({
      success: false,
      error: 'Email not verified',
      code: 'EMAIL_NOT_VERIFIED',
      userId: uid,
      email: user.email,
    });
  }
  res.json({
    success: true,
    token: issueToken(uid),
    user: {
      userId: uid,
      email: user ? user.email : null,
      emailVerified: user ? !!user.emailVerified : false,
      createdAt: user ? user.createdAt : null,
    },
  });
}));

// Request a password-reset OTP. Uses the verified email on file.
router.post('/forgot', asyncHandler(async (req, res) => {
  const { userId, email } = req.body || {};
  if (!userId || !email || !String(email).includes('@')) {
    return res.status(400).json({ success: false, error: 'User id and email are required' });
  }
  const user = await findUser(id(userId));
  const emailMatches = user && user.email && String(user.email).toLowerCase() === String(email).trim().toLowerCase();
  // Also require verified email for reset (use verified email only)
  if (!user || !emailMatches || user.emailVerified === false) {
    return res.json({ success: true, message: 'If the user id and verified email match, an OTP has been sent.' });
  }
  const code = await createOtp(user.userId || id(userId));
  await sendMail({
    to: String(email).trim(),
    subject: 'Invoix password reset OTP',
    text: `Your Invoix password reset code is ${code}. It expires in 10 minutes. If you did not request this, ignore this email.`,
    html: `<p>Your Invoix password reset code is</p><h2 style="letter-spacing:4px">${code}</h2><p>It expires in 10 minutes. If you did not request this, you can ignore this email.</p>`,
  });
  res.json({ success: true, message: 'If the user id and verified email match, an OTP has been sent.' });
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
      // Gmail is the default verified email for Google auth.
      const store = await loadUsers();
      if (!store.users[uid]) {
        store.users[uid] = {
          google: true,
          email: normalizedEmail,
          emailVerified: true,
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
          emailVerified: true,
          name: profile.name ? String(profile.name).trim() : existing.name || null,
          picture: profile.picture || existing.picture || null,
        };
        await saveUsers(store);
        user = store.users[uid];
      } else if (user.emailVerified !== true && normalizedEmail) {
        // Ensure Google accounts are marked verified
        const store = await loadUsers();
        store.users[uid] = { ...store.users[uid], emailVerified: true };
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
      emailVerified: true,
      name: profile.name || user.name || null,
      picture: profile.picture || user.picture || null,
      createdAt: user.createdAt,
    },
  });
}));

// Email verification — request a code to the user's registered email
router.post('/verify-email/request', asyncHandler(async (req, res) => {
  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ success: false, error: 'User id is required' });
  const user = await findUser(id(userId));
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });
  if (user.emailVerified) return res.json({ success: true, message: 'Email already verified' });
  if (!user.email) return res.status(400).json({ success: false, error: 'No email on file' });
  const code = await createEmailVerificationOtp(id(userId));
  await sendMail({
    to: user.email,
    subject: 'Invoix — verify your email',
    text: `Your verification code is ${code}. It expires in 10 minutes.`,
    html: `<p>Your verification code is</p><h2 style="letter-spacing:4px">${code}</h2><p>It expires in 10 minutes.</p>`,
  });
  res.json({ success: true, message: 'Verification code sent to ' + user.email });
}));

// Email verification — confirm the code and mark verified
router.post('/verify-email/confirm', asyncHandler(async (req, res) => {
  const { userId, code } = req.body || {};
  if (!userId || !code) return res.status(400).json({ success: false, error: 'User id and code are required' });
  try {
    await verifyEmailOtp(id(userId), code);
    const user = await findUser(id(userId));
    // Issue token so they can proceed to app immediately after verification
    res.json({ success: true, token: issueToken(id(userId)), user: { userId: id(userId), email: user.email, emailVerified: true, createdAt: user.createdAt } });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
}));

// Current user profile (requires auth)
router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const user = await findUser(req.userId);
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });
  res.json({
    success: true,
    user: {
      userId: req.userId,
      email: user.email || null,
      emailVerified: !!user.emailVerified,
      name: user.name || null,
      picture: user.picture || null,
      phone: user.phone || null,
      businessName: user.businessName || null,
      address: user.address || null,
      city: user.city || null,
      createdAt: user.createdAt,
      google: !!user.google,
    },
  });
}));

// Request a profile change — creates an approval for the app to review
router.post('/profile/request', requireAuth, asyncHandler(async (req, res) => {
  const user = await findUser(req.userId);
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });
  const allowed = ['name', 'phone', 'businessName', 'address', 'city', 'email'];
  const changes = {};
  for (const k of allowed) {
    if (req.body[k] !== undefined && String(req.body[k]).trim() !== '') {
      changes[k] = String(req.body[k]).trim();
    }
  }
  if (Object.keys(changes).length === 0) return res.status(400).json({ success: false, error: 'No changes provided' });
  // If email is being changed, it will require re-verification
  if (changes.email && !changes.email.includes('@')) return res.status(400).json({ success: false, error: 'Invalid email' });

  const { createApproval } = require('../lib/approvals');
  const approval = await createApproval(req.userId, changes, user);
  res.json({ success: true, approval });
}));

router.get('/profile/approvals', requireAuth, asyncHandler(async (req, res) => {
  const { listApprovals } = require('../lib/approvals');
  const approvals = await listApprovals(req.userId);
  res.json({ success: true, approvals });
}));

module.exports = router;
