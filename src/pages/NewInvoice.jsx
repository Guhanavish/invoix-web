import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FilePlus2, Trash2, Plus, ArrowLeft } from 'lucide-react';
import { api, fmtMoney } from '../api';
import { useAutoRefresh } from '../useAutoSync';
import { PageHead, Loading } from '../components/ui';

const blankItem = { description: '', hsn_code: '', quantity: 1, unit: 'Nos', rate: 0, discount_percent: 0, gst_rate: 18, cess: 0 };

export default function NewInvoice() {
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [companyError, setCompanyError] = useState('');
  const [customer, setCustomer] = useState({ name: '', gstin: '', address: '', city: '', state: '', state_code: '', pincode: '', phone: '', email: '' });
  const [invoice, setInvoice] = useState({ invoice_date: new Date().toISOString().slice(0, 10), due_date: '', type: 'Sales', supply_type: 'B2B', place_of_supply: '', notes: '', terms: '' });
  const [items, setItems] = useState([{ ...blankItem }]);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);

  const loadCompany = () => {
    api.get('/data/company').then((res) => {
      if (res && res.active) {
        setCompany(res.active);
        if (res.active.state_code && !invoice.place_of_supply) {
          setInvoice((v) => ({ ...v, place_of_supply: String(res.active.state_code) }));
        }
      } else {
        setCompanyError('Your business profile has not been synced yet.');
      }
    }).catch((e) => setCompanyError(e.message));
  };

  useEffect(() => {
    loadCompany();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useAutoRefresh(loadCompany);

  const setCust = (k) => (e) => setCustomer((v) => ({ ...v, [k]: e.target.value }));
  const setInv = (k) => (e) => setInvoice((v) => ({ ...v, [k]: e.target.value }));
  const setItem = (idx, k) => (e) => {
    const next = items.map((it, i) => (i === idx ? { ...it, [k]: e.target.value } : it));
    setItems(next);
  };
  const addItem = () => setItems((v) => [...v, { ...blankItem }]);
  const removeItem = (idx) => setItems((v) => (v.length > 1 ? v.filter((_, i) => i !== idx) : v));

  const isInterState = () => {
    if (!company || !company.state_code) return true;
    return String(invoice.place_of_supply) !== String(company.state_code);
  };

  const totals = items.reduce(
    (acc, it) => {
      const qty = Number(it.quantity) || 1;
      const rate = Number(it.rate) || 0;
      const discPct = Number(it.discount_percent) || 0;
      const gstRate = Number(it.gst_rate) || 0;
      const lineTotal = qty * rate;
      const disc = lineTotal * (discPct / 100);
      const taxable = lineTotal - disc;
      const inter = isInterState();
      const cgst = inter ? 0 : taxable * (gstRate / 200);
      const sgst = inter ? 0 : taxable * (gstRate / 200);
      const igst = inter ? taxable * (gstRate / 100) : 0;
      const cess = taxable * ((Number(it.cess) || 0) / 100);
      acc.sub_total += lineTotal;
      acc.discount += disc;
      acc.cgst += cgst;
      acc.sgst += sgst;
      acc.igst += igst;
      acc.cess += cess;
      acc.grand += taxable + cgst + sgst + igst + cess;
      return acc;
    },
    { sub_total: 0, discount: 0, cgst: 0, sgst: 0, igst: 0, cess: 0, grand: 0 }
  );

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const payload = {
        customer: { ...customer, state_code: String(customer.state_code || invoice.place_of_supply || '') },
        items: items.map((it) => ({
          description: it.description,
          hsn_code: it.hsn_code,
          quantity: Number(it.quantity),
          unit: it.unit,
          rate: Number(it.rate),
          discount_percent: Number(it.discount_percent),
          gst_rate: Number(it.gst_rate),
          cess: Number(it.cess),
        })),
        invoice_date: invoice.invoice_date,
        due_date: invoice.due_date,
        type: invoice.type,
        supply_type: invoice.supply_type,
        place_of_supply: invoice.place_of_supply,
        notes: invoice.notes,
        terms: invoice.terms,
      };
      const res = await api.createPendingInvoice(payload);
      setOk(`Draft saved. Open the Invoix desktop app → Settings → Pending Invoices to verify and approve it.`);
      setBusy(false);
      setTimeout(() => navigate('/app/pending'), 1400);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  if (error && ok) setOk('');

  return (
    <div>
      <PageHead title="New Invoice (Draft)" sub="Create a draft on the web — it is stored safely and must be verified & approved in the desktop app before it counts.">
        <Link to="/app/invoices" className="btn btn-ghost btn-sm">
          <ArrowLeft size={14} /> Back
        </Link>
      </PageHead>

      {error && <div className="err-box" style={{ marginBottom: 16 }}>{error}</div>}
      {ok && <div className="ok-box" style={{ marginBottom: 16 }}>{ok}</div>}

      {companyError ? (
        <div className="card" style={{ padding: 20 }}>
          <div className="label">Couldn't load your business profile</div>
          <p style={{ color: 'var(--muted)', marginTop: 8 }}>
            {companyError} Sync your desktop app first (Desktop → Settings → Web Sync), then come back here.
          </p>
          <Link to="/app" className="btn btn-ghost btn-sm" style={{ marginTop: 12 }}>
            <ArrowLeft size={14} /> Go to Dashboard
          </Link>
        </div>
      ) : !company ? <Loading /> : (
        <form onSubmit={submit}>
          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <h3 style={{ marginBottom: 14, fontSize: 15 }}>Customer</h3>
            <div className="grid2">
              <div className="field"><label>Customer name *</label>
                <input className="input" value={customer.name} onChange={setCust('name')} placeholder="e.g. Sri Balaji Traders" required /></div>
              <div className="field"><label>GSTIN</label>
                <input className="input" value={customer.gstin} onChange={setCust('gstin')} placeholder="e.g. 33AAABC1234F1Z5" /></div>
              <div className="field" style={{ gridColumn: '1 / -1' }}><label>Address</label>
                <input className="input" value={customer.address} onChange={setCust('address')} placeholder="Street, area" /></div>
              <div className="field"><label>City</label>
                <input className="input" value={customer.city} onChange={setCust('city')} /></div>
              <div className="field"><label>State</label>
                <input className="input" value={customer.state} onChange={setCust('state')} /></div>
              <div className="field"><label>State code</label>
                <input className="input" value={customer.state_code} onChange={setCust('state_code')} placeholder="2-digit, e.g. 33" /></div>
              <div className="field"><label>Pincode</label>
                <input className="input" value={customer.pincode} onChange={setCust('pincode')} /></div>
              <div className="field"><label>Phone</label>
                <input className="input" value={customer.phone} onChange={setCust('phone')} /></div>
              <div className="field"><label>Email</label>
                <input className="input" value={customer.email} onChange={setCust('email')} /></div>
            </div>
          </div>

          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <h3 style={{ marginBottom: 14, fontSize: 15 }}>Invoice details</h3>
            <div className="grid2">
              <div className="field"><label>Invoice date *</label>
                <input className="input" type="date" value={invoice.invoice_date} onChange={setInv('invoice_date')} required /></div>
              <div className="field"><label>Due date</label>
                <input className="input" type="date" value={invoice.due_date} onChange={setInv('due_date')} /></div>
              <div className="field"><label>Place of supply (state code) *</label>
                <input className="input" value={invoice.place_of_supply} onChange={setInv('place_of_supply')} placeholder="e.g. 33" required /></div>
              <div className="field"><label>Supply type</label>
                <select className="input" value={invoice.supply_type} onChange={setInv('supply_type')}>
                  <option value="B2B">B2B</option>
                  <option value="B2C">B2C</option>
                </select></div>
            </div>
          </div>

          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: 15 }}>Items</h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={addItem}><Plus size={14} /> Add item</button>
            </div>
            {items.map((it, idx) => (
              <div key={idx} className="item-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 70px 1fr 1fr 80px 80px 36px', gap: 8, marginBottom: 8 }}>
                <div className="field"><label>Description</label>
                  <input className="input" value={it.description} onChange={setItem(idx, 'description')} placeholder="Item / service" required /></div>
                <div className="field"><label>HSN</label>
                  <input className="input" value={it.hsn_code} onChange={setItem(idx, 'hsn_code')} /></div>
                <div className="field"><label>Qty</label>
                  <input className="input" type="number" min="0" step="any" value={it.quantity} onChange={setItem(idx, 'quantity')} required /></div>
                <div className="field"><label>Rate</label>
                  <input className="input" type="number" min="0" step="any" value={it.rate} onChange={setItem(idx, 'rate')} required /></div>
                <div className="field"><label>Disc %</label>
                  <input className="input" type="number" min="0" step="any" value={it.discount_percent} onChange={setItem(idx, 'discount_percent')} /></div>
                <div className="field"><label>GST %</label>
                  <select className="input" value={it.gst_rate} onChange={setItem(idx, 'gst_rate')}>
                    {[0, 0.25, 3, 5, 12, 18, 28].map((g) => <option key={g} value={g}>{g}%</option>)}
                  </select></div>
                <div className="field"><label>Cess %</label>
                  <input className="input" type="number" min="0" step="any" value={it.cess} onChange={setItem(idx, 'cess')} /></div>
                <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 4 }}>
                  <button type="button" className="icon-btn" onClick={() => removeItem(idx)} title="Remove item"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
            <div style={{ marginTop: 12, textAlign: 'right', color: 'var(--muted)', fontSize: 14, display: 'grid', gap: 3 }}>
              <div>Sub total: <b style={{ color: 'var(--text)' }}>{fmtMoney(totals.sub_total)}</b></div>
              {totals.discount > 0 && <div>Discount: <b style={{ color: 'var(--text)' }}>−{fmtMoney(totals.discount)}</b></div>}
              {totals.cgst > 0 && <div>CGST: {fmtMoney(totals.cgst)}</div>}
              {totals.sgst > 0 && <div>SGST: {fmtMoney(totals.sgst)}</div>}
              {totals.igst > 0 && <div>IGST: {fmtMoney(totals.igst)}</div>}
              <div style={{ fontSize: 17, marginTop: 2 }}>Grand total: <b style={{ color: 'var(--text)' }}>{fmtMoney(totals.grand)}</b></div>
            </div>
          </div>

          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <div className="grid2">
              <div className="field"><label>Notes</label>
                <textarea className="input" rows={3} value={invoice.notes} onChange={setInv('notes')} placeholder="Visible on the invoice" /></div>
              <div className="field"><label>Terms</label>
                <textarea className="input" rows={3} value={invoice.terms} onChange={setInv('terms')} placeholder="Payment terms, etc." /></div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Link to="/app/invoices" className="btn btn-ghost">Cancel</Link>
            <button className="btn btn-primary" disabled={busy}>
              {busy ? <span className="spinner" /> : <FilePlus2 size={16} />}
              {busy ? 'Saving draft…' : 'Save draft'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
