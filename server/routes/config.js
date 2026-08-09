'use strict';

const express = require('express');
const router = express.Router();
const { GOOGLE_CLIENT_ID } = require('../config');

// Public config the client needs (Google Client ID, app name).
// Lets the frontend and desktop app render the correct Google sign-in.
router.get('/', (req, res) => {
  res.json({
    appName: 'Invoix',
    googleClientId: GOOGLE_CLIENT_ID,
  });
});

module.exports = router;
