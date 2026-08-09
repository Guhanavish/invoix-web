'use strict';

const express = require('express');
const router = express.Router();

// Public config the client needs (Google Client ID, app name).
// Lets the frontend and desktop app render the correct Google sign-in.
router.get('/', (req, res) => {
  res.json({
    appName: 'Invoix',
    googleClientId: process.env.GOOGLE_CLIENT_ID || null,
  });
});

module.exports = router;
