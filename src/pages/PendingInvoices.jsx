import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Inbox, RefreshCw, FilePlus2, Trash2 } from 'lucide-react';
import { api, fmtMoney, fmtDateTime } from '../api';
import { useAutoRefresh } from '../useAutoSync';
import { Badge, Empty, Loading, PageHead } from '../components/ui';

export default function PendingInvoices() {
  const [invoices, setInvoices] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    api.getPendingInvoices().then((res) => setInvoices(res.invoices)).catch((e) => { setError(e.message); setInvoices([]); });
  };

  useEffect(() => {
    load();
  }, []);

  useAutoRefresh(load);

  const cancel = async (id) => {
    if (!window.confirm('Delete this draft? It has not been approved in the desktop app.')) return;
    try {
      await api.deletePendingInvoice(id);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const totalOf = (p) =>
    (p.items || []).reduce((s, it) => {
      const taxable = Number(it.quantity) * Number(it.rate) * (1 - (Number(it.discount_percent) || 0) / 100);
      const tax = taxable * (Number(it.gst_rate) || 0) / 100;
      return s + taxable + tax;
    }, 0);

  return (
    <div>
      <PageHead title="Pending Invoices" sub="Drafts created on the web. They become real invoices only after you verify and approve them in the desktop app.">
        <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14} /> Refresh</button>
        <Link to="/app/invoices/new" className="btn btn-primary btn-sm"><FilePlus2 size={14} /> New draft</Link>
      </PageHead>

      {error && <div className="err-box" style={{ marginBottom: 16 }}>{error}</div>}

      {!invoices ? (
        <Loading />
      ) : invoices.length === 0 ? (
        <Empty icon={<Inbox size={28} />} title="No pending invoices" sub="Create a draft and it will show up here until approved in the desktop app." />
      ) : (
        <div className="card table-card">
          <table className="table">
            <thead>
              <tr>
                <th>Created</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Type</th>
                <th>Items</th>
                <th>Amount</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((p) => (
                <tr key={p.id}>
                  <td style={{ color: 'var(--muted)', fontSize: 13 }}>{fmtDateTime(p.createdAt)}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{p.customer.name}</div>
                    {p.customer.gstin && <div style={{ color: 'var(--muted)', fontSize: 12 }}>{p.customer.gstin}</div>}
                  </td>
                  <td>{p.invoice_date || '—'}</td>
                  <td><Badge status={p.type === 'Purchase' ? 'purchase' : 'sales'}>{p.type}</Badge></td>
                  <td>{p.items.length}</td>
                  <td style={{ fontWeight: 600 }}>{fmtMoney(totalOf(p))}</td>
                  <td><Badge status="neutral">Awaiting approval</Badge></td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="icon-btn" title="Delete draft" onClick={() => cancel(p.id)}><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
