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
  if (!GOOGLE_CLIENT_ID) throw new Error('GOOGLE_CLIENT_ID is not configured');

  const ticket = await client().verifyIdToken({
    idToken: String(idToken),
    audience: GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();

  return {
    sub: payload.sub,
    email: payload.email || null,
    emailVerified: !!payload.email_verified,
    name: payload.name || null,
    picture: payload.picture || null,
  };
}

module.exports = { verifyGoogleIdToken };
