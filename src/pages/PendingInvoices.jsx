import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Inbox, RefreshCw, FilePlus2, Trash2, Clock, FileText } from 'lucide-react';
import { api, fmtMoney, fmtDateTime } from '../api';
import { useAutoRefresh } from '../useAutoSync';
import { Badge, Empty, Loading } from '../components/ui';

export default function PendingInvoices() {
  const [invoices, setInvoices] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    api.getPendingInvoices().then((res) => setInvoices(res.invoices)).catch((e) => { setError(e.message); setInvoices([]); });
  };

  useEffect(() => { load(); }, []);
  useAutoRefresh(load);

  const cancel = async (id) => {
    if (!window.confirm('Delete this draft? It has not been pressed in the desktop atelier.')) return;
    try { await api.deletePendingInvoice(id); load(); } catch (e) { setError(e.message); }
  };

  const totalOf = (p) =>
    (p.items || []).reduce((s, it) => {
      const taxable = Number(it.quantity) * Number(it.rate) * (1 - (Number(it.discount_percent) || 0) / 100);
      const tax = taxable * (Number(it.gst_rate) || 0) / 100;
      return s + taxable + tax;
    }, 0);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
        <h1 style={{ fontSize: 36 }}>Pending</h1>
        <span style={{ fontFamily: 'var(--font-editorial)', fontStyle: 'italic', color: 'var(--stone)', fontSize: 14 }}>Drafts awaiting the press.</span>
      </div>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--stone-light)', marginBottom: 18 }}>Web drafts — become real only after desktop approval.</p>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <button className="btn btn-ghost btn-sm" onClick={load} style={{ borderRadius: 999 }}><RefreshCw size={13} /> Refresh</button>
        <Link to="/app/invoices/new" className="btn btn-primary btn-sm" style={{ borderRadius: 999 }}><FilePlus2 size={14} /> New draft</Link>
      </div>

      {error && <div className="err-box" style={{ marginBottom: 16 }}>{error}</div>}

      {!invoices ? <Loading /> : invoices.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center', borderStyle: 'dashed' }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--paper-2)', border: '1px solid var(--line)', display: 'grid', placeItems: 'center', margin: '0 auto 14px', color: 'var(--stone-light)' }}><Inbox size={22} /></div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>No drafts in the tray</h3>
          <p style={{ fontFamily: 'var(--font-editorial)', fontStyle: 'italic', color: 'var(--stone)', marginTop: 6 }}>Create a draft on the web — it will sit here until you approve it in the desktop app's Pending tray.</p>
          <Link to="/app/invoices/new" className="btn btn-oxide btn-sm" style={{ marginTop: 16, borderRadius: 999 }}>Compose draft</Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {invoices.map((p) => (
            <div key={p.id} className="card" style={{ padding: 22, display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>{p.customer.name}</span>
                  {p.customer.gstin && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', background: 'var(--paper-2)', border: '1px solid var(--line)', padding: '3px 8px', borderRadius: 999 }}>{p.customer.gstin}</span>}
                  <Badge status={p.type === 'Purchase' ? 'purchase' : 'sales'}>{p.type}</Badge>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--stone-light)', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Clock size={10} /> {fmtDateTime(p.createdAt)}</span>
                </div>
                <div style={{ display: 'flex', gap: 16, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--stone)', flexWrap: 'wrap' }}>
                  <span>Date: <b style={{ color: 'var(--ink)' }}>{p.invoice_date || '—'}</b></span>
                  <span>Items: <b style={{ color: 'var(--ink)' }}>{p.items.length}</b></span>
                  <span>Supply: <b style={{ color: 'var(--ink)' }}>{p.supply_type}</b></span>
                </div>
                <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {p.items.slice(0,3).map((it, i) => (
                    <span key={i} style={{ fontSize: 12, background: 'var(--paper-2)', border: '1px solid var(--line)', padding: '4px 10px', borderRadius: 999, fontFamily: 'var(--font-body)' }}>{it.description} · {it.quantity}×{it.rate}</span>
                  ))}
                  {p.items.length > 3 && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--stone-light)', alignSelf: 'center' }}>+{p.items.length - 3} more</span>}
                </div>
              </div>
              <div style={{ textAlign: 'right', minWidth: 140 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--stone-light)' }}>Amount</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, marginTop: 2 }}>{fmtMoney(totalOf(p))}</div>
                <div style={{ marginTop: 10, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <Badge status="neutral">Awaiting press</Badge>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => cancel(p.id)} style={{ marginTop: 10, borderRadius: 999, fontSize: 12, padding: '6px 12px' }}><Trash2 size={12} /> Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
