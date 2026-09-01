'use strict';

const crypto = require('crypto');
const storage = require('./storage');

const APPROVALS_KEY = 'approvals.json';

let approvalsCache = null;
let approvalsCacheTime = 0;
const APPROVALS_CACHE_TTL_MS = 30000;

async function loadApprovalsStore() {
  const now = Date.now();
  if (approvalsCache && now - approvalsCacheTime < APPROVALS_CACHE_TTL_MS) {
    return approvalsCache;
  }
  const data = await storage.readJSON(APPROVALS_KEY);
  const store = data && Array.isArray(data.approvals) ? data : { approvals: [] };
  approvalsCache = store;
  approvalsCacheTime = now;
  return store;
}

async function saveApprovalsStore(store) {
  approvalsCache = store;
  approvalsCacheTime = Date.now();
  await storage.writeJSON(APPROVALS_KEY, store);
}

function generateId() {
  return crypto.randomBytes(8).toString('hex');
}

async function createApproval(userId, changes, currentUser) {
  const store = await loadApprovalsStore();
  const current = {};
  for (const k of Object.keys(changes)) {
    current[k] = currentUser ? currentUser[k] || null : null;
  }
  const approval = {
    id: generateId(),
    userId: String(userId).toLowerCase(),
    changes,
    current,
    status: 'pending',
    createdAt: new Date().toISOString(),
    decidedAt: null,
  };
  store.approvals.push(approval);
  await saveApprovalsStore(store);
  return approval;
}

async function listApprovals(userId) {
  const store = await loadApprovalsStore();
  const uid = String(userId).toLowerCase();
  return store.approvals.filter((a) => a.userId === uid).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function listPendingApprovals(userId) {
  const all = await listApprovals(userId);
  return all.filter((a) => a.status === 'pending');
}

async function getApproval(id) {
  const store = await loadApprovalsStore();
  return store.approvals.find((a) => a.id === id) || null;
}

async function decideApproval(id, decision, actorUserId) {
  const store = await loadApprovalsStore();
  const approval = store.approvals.find((a) => a.id === id);
  if (!approval) throw new Error('Approval not found');
  if (approval.status !== 'pending') throw new Error('Already decided');
  const requesterId = String(approval.userId).toLowerCase();
  const actorId = actorUserId ? String(actorUserId).toLowerCase() : null;
  // Only the same user (via app sync) can approve their own requests (app is acting on behalf of user)
  // For now allow any authenticated user to approve their own pending items
  if (actorId && actorId !== requesterId) {
    // Allow if actor is the same user (token's userId should match approval.userId)
    throw new Error('Not authorized to decide this approval');
  }
  approval.status = decision;
  approval.decidedAt = new Date().toISOString();
  approval.decidedBy = actorId || requesterId;

  if (decision === 'approved') {
    // Apply changes to users.json
    const auth = require('./auth');
    const authStore = await auth.loadUsers();
    const user = authStore.users[requesterId];
    if (user) {
      for (const [k, v] of Object.entries(approval.changes)) {
        if (k === 'email') {
          const newEmail = String(v).trim().toLowerCase();
          if (user.email !== newEmail) {
            user.email = newEmail;
            user.emailVerified = false;
            delete user.emailVerificationOtp;
          }
        } else {
          user[k] = v;
        }
      }
      await auth.saveUsers(authStore);
    }
  }

  await saveApprovalsStore(store);
  return approval;
}

module.exports = { createApproval, listApprovals, listPendingApprovals, getApproval, decideApproval, loadApprovalsStore };
