'use strict';

const { verifyToken } = require('../lib/auth');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const userId = token ? verifyToken(token) : null;
  if (!userId) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  req.userId = userId;
  next();
}

module.exports = { requireAuth };
