'use strict';

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { withUserDb, hasUserDb, queryAll, queryGet, queryValue } = require('../lib/db');

const router = express.Router();
router.use(requireAuth);

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// guard ensures the user has synced data, opens their DB, runs fn, and sends the JSON response.
// fn receives (db, req) so routes can read query params.
async function guard(req, res, fn) {
  if (!(await hasUserDb(req.userId))) {
    return res.status(404).json({ success: false, error: 'No data synced yet' });
  }
  const result = await withUserDb(req.userId, (db) => fn(db, req));
  if (result === null) {
    return res.status(404).json({ success: false, error: 'No data synced yet' });
  }
  return res.json({ success: true, ...result });
}

// route(fn) => a handler that awaits guard, so each endpoint stays a single clean block.
const route = (fn) => asyncHandler(async (req, res) => { await guard(req, res, fn); });

router.get('/company', route(async (db, req) => {
  const companies = queryAll(db, 'SELECT * FROM company ORDER BY id');
  return { companies, active: companies[0] || null };
}));

router.get('/dashboard', route(async (db, req) => {
  const cid = Number(req.query.company_id) || 1;
  const totalCustomers = Number(queryGet(db, 'SELECT COUNT(*) as cnt FROM customers').cnt);
  const totalProducts = Number(queryGet(db, 'SELECT COUNT(*) as cnt FROM products').cnt);
  const totalInvoices = Number(queryGet(db, 'SELECT COUNT(*) as cnt FROM invoices WHERE company_id = ?', [cid]).cnt);
  const totalRevenue = Number(queryGet(db, 'SELECT COALESCE(SUM(grand_total), 0) as total FROM invoices WHERE company_id = ?', [cid]).total);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthlyRevenue = Number(queryGet(
    db,
    `SELECT COALESCE(SUM(grand_total), 0) as total FROM invoices WHERE company_id = ? AND strftime('%Y-%m', invoice_date) = ?`,
    [cid, currentMonth]
  ).total);
  const salesRevenue = Number(queryGet(db, `SELECT COALESCE(SUM(grand_total), 0) as total FROM invoices WHERE company_id = ? AND type='Sales'`, [cid]).total);
  const purchaseTotal = Number(queryGet(db, `SELECT COALESCE(SUM(grand_total), 0) as total FROM invoices WHERE company_id = ? AND type='Purchase'`, [cid]).total);
  const recentInvoices = queryAll(
    db,
    `SELECT i.*, c.name as customer_name FROM invoices i JOIN customers c ON i.customer_id = c.id WHERE i.company_id = ? ORDER BY i.id DESC LIMIT 5`,
    [cid]
  );
  const monthlyData = queryAll(
    db,
    `SELECT strftime('%Y-%m', invoice_date) as month, COALESCE(SUM(grand_total), 0) as total
     FROM invoices WHERE company_id = ? GROUP BY month ORDER BY month DESC LIMIT 12`,
    [cid]
  ).reverse();
  const dueInvoices = Number(queryGet(
    db,
    `SELECT COUNT(*) as cnt FROM invoices WHERE company_id = ? AND type='Sales' AND due_date != '' AND due_date < date('now') AND paid_amount < grand_total`,
    [cid]
  ).cnt);
  const totalDue = Number(queryGet(
    db,
    `SELECT COALESCE(SUM(grand_total - paid_amount), 0) as total FROM invoices WHERE company_id = ? AND type='Sales' AND due_date != '' AND due_date < date('now') AND paid_amount < grand_total`,
    [cid]
  ).total);
  const totalPending = Number(queryGet(
    db,
    `SELECT COALESCE(SUM(grand_total - paid_amount), 0) as total FROM invoices WHERE company_id = ? AND type='Sales' AND paid_amount < grand_total`,
    [cid]
  ).total);
  const company = queryGet(db, 'SELECT * FROM company WHERE id = ?', [cid]);
  return {
    company,
    totalCustomers, totalProducts, totalInvoices, totalRevenue, monthlyRevenue,
    salesRevenue, purchaseTotal, recentInvoices, monthlyData,
    dueInvoices, totalDue, totalPending,
  };
}));

