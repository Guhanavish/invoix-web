import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Search, Download, ArrowUpRight } from 'lucide-react';
import { api, fmtMoney, fmtDate, invoiceStatus } from '../api';
import { useAutoRefresh } from '../useAutoSync';
import { Badge, Empty, Loading, PageHead } from '../components/ui';

export default function Invoices() {
  const [invoices, setInvoices] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');

  const load = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (type) params.set('type', type);
    if (status) params.set('overdue', 'yes');
    api.get(`/data/invoices?${params.toString()}`).then((res) => { setInvoices(res.invoices); setError(''); }).catch((e) => { setInvoices([]); setError(e.message); });
  };

  useEffect(() => { load(); }, []);
  useAutoRefresh(load);
  useEffect(() => { const t = setTimeout(load, 350); return () => clearTimeout(t); }, [search, type, status]);

  const exportCsv = () => {
    if (!invoices) return;
    const rows = [['Invoice No','Date','Customer','Type','Sub Total','CGST','SGST','IGST','Grand Total','Paid','Status'], ...invoices.map((i) => { const st=invoiceStatus(i); return [i.invoice_no,i.invoice_date,i.customer_name,i.type,i.sub_total,i.cgst_total,i.sgst_total,i.igst_total,i.grand_total,i.paid_amount,st.label]; })];
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `invoices-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
        <h1 style={{ fontSize: 36 }}>Invoices</h1>
        <span style={{ fontFamily: 'var(--font-editorial)', fontStyle: 'italic', color: 'var(--stone)', fontSize: 14 }}>{invoices ? `${invoices.length} folios` : ''}</span>
      </div>
      <p style={{ fontFamily: 'var(--font-editorial)', fontStyle: 'italic', color: 'var(--stone)', marginBottom: 20 }}>Every invoice pressed in the desktop atelier — sales and purchases, live.</p>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div className="filter-bar" style={{ marginBottom: 0 }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: 13, color: 'var(--stone-light)' }} />
            <input className="input" style={{ paddingLeft: 36, minWidth: 260, borderRadius: 999 }} placeholder="Search invoice or customer…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="input" style={{ borderRadius: 999, minWidth: 140 }} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All types</option><option value="Sales">Sales</option><option value="Purchase">Purchase</option>
          </select>
          <select className="input" style={{ borderRadius: 999, minWidth: 140 }} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option><option value="yes">Overdue</option>
          </select>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={exportCsv} disabled={!invoices?.length} style={{ borderRadius: 999 }}>
          <Download size={14} /> Export CSV
        </button>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {error ? <Empty icon={<FileText size={22} />} title="Couldn't load invoices" sub={error} /> : invoices === null ? <Loading /> : invoices.length === 0 ? <Empty icon={<FileText size={22} />} title="No folios found" sub="Try another search, or press invoices in the desktop atelier." /> : (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Supply</th>
                  <th style={{ textAlign: 'right' }}>Sub total</th>
                  <th style={{ textAlign: 'right' }}>Grand total</th>
                  <th style={{ textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const st = invoiceStatus(inv);
                  return (
                    <tr key={inv.id}>
                      <td><Link to={`/app/invoices/${inv.id}`} style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--ink)', borderBottom: '1.5px solid var(--ink)', paddingBottom: 1 }}>{inv.invoice_no}</Link></td>
                      <td className="mono" style={{ fontSize: 12 }}>{fmtDate(inv.invoice_date)}</td>
                      <td style={{ fontWeight: 600, fontFamily: 'var(--font-body)' }}>{inv.customer_name}</td>
                      <td><Badge status={inv.type === 'Purchase' ? 'purchase' : 'sales'}>{inv.type}</Badge></td>
                      <td className="mono" style={{ fontSize: 11 }}>{inv.supply_type || '—'}</td>
                      <td className="money" style={{ textAlign: 'right' }}>{fmtMoney(inv.sub_total)}</td>
                      <td className="money" style={{ textAlign: 'right', fontWeight: 700 }}>{fmtMoney(inv.grand_total)}</td>
                      <td style={{ textAlign: 'right' }}><Badge status={st.key}>{st.label}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div style={{ marginTop: 12, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--stone-light)', display: 'flex', gap: 16 }}>
        <span>{invoices?.length || 0} invoices</span><span>·</span><span>Press any invoice to view its paper</span>
      </div>
    </div>
  );
}
