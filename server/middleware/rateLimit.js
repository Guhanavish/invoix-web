'use strict';

// Zero-dependency in-memory rate limiter (per-IP sliding window).
// Serverless instances each keep their own counters, which is sufficient as a
// brute-force/OTP-bombing brake (an attacker is still slowed on every instance).

function createLimiter({ windowMs, max, message }) {
  const hits = new Map(); // ip -> array of timestamps
  return (req, res, next) => {
    const now = Date.now();
    const ip =
      (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
      req.socket?.remoteAddress ||
      'unknown';
    let arr = hits.get(ip);
    if (!arr) {
      arr = [];
      hits.set(ip, arr);
    }
    while (arr.length && now - arr[0] > windowMs) arr.shift();
    if (arr.length >= max) {
      res.setHeader('Retry-After', Math.ceil(windowMs / 1000));
      return res.status(429).json({ success: false, error: message || 'Too many requests. Please slow down and try again.' });
    }
    arr.push(now);
    // Prevent unbounded growth in long-lived processes
    if (hits.size > 10000) {
      for (const [k, v] of hits) {
        if (!v.length || now - v[v.length - 1] > windowMs) hits.delete(k);
        if (hits.size <= 5000) break;
      }
    }
    next();
  };
}

// General API brake: 300 requests / 15 min / IP
const apiLimiter = createLimiter({ windowMs: 15 * 60 * 1000, max: 300 });

// Auth endpoints (login/register/forgot/reset/google): 30 / 15 min / IP
const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many sign-in attempts. Please wait a few minutes and try again.',
});

// OTP/email-sending endpoints: 10 / hour / IP (stops email bombing)
const otpLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many code requests. Please wait an hour before requesting another code.',
});

module.exports = { createLimiter, apiLimiter, authLimiter, otpLimiter };
