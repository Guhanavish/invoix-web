import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, Printer, Eye } from 'lucide-react';
import { api, fmtMoney, fmtDate, invoiceStatus } from '../api';
import { useAutoRefresh } from '../useAutoSync';
import { Badge, Empty, Loading } from '../components/ui';
import InvoicePaper from '../components/InvoicePaper';

export default function InvoiceDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [company, setCompany] = useState(null);
  const [error, setError] = useState('');
  const [view, setView] = useState('paper'); // 'paper' | 'details'

  const load = () => {
    api.get(`/data/invoices/${id}`).then(setData).catch((e) => setError(e.message));
    api.get('/data/company').then((r) => setCompany(r.companies?.[0] || r.active || null)).catch(() => {});
  };

  useEffect(() => {
    setData(null);
    load();
  }, [id]);

  useAutoRefresh(load);

  if (error) return <Empty icon={<FileText size={22} />} title="Invoice not found" sub={error} />;
  if (!data) return <Loading />;

  const { invoice: inv } = data;
  const st = invoiceStatus(inv);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <Link to="/app/invoices" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--stone)', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>
          <ArrowLeft size={13} /> Back to invoices
        </Link>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={`btn btn-sm ${view === 'paper' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setView('paper')} style={{ borderRadius: 999 }}>
            <Eye size={13} /> Paper view
          </button>
          <button className={`btn btn-sm ${view === 'details' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setView('details')} style={{ borderRadius: 999 }}>
            <FileText size={13} /> Details
          </button>
        </div>
      </div>

      <div className="card detail-hero" style={{ marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h2>{inv.invoice_no}</h2>
            <Badge status={st.key}>{st.label}</Badge>
            <Badge status={inv.type === 'Purchase' ? 'purchase' : 'sales'}>{inv.type}</Badge>
            <Badge status="neutral">{inv.supply_type || 'B2B'}</Badge>
          </div>
          <div className="label" style={{ marginTop: 8, fontSize: 11 }}>Issued {fmtDate(inv.invoice_date)} · {inv.customer_name} · {inv.place_of_supply || ''}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="label">Grand total</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em' }}>{fmtMoney(inv.grand_total)}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--stone)' }}>{inv.items?.length || 0} line items · Qty total</div>
        </div>
      </div>

      {view === 'paper' ? (
        <InvoicePaper invoice={inv} company={company} />
      ) : (
        <div className="detail-grid">
          <div className="card" style={{ padding: 24 }}>
            <div className="bento-head"><h3 style={{ fontFamily: 'var(--font-display)' }}>Line items</h3><span className="label">{inv.items?.length || 0} items</span></div>
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>HSN</th>
                    <th style={{ textAlign: 'right' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Rate</th>
                    <th style={{ textAlign: 'right' }}>GST</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(inv.items || []).map((it) => (
                    <tr key={it.id}>
                      <td style={{ fontWeight: 600, fontFamily: 'var(--font-body)' }}>{it.description}</td>
                      <td className="mono">{it.hsn_code || '—'}</td>
                      <td className="money" style={{ textAlign: 'right' }}>{it.quantity} {it.unit}</td>
                      <td className="money" style={{ textAlign: 'right' }}>{fmtMoney(it.rate)}</td>
                      <td className="money" style={{ textAlign: 'right' }}>{Number(it.gst_rate) || 0}%</td>
                      <td className="money" style={{ textAlign: 'right' }}>{fmtMoney(it.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="summary-total">
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>Grand total</span>
              <span className="v">{fmtMoney(inv.grand_total)}</span>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 16 }}>
            <div className="card" style={{ padding: 22 }}>
              <div className="bento-head"><h3>Summary</h3></div>
              <div className="dl"><span className="k">Sub total</span><span className="v">{fmtMoney(inv.sub_total)}</span></div>
              <div className="dl"><span className="k">Discount</span><span className="v">{fmtMoney(inv.discount_total)}</span></div>
              <div className="dl"><span className="k">CGST</span><span className="v">{fmtMoney(inv.cgst_total)}</span></div>
              <div className="dl"><span className="k">SGST</span><span className="v">{fmtMoney(inv.sgst_total)}</span></div>
              <div className="dl"><span className="k">IGST</span><span className="v">{fmtMoney(inv.igst_total)}</span></div>
              <div className="dl"><span className="k">Total tax</span><span className="v">{fmtMoney((Number(inv.cgst_total)||0)+(Number(inv.sgst_total)||0)+(Number(inv.igst_total)||0))}</span></div>
              <div className="dl"><span className="k">Amount paid</span><span className="v" style={{ color: 'var(--sage)' }}>{fmtMoney(inv.paid_amount)}</span></div>
              <div className="dl"><span className="k">Balance</span><span className="v" style={{ color: Number(inv.paid_amount) >= Number(inv.grand_total) ? 'var(--sage)' : 'var(--oxide)' }}>{fmtMoney(Math.max(0, Number(inv.grand_total) - Number(inv.paid_amount)))}</span></div>
              {inv.due_date && <div className="dl"><span className="k">Due date</span><span className="v">{fmtDate(inv.due_date)}</span></div>}
            </div>

            <div className="card" style={{ padding: 22 }}>
              <div className="bento-head"><h3 style={{ fontFamily: 'var(--font-display)' }}>Customer</h3></div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16 }}>{inv.customer_name}</div>
              <div style={{ color: 'var(--stone)', marginTop: 6, lineHeight: 1.6, fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                {inv.customer_address}{inv.customer_city ? `, ${inv.customer_city}` : ''}<br />
                {inv.customer_state}{inv.customer_pincode ? ` — ${inv.customer_pincode}` : ''}
              </div>
              <div className="dl" style={{ marginTop: 14 }}><span className="k">GSTIN</span><span className="v">{inv.customer_gstin || '—'}</span></div>
              <div className="dl"><span className="k">Place of supply</span><span className="v">{inv.place_of_supply || '—'}</span></div>
              <div className="dl"><span className="k">Phone</span><span className="v">{inv.customer_phone || '—'}</span></div>
              <div className="dl"><span className="k">Email</span><span className="v">{inv.customer_email || '—'}</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