router.get('/invoices', route(async (db, req) => {
  const { search, from, to, type, company_id, overdue } = req.query;
  let q = `SELECT i.*, c.name as customer_name, c.gstin as customer_gstin
           FROM invoices i JOIN customers c ON i.customer_id = c.id WHERE 1=1`;
  const params = [];
  if (search) {
    q += ` AND (i.invoice_no LIKE ? OR c.name LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }
  if (from) { q += ` AND i.invoice_date >= ?`; params.push(from); }
  if (to) { q += ` AND i.invoice_date <= ?`; params.push(to); }
  if (type) { q += ` AND i.type = ?`; params.push(type); }
  if (company_id) { q += ` AND i.company_id = ?`; params.push(Number(company_id)); }
  if (overdue === 'yes') {
    q += ` AND i.due_date != '' AND i.due_date < date('now') AND i.paid_amount < i.grand_total`;
  }
  q += ' ORDER BY i.id DESC';
  return { invoices: queryAll(db, q, params) };
}));

router.get('/invoices/:id', route(async (db, req) => {
  const invoice = queryGet(
    db,
    `SELECT i.*, c.name as customer_name, c.gstin as customer_gstin, c.address as customer_address,
     c.city as customer_city, c.state as customer_state, c.state_code as customer_state_code,
     c.pincode as customer_pincode, c.phone as customer_phone, c.email as customer_email
     FROM invoices i JOIN customers c ON i.customer_id = c.id WHERE i.id = ?`,
    [Number(req.params.id)]
  );
  if (!invoice) return null;
  invoice.items = queryAll(db, 'SELECT * FROM invoice_items WHERE invoice_id = ?', [invoice.id]);
  return { invoice };
}));

router.get('/customers', route(async (db, req) => {
  const search = req.query.search;
  if (search) {
    return { customers: queryAll(db, 'SELECT * FROM customers WHERE name LIKE ? OR gstin LIKE ? OR phone LIKE ? ORDER BY name', [`%${search}%`, `%${search}%`, `%${search}%`]) };
  }
  return { customers: queryAll(db, 'SELECT * FROM customers ORDER BY name') };
}));

router.get('/customers/:id', route(async (db, req) => {
  const customer = queryGet(db, 'SELECT * FROM customers WHERE id = ?', [Number(req.params.id)]);
  if (!customer) return null;
  const invoices = queryAll(db, 'SELECT * FROM invoices WHERE customer_id = ? ORDER BY id DESC', [customer.id]);
  return { customer, invoices };
}));

router.get('/products', route(async (db, req) => {
  const search = req.query.search;
  if (search) {
    return { products: queryAll(db, 'SELECT * FROM products WHERE name LIKE ? OR hsn_code LIKE ? ORDER BY name', [`%${search}%`, `%${search}%`]) };
  }
  return { products: queryAll(db, 'SELECT * FROM products ORDER BY name') };
}));

router.get('/ledger', route(async (db, req) => {
  const { company_id, customer_id, from, to, search } = req.query;
  let q = `SELECT l.*, c.name as customer_name, c.gstin as customer_gstin
           FROM ledger_entries l JOIN customers c ON l.customer_id = c.id WHERE 1=1`;
  const params = [];
  if (company_id) { q += ` AND l.company_id = ?`; params.push(Number(company_id)); }
  if (customer_id) { q += ` AND l.customer_id = ?`; params.push(Number(customer_id)); }
  if (from) { q += ` AND l.entry_date >= ?`; params.push(from); }
  if (to) { q += ` AND l.entry_date <= ?`; params.push(to); }
  if (search) { q += ` AND (l.particulars LIKE ? OR c.name LIKE ?)`; params.push(`%${search}%`, `%${search}%`); }
  q += ' ORDER BY l.entry_date ASC, l.id ASC';
  return { entries: queryAll(db, q, params) };
}));

router.get('/ledger/balances', route(async (db, req) => {
  const companyId = Number(req.query.company_id) || 1;
  const balances = queryAll(
    db,
    `SELECT c.id, c.name, c.gstin,
      COALESCE((SELECT balance FROM ledger_entries WHERE customer_id = c.id AND company_id = ? ORDER BY id DESC LIMIT 1), 0) as balance,
      COALESCE((SELECT SUM(debit) FROM ledger_entries WHERE customer_id = c.id AND company_id = ?), 0) as total_debit,
      COALESCE((SELECT SUM(credit) FROM ledger_entries WHERE customer_id = c.id AND company_id = ?), 0) as total_credit
     FROM customers c
     WHERE c.id IN (SELECT DISTINCT customer_id FROM ledger_entries WHERE company_id = ?)
     ORDER BY c.name`,
    [companyId, companyId, companyId, companyId]
  );
  return { balances };
}));

router.get('/reports/gstr1', route(async (db, req) => {
  const from = req.query.from || '1900-01-01';
  const to = req.query.to || '2999-12-31';
  const cid = Number(req.query.company_id) || 1;
  const sales = queryAll(
    db,
    `SELECT i.invoice_no, i.invoice_date, c.name as customer_name, c.gstin as customer_gstin,
      i.sub_total, i.cgst_total, i.sgst_total, i.igst_total, i.grand_total, i.supply_type,
      i.place_of_supply
     FROM invoices i JOIN customers c ON i.customer_id = c.id
     WHERE i.company_id = ? AND i.type = 'Sales' AND i.invoice_date >= ? AND i.invoice_date <= ?
     ORDER BY i.invoice_date`,
    [cid, from, to]
  );
  const b2b = sales.filter((s) => s.supply_type === 'B2B');
  const b2c = sales.filter((s) => s.supply_type === 'B2C');
  const sum = (arr, key) => arr.reduce((s, i) => s + (Number(i[key]) || 0), 0);
  return {
    sales,
    b2b,
    b2c,
    totalTaxable: sum(sales, 'sub_total'),
    totalCgst: sum(sales, 'cgst_total'),
    totalSgst: sum(sales, 'sgst_total'),
    totalIgst: sum(sales, 'igst_total'),
    totalInvoiceValue: sum(sales, 'grand_total'),
    count: sales.length,
  };
}));

router.get('/reports/gstr3b', route(async (db, req) => {
  const from = req.query.from || '1900-01-01';
  const to = req.query.to || '2999-12-31';
  const cid = Number(req.query.company_id) || 1;
  const sales = queryAll(
    db,
    `SELECT i.invoice_no, i.invoice_date, c.name as customer_name, c.gstin as customer_gstin,
      i.sub_total, i.cgst_total, i.sgst_total, i.igst_total, i.grand_total, i.place_of_supply, i.supply_type
     FROM invoices i JOIN customers c ON i.customer_id = c.id
     WHERE i.company_id = ? AND i.type = 'Sales' AND i.invoice_date >= ? AND i.invoice_date <= ?
     ORDER BY i.invoice_date`,
    [cid, from, to]
  );
  const purchases = queryAll(
    db,
    `SELECT i.invoice_no, i.invoice_date, c.name as supplier_name, c.gstin as supplier_gstin,
      i.sub_total, i.cgst_total, i.sgst_total, i.igst_total, i.grand_total, i.place_of_supply
     FROM invoices i JOIN customers c ON i.customer_id = c.id
     WHERE i.company_id = ? AND i.type = 'Purchase' AND i.invoice_date >= ? AND i.invoice_date <= ?
     ORDER BY i.invoice_date`,
    [cid, from, to]
  );
  const sum = (arr, key) => arr.reduce((s, i) => s + (Number(i[key]) || 0), 0);
  const s = {
    count: sales.length,
    taxable: sum(sales, 'sub_total'),
    cgst: sum(sales, 'cgst_total'),
    sgst: sum(sales, 'sgst_total'),
    igst: sum(sales, 'igst_total'),
    totalTax: sum(sales, 'cgst_total') + sum(sales, 'sgst_total') + sum(sales, 'igst_total'),
  };
  const p = {
    count: purchases.length,
    taxable: sum(purchases, 'sub_total'),
    cgst: sum(purchases, 'cgst_total'),
    sgst: sum(purchases, 'sgst_total'),
    igst: sum(purchases, 'igst_total'),
    totalTax: sum(purchases, 'cgst_total') + sum(purchases, 'sgst_total') + sum(purchases, 'igst_total'),
  };
  return { sales: s, salesList: sales, purchases: p, purchasesList: purchases, netTaxLiability: s.totalTax - p.totalTax };
}));

router.get('/reports/aging', route(async (db, req) => {
  const cid = Number(req.query.company_id) || 1;
  const today = new Date().toISOString().slice(0, 10);
  const overdue = queryAll(
    db,
    `SELECT i.*, c.name as customer_name, c.gstin as customer_gstin,
      (i.grand_total - i.paid_amount) as outstanding,
      CAST(julianday(?) - julianday(i.due_date) AS INTEGER) as days_overdue
     FROM invoices i JOIN customers c ON i.customer_id = c.id
     WHERE i.company_id = ? AND i.type='Sales' AND i.due_date != '' AND i.due_date < ? AND i.paid_amount < i.grand_total
     ORDER BY i.due_date ASC`,
    [today, cid, today]
  );
  const buckets = { '0-30': [], '31-60': [], '61-90': [], '90+': [] };
  let totalOutstanding = 0;
  overdue.forEach((inv) => {
    const d = Number(inv.days_overdue) || 0;
    totalOutstanding += Number(inv.outstanding) || 0;
    if (d <= 30) buckets['0-30'].push(inv);
    else if (d <= 60) buckets['31-60'].push(inv);
    else if (d <= 90) buckets['61-90'].push(inv);
    else buckets['90+'].push(inv);
  });
  return { overdue, buckets, totalOutstanding, count: overdue.length };
}));

module.exports = router;
