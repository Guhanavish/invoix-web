'use strict';

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { listPendingApprovals, decideApproval } = require('../lib/approvals');

const router = express.Router();

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

router.use(requireAuth);

// List pending approvals for the authenticated user (used by desktop app)
router.get('/', asyncHandler(async (req, res) => {
  const approvals = await listPendingApprovals(req.userId);
  res.json({ success: true, approvals });
}));

// Approve an approval
router.post('/:id/approve', asyncHandler(async (req, res) => {
  const approval = await decideApproval(req.params.id, 'approved', req.userId);
  res.json({ success: true, approval });
}));

// Reject an approval
router.post('/:id/reject', asyncHandler(async (req, res) => {
  const approval = await decideApproval(req.params.id, 'rejected', req.userId);
  res.json({ success: true, approval });
}));

module.exports = router;
