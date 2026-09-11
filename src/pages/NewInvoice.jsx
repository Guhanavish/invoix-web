import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FilePlus2, Trash2, Plus, ArrowLeft, CheckCircle2, WifiOff, Inbox, FileText } from 'lucide-react';
import { api, fmtMoney } from '../api';
import { useAutoRefresh } from '../useAutoSync';
import { Loading, FieldError, OfflineBar, useOnline } from '../components/ui';

const blankItem = { description: '', hsn_code: '', quantity: 1, unit: 'Nos', rate: 0, discount_percent: 0, gst_rate: 18, cess: 0 };
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,253}\.[^\s@]{2,}$/;

export default function NewInvoice() {
  const navigate = useNavigate();
  const online = useOnline();
  const [company, setCompany] = useState(null);
  const [companyError, setCompanyError] = useState('');
  const [customer, setCustomer] = useState({ name: '', gstin: '', address: '', city: '', state: '', state_code: '', pincode: '', phone: '', email: '' });
  const [invoice, setInvoice] = useState({ invoice_date: new Date().toISOString().slice(0, 10), due_date: '', type: 'Sales', supply_type: 'B2B', place_of_supply: '', notes: '', terms: '' });
  const [items, setItems] = useState([{ ...blankItem }]);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null); // { id, customer, total, type }

  const loadCompany = () => {
    api.get('/data/company').then((res) => {
      if (res && res.active) {
        setCompany(res.active);
        if (res.active.state_code && !invoice.place_of_supply) {
          setInvoice((v) => ({ ...v, place_of_supply: String(res.active.state_code) }));
        }
      } else setCompanyError('Your business folio has not been pressed yet.');
    }).catch((e) => setCompanyError(e.message));
  };

  useEffect(() => { loadCompany(); }, []);
  useAutoRefresh(loadCompany);

  const setCust = (k) => (e) => setCustomer((v) => ({ ...v, [k]: e.target.value }));
  const setInv = (k) => (e) => setInvoice((v) => ({ ...v, [k]: e.target.value }));
  const setItem = (idx, k) => (e) => { const next = items.map((it, i) => (i === idx ? { ...it, [k]: e.target.value } : it)); setItems(next); };
  const addItem = () => setItems((v) => [...v, { ...blankItem }]);
  const removeItem = (idx) => setItems((v) => (v.length > 1 ? v.filter((_, i) => i !== idx) : v));

  const isInterState = () => {
    if (!company || !company.state_code) return true;
    return String(invoice.place_of_supply) !== String(company.state_code);
  };

  const totals = items.reduce((acc, it) => {
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
  }, { sub_total: 0, discount: 0, cgst: 0, sgst: 0, igst: 0, cess: 0, grand: 0 });

  const validate = () => {
    const errs = {};
    if (!customer.name.trim()) errs.customer_name = 'Give the draft a customer. A name is required.';
    if (customer.email.trim() && !EMAIL_RE.test(customer.email.trim())) errs.customer_email = 'That email does not look complete. Check for typos.';
    if (customer.gstin.trim() && !/^[0-9A-Z]{15}$/i.test(customer.gstin.trim())) errs.customer_gstin = 'GSTIN is 15 characters, digits and capitals only.';
    if (!invoice.invoice_date) errs.invoice_date = 'Pick the invoice date.';
    if (!invoice.place_of_supply.trim()) errs.place_of_supply = 'Enter the 2-digit state code where the supply lands.';
    const rowErrs = {};
    items.forEach((it, idx) => {
      const r = {};
      if (!String(it.description || '').trim()) r.description = 'Describe the item.';
      if (!(Number(it.quantity) > 0)) r.quantity = 'Qty must be above zero.';
      if (!(Number(it.rate) >= 0) || it.rate === '') r.rate = 'Enter a rate of 0 or more.';
      if (Object.keys(r).length) rowErrs[idx] = r;
    });
    if (Object.keys(rowErrs).length) errs.items = rowErrs;
    return errs;
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      setError('A few fields need attention before this draft can be pressed. They are marked below.');
      return;
    }
    if (!online) return;
    setBusy(true);
    try {
      const payload = {
        customer: { ...customer, state_code: String(customer.state_code || invoice.place_of_supply || '') },
        items: items.map((it) => ({
          description: it.description, hsn_code: it.hsn_code, quantity: Number(it.quantity), unit: it.unit, rate: Number(it.rate),
          discount_percent: Number(it.discount_percent), gst_rate: Number(it.gst_rate), cess: Number(it.cess),
        })),
        invoice_date: invoice.invoice_date, due_date: invoice.due_date, type: invoice.type,
        supply_type: invoice.supply_type, place_of_supply: invoice.place_of_supply, notes: invoice.notes, terms: invoice.terms,
      };
      const res = await api.createPendingInvoice(payload);
      setBusy(false);
      try {
        const { trackEvent } = await import('../routeMeta');
        trackEvent('draft_created');
      } catch {}
      setDone({
        id: res.pending?.id || '',
        customer: customer.name.trim(),
        total: totals.grand,
        type: invoice.type,
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) { setError(err.message); setBusy(false); }
  };

  const resetForm = () => {
    setCustomer({ name: '', gstin: '', address: '', city: '', state: '', state_code: '', pincode: '', phone: '', email: '' });
    setInvoice((v) => ({ ...v, notes: '', terms: '' }));
    setItems([{ ...blankItem }]);
    setFieldErrors({});
    setError('');
    setDone(null);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
        <h1 style={{ fontSize: 36 }}>New <i style={{ fontWeight: 300, color: 'var(--oxide)' }}>draft</i></h1>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--stone-light)', border: '1px solid var(--line)', padding: '4px 10px', borderRadius: 999 }}>Web → Desktop approval</span>
      </div>
      <p style={{ fontFamily: 'var(--font-editorial)', fontStyle: 'italic', color: 'var(--stone)', marginBottom: 20 }}>Compose a draft here — it becomes a real invoice only after you approve it in the desktop app.</p>

      {error && <div className="err-box" style={{ marginBottom: 16 }}>{error}</div>}

      {done ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', maxWidth: 620, margin: '8px auto 0' }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--sage-soft)', border: '1px solid #d6dfc2', display: 'grid', placeItems: 'center', margin: '0 auto 16px', color: 'var(--sage)' }}><CheckCircle2 size={24} /></div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, marginBottom: 8 }}>Draft pressed for {done.customer}</h2>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--stone)', marginBottom: 4 }}>
            Reference <b style={{ color: 'var(--ink)' }}>{done.id ? done.id.slice(0, 8).toUpperCase() : 'PENDING'}</b> · {done.type} · {fmtMoney(done.total)}
          </p>
          <p style={{ fontFamily: 'var(--font-editorial)', fontStyle: 'italic', color: 'var(--stone)', lineHeight: 1.6, marginTop: 10 }}>
            What happens next: open the desktop atelier, find this draft in the Pending tray, and approve it. Approval writes the real invoice with its number and syncs it back here.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 22, flexWrap: 'wrap' }}>
            <Link to="/app/pending" className="btn btn-primary btn-sm" style={{ borderRadius: 12 }}><Inbox size={14} /> View in Pending tray</Link>
            <button type="button" className="btn btn-ghost btn-sm" style={{ borderRadius: 12 }} onClick={resetForm}><FilePlus2 size={14} /> Compose another</button>
            <Link to="/app/invoices" className="btn btn-ghost btn-sm" style={{ borderRadius: 12 }}><FileText size={14} /> Back to invoices</Link>
          </div>
        </div>
      ) : companyError ? (
        <div className="card" style={{ padding: 28, borderStyle: 'dashed', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 8 }}>Folio not yet pressed</div>
          <p style={{ fontFamily: 'var(--font-editorial)', fontStyle: 'italic', color: 'var(--stone)' }}>{companyError} Sync the desktop first.</p>
          <Link to="/app" className="btn btn-ghost btn-sm" style={{ marginTop: 14, borderRadius: 999 }}><ArrowLeft size={14} /> Dashboard</Link>
        </div>
      ) : !company ? <Loading /> : (
        <form onSubmit={submit} noValidate>
          <OfflineBar />
          <div className="card" style={{ padding: 28, marginBottom: 16 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--line)' }}>Customer <span style={{ fontWeight: 300, fontStyle: 'italic', color: 'var(--stone)' }}>— bill to</span></h3>
            <div className="grid2">
              <div className="field">
                <label>Customer name *</label>
                <input className={`input ${fieldErrors.customer_name ? 'invalid' : ''}`} value={customer.name} onChange={setCust('name')} placeholder="Sri Balaji Traders" aria-invalid={!!fieldErrors.customer_name} />
                <FieldError error={fieldErrors.customer_name} hint="Who is being billed? A name is required." />
              </div>
              <div className="field">
                <label>GSTIN</label>
                <input className={`input ${fieldErrors.customer_gstin ? 'invalid' : ''}`} value={customer.gstin} onChange={setCust('gstin')} placeholder="33AAABC1234F1Z5" aria-invalid={!!fieldErrors.customer_gstin} />
                <FieldError error={fieldErrors.customer_gstin} hint="Optional. 15 characters if the buyer is registered." />
              </div>
              <div className="field" style={{ gridColumn: '1 / -1' }}><label>Address</label><input className="input" value={customer.address} onChange={setCust('address')} placeholder="Street, area" /></div>
              <div className="field"><label>City</label><input className="input" value={customer.city} onChange={setCust('city')} /></div>
              <div className="field"><label>State</label><input className="input" value={customer.state} onChange={setCust('state')} /></div>
              <div className="field"><label>State code</label><input className="input" value={customer.state_code} onChange={setCust('state_code')} placeholder="33" /></div>
              <div className="field"><label>Pincode</label><input className="input" value={customer.pincode} onChange={setCust('pincode')} /></div>
              <div className="field"><label>Phone</label><input className="input" value={customer.phone} onChange={setCust('phone')} placeholder="10-digit mobile" /></div>
              <div className="field">
                <label>Email</label>
                <input className={`input ${fieldErrors.customer_email ? 'invalid' : ''}`} value={customer.email} onChange={setCust('email')} placeholder="buyer@example.com" aria-invalid={!!fieldErrors.customer_email} />
                <FieldError error={fieldErrors.customer_email} hint="Optional. Used only if you share this draft." />
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 28, marginBottom: 16 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--line)' }}>Invoice <span style={{ fontWeight: 300, fontStyle: 'italic', color: 'var(--stone)' }}>— details</span></h3>
            <div className="grid2">
              <div className="field">
                <label>Invoice date *</label>
                <input className={`input ${fieldErrors.invoice_date ? 'invalid' : ''}`} type="date" value={invoice.invoice_date} onChange={setInv('invoice_date')} aria-invalid={!!fieldErrors.invoice_date} />
                <FieldError error={fieldErrors.invoice_date} />
              </div>
              <div className="field"><label>Due date</label><input className="input" type="date" value={invoice.due_date} onChange={setInv('due_date')} /></div>
              <div className="field">
                <label>Place of supply *</label>
                <input className={`input ${fieldErrors.place_of_supply ? 'invalid' : ''}`} value={invoice.place_of_supply} onChange={setInv('place_of_supply')} placeholder="33" aria-invalid={!!fieldErrors.place_of_supply} />
                <FieldError error={fieldErrors.place_of_supply} hint="2-digit state code. Decides CGST+SGST vs IGST." />
              </div>
              <div className="field"><label>Supply type</label><select className="input" value={invoice.supply_type} onChange={setInv('supply_type')}><option value="B2B">B2B</option><option value="B2C">B2C</option></select></div>
              <div className="field"><label>Type</label><select className="input" value={invoice.type} onChange={setInv('type')}><option value="Sales">Sales</option><option value="Purchase">Purchase</option></select></div>
              <div className="field"><label>Notes</label><textarea className="input" rows={2} value={invoice.notes} onChange={setInv('notes')} placeholder="Visible on invoice" /></div>
              <div className="field" style={{ gridColumn: '1 / -1' }}><label>Terms</label><textarea className="input" rows={2} value={invoice.terms} onChange={setInv('terms')} placeholder="Payment terms" /></div>
            </div>
          </div>

          <div className="card" style={{ padding: 28, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--line)' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>Items <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--stone-light)', fontWeight: 400 }}>— {items.length} lines</span></h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={addItem} style={{ borderRadius: 999 }}><Plus size={14} /> Add line</button>
            </div>
            {items.map((it, idx) => {
              const rErr = (fieldErrors.items && fieldErrors.items[idx]) || {};
              return (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 70px 1fr 70px 80px 70px 36px', gap: 8, marginBottom: 10, padding: 12, background: idx % 2 === 0 ? '#fff' : 'var(--paper-2)', border: `1px solid ${Object.keys(rErr).length ? 'var(--oxide-dark)' : 'var(--line-faint)'}`, borderRadius: 10 }}>
                <div className="field" style={{ marginBottom: 0 }}><label>Description</label><input className={`input ${rErr.description ? 'invalid' : ''}`} value={it.description} onChange={setItem(idx, 'description')} placeholder="Item" aria-invalid={!!rErr.description} />{rErr.description && <FieldError error={rErr.description} />}</div>
                <div className="field" style={{ marginBottom: 0 }}><label>HSN</label><input className="input" value={it.hsn_code} onChange={setItem(idx, 'hsn_code')} /></div>
                <div className="field" style={{ marginBottom: 0 }}><label>Qty</label><input className={`input ${rErr.quantity ? 'invalid' : ''}`} type="number" min="0" step="any" value={it.quantity} onChange={setItem(idx, 'quantity')} aria-invalid={!!rErr.quantity} />{rErr.quantity && <FieldError error={rErr.quantity} />}</div>
                <div className="field" style={{ marginBottom: 0 }}><label>Rate</label><input className={`input ${rErr.rate ? 'invalid' : ''}`} type="number" min="0" step="any" value={it.rate} onChange={setItem(idx, 'rate')} aria-invalid={!!rErr.rate} />{rErr.rate && <FieldError error={rErr.rate} />}</div>
                <div className="field" style={{ marginBottom: 0 }}><label>Disc %</label><input className="input" type="number" min="0" step="any" value={it.discount_percent} onChange={setItem(idx, 'discount_percent')} /></div>
                <div className="field" style={{ marginBottom: 0 }}><label>GST %</label><select className="input" value={it.gst_rate} onChange={setItem(idx, 'gst_rate')}>{[0, 0.25, 3, 5, 12, 18, 28].map((g)=><option key={g} value={g}>{g}%</option>)}</select></div>
                <div className="field" style={{ marginBottom: 0 }}><label>Cess %</label><input className="input" type="number" min="0" step="any" value={it.cess} onChange={setItem(idx, 'cess')} /></div>
                <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 0 }}><button type="button" className="icon-btn" onClick={()=>removeItem(idx)} title="Remove"><Trash2 size={14} /></button></div>
              </div>
              );
            })}
            <div style={{ marginTop: 16, textAlign: 'right', background: 'var(--ink)', color: '#fdfcf8', padding: 16, borderRadius: 12, display: 'inline-block', float: 'right', minWidth: 240 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.7 }}>Grand total</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, marginTop: 4 }}>{fmtMoney(totals.grand)}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, opacity: 0.7, marginTop: 4 }}>Sub {fmtMoney(totals.sub_total)} · Tax {fmtMoney(totals.cgst+totals.sgst+totals.igst)}</div>
            </div>
            <div style={{ clear: 'both' }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Link to="/app/invoices" className="btn btn-ghost" style={{ borderRadius: 12 }}>Cancel</Link>
            <button className="btn btn-primary" disabled={busy || !online} style={{ borderRadius: 12, padding: '12px 28px' }} title={!online ? 'You are offline. Reconnect to press this draft.' : ''}>
              {busy ? <span className="spinner" /> : !online ? <WifiOff size={16} /> : <FilePlus2 size={16} />}
              {busy ? 'Pressing…' : !online ? 'Offline — draft stays here' : 'Press draft'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
