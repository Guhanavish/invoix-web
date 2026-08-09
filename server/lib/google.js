'use strict';

const crypto = require('crypto');

const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
const JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const CERT_TTL_MS = 60 * 60 * 1000;

let certsCache = null;
let certsFetchedAt = 0;

async function getGoogleCerts() {
  const now = Date.now();
  if (certsCache && now - certsFetchedAt < CERT_TTL_MS) return certsCache;
  const res = await fetch(JWKS_URL);
  if (!res.ok) throw new Error('Failed to fetch Google certs');
  const data = await res.json();
  certsCache = data.keys;
  certsFetchedAt = now;
  return certsCache;
}

function base64urlToBase64(s) {
  return s.replace(/-/g, '+').replace(/_/g, '=').padEnd(s.length + ((4 - (s.length % 4)) % 4), '=');
}

function rsaPublicKeyFromJWK(jwk) {
  const modulus = Buffer.from(base64urlToBase64(jwk.n), 'base64');
  const exponent = Buffer.from(base64urlToBase64(jwk.e), 'base64');

  // Build DER-encoded RSA public key (PKCS#1) SubjectPublicKeyInfo
  const asn1Integer = (buf) => {
    const stripped = buf[0] === 0 ? buf.slice(1) : buf;
    const needsPad = stripped[0] & 0x80;
    const body = needsPad ? Buffer.concat([Buffer.from([0x00]), stripped]) : stripped;
    const len = body.length;
    const header = len < 0x80
      ? Buffer.from([0x02, len])
      : Buffer.from([0x02, 0x81, len]);
    return Buffer.concat([header, body]);
  };

  const modInt = asn1Integer(modulus);
  const expInt = asn1Integer(exponent);
  const rsaKeySeq = Buffer.concat([
    Buffer.from([0x30, modInt.length + expInt.length]),
    modInt,
    expInt,
  ]);

  const algorithm = Buffer.from('300d06092a864886f70d0101010500', 'hex');
  const bitString = Buffer.concat([
    Buffer.from([0x03, rsaKeySeq.length + 1, 0x00]),
    rsaKeySeq,
  ]);
  const spki = Buffer.concat([
    Buffer.from([0x30, algorithm.length + bitString.length]),
    algorithm,
    bitString,
  ]);

  return crypto.createPublicKey({
    key: spki,
    format: 'der',
    type: 'spki',
  });
}

// Verifies a Google ID token. Returns { sub, email, name, picture } or throws.
async function verifyGoogleIdToken(idToken) {
  const { GOOGLE_CLIENT_ID } = require('../config');
  const clientId = GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID is not configured');

  const parts = String(idToken).split('.');
  if (parts.length !== 3) throw new Error('Invalid token format');
  const [headerB64, payloadB64, signatureB64] = parts;

  let header, payload;
  try {
    header = JSON.parse(Buffer.from(base64urlToBase64(headerB64), 'base64').toString('utf8'));
    payload = JSON.parse(Buffer.from(base64urlToBase64(payloadB64), 'base64').toString('utf8'));
  } catch (e) {
    throw new Error('Invalid token encoding');
  }

  if (payload.exp * 1000 < Date.now()) throw new Error('Token expired');
  if (!GOOGLE_ISSUERS.includes(payload.iss)) throw new Error('Invalid token issuer');
  if (payload.aud !== clientId) throw new Error('Token audience mismatch');

  const keys = await getGoogleCerts();
  const key = keys.find((k) => k.kid === header.kid);
  if (!key) throw new Error('Unknown signing key');

  const publicKey = rsaPublicKeyFromJWK(key);
  const verify = crypto.createVerify('RSA-SHA256');
  verify.update(`${headerB64}.${payloadB64}`);
  const signature = Buffer.from(base64urlToBase64(signatureB64), 'base64');
  if (!verify.verify(publicKey, signature)) throw new Error('Invalid token signature');

  return {
    sub: payload.sub,
    email: payload.email || null,
    emailVerified: !!payload.email_verified,
    name: payload.name || null,
    picture: payload.picture || null,
  };
}

module.exports = { verifyGoogleIdToken };
