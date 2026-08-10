'use strict';

const express = require('express');
const crypto = require('crypto');
const { requireAuth } = require('../middleware/auth');
const storage = require('../lib/storage');

const router = express.Router();
router.use(requireAuth);

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function pendingKey(userId) {
  return `pending/${String(userId).toLowerCase()}.json`;
}

async function loadPending(userId) {
  const data = await storage.readJSON(pendingKey(userId));
  return data && Array.isArray(data.invoices) ? data.invoices : [];
}

async function savePending(userId, invoices) {
  await storage.writeJSON(pendingKey(userId), { invoices });
}

// Draft invoice created on the web — stored until approved/rejected in the desktop app.
router.post('/', asyncHandler(async (req, res) => {
  const { customer, items, invoice_date, due_date, type, supply_type, place_of_supply, notes, terms } = req.body || {};

  if (!customer || !customer.name || !String(customer.name).trim()) {
    return res.status(400).json({ success: false, error: 'Customer name is required' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, error: 'At least one invoice item is required' });
  }
  for (const it of items) {
    if (!it || !String(it.description || '').trim()) {
      return res.status(400).json({ success: false, error: 'Every item needs a description' });
    }
    if (!(Number(it.quantity) > 0)) {
      return res.status(400).json({ success: false, error: 'Every item needs a quantity greater than zero' });
    }
  }

  const pending = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    status: 'pending',
    customer: {
      name: String(customer.name).trim(),
      gstin: String(customer.gstin || '').trim(),
      address: String(customer.address || '').trim(),
      city: String(customer.city || '').trim(),
      state: String(customer.state || '').trim(),
      state_code: String(customer.state_code || '').trim(),
      pincode: String(customer.pincode || '').trim(),
      phone: String(customer.phone || '').trim(),
      email: String(customer.email || '').trim(),
    },
    invoice_date: String(invoice_date || ''),
    due_date: String(due_date || ''),
    type: type === 'Purchase' ? 'Purchase' : 'Sales',
    supply_type: supply_type === 'B2C' ? 'B2C' : 'B2B',
    place_of_supply: String(place_of_supply || '').trim(),
    notes: String(notes || ''),
    terms: String(terms || ''),
    items: items.map((it) => ({
      description: String(it.description || '').trim(),
      hsn_code: String(it.hsn_code || '').trim(),
      quantity: Number(it.quantity) || 1,
      unit: String(it.unit || 'Nos').trim(),
      rate: Number(it.rate) || 0,
      discount_percent: Number(it.discount_percent) || 0,
      gst_rate: Number(it.gst_rate) || 0,
      cess: Number(it.cess) || 0,
    })),
  };

  const invoices = await loadPending(req.userId);
  invoices.push(pending);
  await savePending(req.userId, invoices);

  res.json({ success: true, pending });
}));

router.get('/', asyncHandler(async (req, res) => {
  const invoices = await loadPending(req.userId);
  res.json({ success: true, invoices });
}));

// Desktop app calls this after it has approved AND written the invoice locally,
// or when the user rejects the draft. Removes it from the pending queue.
router.delete('/:id', asyncHandler(async (req, res) => {
  const invoices = await loadPending(req.userId);
  const idx = invoices.findIndex((p) => p.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'Pending invoice not found' });
  }
  invoices.splice(idx, 1);
  await savePending(req.userId, invoices);
  res.json({ success: true });
}));

module.exports = router;
