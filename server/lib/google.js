'use strict';

const { OAuth2Client } = require('google-auth-library');

const { GOOGLE_CLIENT_ID } = require('../config');

let oauthClient = null;
function client() {
  if (!oauthClient) oauthClient = new OAuth2Client(GOOGLE_CLIENT_ID);
  return oauthClient;
}

// Verifies a Google ID token. Returns { sub, email, name, picture } or throws.
async function verifyGoogleIdToken(idToken) {
  if (!GOOGLE_CLIENT_ID) throw new Error('GOOGLE_CLIENT_ID is not configured. Add it to Vercel env vars and to Google Cloud authorized origins.');

  const tokenStr = String(idToken || '').trim();
  if (!tokenStr || tokenStr.split('.').length !== 3) throw new Error('Malformed Google id_token');

  const ticket = await client().verifyIdToken({
    idToken: tokenStr,
    audience: GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload || !payload.sub) throw new Error('Invalid Google token payload');

  return {
    sub: String(payload.sub),
    email: payload.email ? String(payload.email).trim() : null,
    emailVerified: !!payload.email_verified,
    name: payload.name ? String(payload.name).trim() : null,
    picture: payload.picture || null,
  };
}

module.exports = { verifyGoogleIdToken };
