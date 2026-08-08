'use strict';

const express = require('express');
const { createUser, verifyUser, issueToken, findUser } = require('../lib/auth');

const router = express.Router();

router.post('/register', (req, res) => {
  const { userId, password } = req.body || {};
  try {
    const user = createUser(userId, password);
    res.json({ success: true, user });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

router.post('/login', (req, res) => {
  const { userId, password } = req.body || {};
  if (!userId || !password) {
    return res.status(400).json({ success: false, error: 'User id and password are required' });
  }
  if (!verifyUser(userId, password)) {
    return res.status(401).json({ success: false, error: 'Invalid user id or password' });
  }
  const id = String(userId).toLowerCase();
  const user = findUser(id);
  res.json({
    success: true,
    token: issueToken(id),
    user: { userId: id, createdAt: user.createdAt },
  });
});

module.exports = router;
