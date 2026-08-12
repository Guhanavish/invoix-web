import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { api, fmtMoney, fmtDate, invoiceStatus } from '../api';
import { useAutoRefresh } from '../useAutoSync';
import { Badge, Empty, Loading } from '../components/ui';

export default function InvoiceDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    api.get(`/data/invoices/${id}`).then(setData).catch((e) => setError(e.message));
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
  const totalTax = (Number(inv.cgst_total) || 0) + (Number(inv.sgst_total) || 0) + (Number(inv.igst_total) || 0);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Link to="/app/invoices" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--muted)', fontSize: 14, fontWeight: 500 }}>
          <ArrowLeft size={15} /> Back to invoices
        </Link>
      </div>

      <div className="card detail-hero">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <h2>{inv.invoice_no}</h2>
            <Badge status={st.key}>{st.label}</Badge>
            <Badge status={inv.type === 'Purchase' ? 'purchase' : 'sales'}>{inv.type}</Badge>
            <Badge status="neutral">{inv.supply_type || 'B2B'}</Badge>
          </div>
          <div className="label" style={{ marginTop: 8 }}>Issued {fmtDate(inv.invoice_date)} · {inv.customer_name}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="label">Grand total</div>
          <div className="money" style={{ fontSize: 30, fontWeight: 600 }}>{fmtMoney(inv.grand_total)}</div>
        </div>
      </div>

      <div className="detail-grid">
        <div className="card" style={{ padding: 22 }}>
          <div className="bento-head"><h3>Line items</h3><span className="label">{inv.items?.length || 0} items</span></div>
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
                    <td style={{ fontWeight: 500 }}>{it.description}</td>
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
            <span style={{ fontWeight: 600 }}>Grand total</span>
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
            <div className="dl"><span className="k">Total tax</span><span className="v">{fmtMoney(totalTax)}</span></div>
            <div className="dl"><span className="k">Amount paid</span><span className="v" style={{ color: 'var(--success)' }}>{fmtMoney(inv.paid_amount)}</span></div>
            <div className="dl"><span className="k">Balance</span><span className="v" style={{ color: Number(inv.paid_amount) >= Number(inv.grand_total) ? 'var(--success)' : 'var(--danger)' }}>
              {fmtMoney(Math.max(0, Number(inv.grand_total) - Number(inv.paid_amount)))}
            </span></div>
            {inv.due_date && <div className="dl"><span className="k">Due date</span><span className="v">{fmtDate(inv.due_date)}</span></div>}
          </div>

          <div className="card" style={{ padding: 22 }}>
            <div className="bento-head"><h3>Customer</h3></div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{inv.customer_name}</div>
            <div style={{ color: 'var(--muted)', fontSize: 13.5, marginTop: 6 }}>
              {inv.customer_address}{inv.customer_city ? `, ${inv.customer_city}` : ''}<br />
              {inv.customer_state}{inv.customer_pincode ? ` — ${inv.customer_pincode}` : ''}
            </div>
            <div className="dl" style={{ marginTop: 12 }}><span className="k">GSTIN</span><span className="v">{inv.customer_gstin || '—'}</span></div>
            <div className="dl"><span className="k">Place of supply</span><span className="v">{inv.place_of_supply || '—'}</span></div>
            <div className="dl"><span className="k">Phone</span><span className="v">{inv.customer_phone || '—'}</span></div>
            <div className="dl"><span className="k">Email</span><span className="v">{inv.customer_email || '—'}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
