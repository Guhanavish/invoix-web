'use strict';

// Central input validation: every API route runs user-controlled values
// through these helpers (type + length + charset caps) before use.

const USER_ID_RE = /^[a-z0-9][a-z0-9._-]{1,31}$/i;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,253}\.[^\s@]{2,}$/;
const OTP_RE = /^\d{4,8}$/;

function str(v, max = 500) {
  if (v === undefined || v === null) return '';
  return String(v).slice(0, max);
}

function validUserId(v) {
  return typeof v === 'string' && USER_ID_RE.test(v.trim());
}

function validEmail(v) {
  return typeof v === 'string' && EMAIL_RE.test(v.trim());
}

function validOtp(v) {
  return OTP_RE.test(String(v || '').trim());
}

function validPassword(v) {
  return typeof v === 'string' && v.length >= 4 && v.length <= 128;
}

function validIdToken(v) {
  // Google JWTs are ~1-2KB; cap to block oversized-body abuse
  return typeof v === 'string' && v.length > 20 && v.length <= 8192;
}

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

module.exports = { str, validUserId, validEmail, validOtp, validPassword, validIdToken, num, USER_ID_RE };
