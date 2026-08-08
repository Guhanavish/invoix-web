import React, { useEffect, useState } from 'react';
import { BarChart3, Download } from 'lucide-react';
import { api, fmtMoney, fmtDate } from '../api';
import { Empty, Loading, PageHead } from '../components/ui';

const MONTHS = Array.from({ length: 6 }, (_, i) => {
  const d = new Date();
  d.setMonth(d.getMonth() - i);
  return d.toISOString().slice(0, 7);
});

export default function Reports() {
  const [g1, setG1] = useState(null);
  const [g3, setG3] = useState(null);
  const [aging, setAging] = useState(null);
  const [month, setMonth] = useState(MONTHS[0]);
  const [error, setError] = useState('');

  const load = () => {
    const from = `${month}-01`;
    const to = new Date(new Date(from).setMonth(new Date(from).getMonth() + 1)).toISOString().slice(0, 10);
    Promise.all([
      api.get(`/data/reports/gstr1?from=${from}&to=${to}`),
      api.get('/data/reports/gstr3b?from=2000-01-01&to=2999-12-31'),
      api.get('/data/reports/aging'),
    ])
      .then(([a, b, c]) => {
        setG1(a);
        setG3(b);
        setAging(c);
      })
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    load();
  }, [month]);

  if (error) return <Empty icon={<BarChart3 size={22} />} title="No data to report" sub={error} />;
  if (!g1 || !g3 || !aging) return <Loading />;

  const exportG1 = () => {
    const rows = [
      ['Invoice No', 'Date', 'Customer', 'GSTIN', 'Supply', 'Taxable', 'CGST', 'SGST', 'IGST', 'Total'],
      ...g1.sales.map((s) => [s.invoice_no, s.invoice_date, s.customer_name, s.customer_gstin, s.supply_type, s.sub_total, s.cgst_total, s.sgst_total, s.igst_total, s.grand_total]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `gstr1-${month}.csv`;
    a.click();
  };

  return (
    <div>
      <PageHead title="GST reports" sub="GSTR-1, GSTR-3B and receivable aging — generated from synced invoice data.">
        <button className="btn btn-ghost btn-sm" onClick={exportG1} disabled={!g1.sales.length}>
          <Download size={14} /> Export GSTR-1 CSV
        </button>
      </PageHead>

      <div className="filter-bar">
        <select className="input" value={month} onChange={(e) => setMonth(e.target.value)}>
          {MONTHS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      <div className="bento">
        <div className="card bento-card">
          <div className="bento-head">
            <h3>GSTR-1 · {month}</h3>
            <span className="badge badge-sales">{g1.count} invoices</span>
          </div>
          <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            {[
              ['Taxable value', fmtMoney(g1.totalTaxable)],
              ['CGST', fmtMoney(g1.totalCgst)],
              ['SGST', fmtMoney(g1.totalSgst)],
              ['IGST', fmtMoney(g1.totalIgst)],
              ['Invoice value', fmtMoney(g1.totalInvoiceValue)],
              ['B2B / B2C', `${g1.b2b.length} / ${g1.b2c.length}`],
            ].map(([k, v]) => (
              <div key={k} className="dl" style={{ borderBottom: '1px dashed var(--line)' }}>
                <span className="k">{k}</span>
                <span className="v">{v}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card bento-card">
          <div className="bento-head">
            <h3>GSTR-3B · All time</h3>
            <span className="label">Net liability</span>
          </div>
          <div style={{ textAlign: 'center', padding: '10px 0 18px' }}>
            <div className="money" style={{ fontSize: 34, fontWeight: 700, color: g3.netTaxLiability > 0 ? 'var(--danger)' : 'var(--success)' }}>
              {fmtMoney(g3.netTaxLiability)}
            </div>
            <div className="label">{g3.netTaxLiability > 0 ? 'Payable' : 'Refundable / Nil'}</div>
          </div>
          <div className="dl"><span className="k">Outward taxable</span><span className="v">{fmtMoney(g3.sales.taxable)}</span></div>
          <div className="dl"><span className="k">Outward tax</span><span className="v">{fmtMoney(g3.sales.totalTax)}</span></div>
          <div className="dl"><span className="k">Inward taxable</span><span className="v">{fmtMoney(g3.purchases.taxable)}</span></div>
          <div className="dl"><span className="k">Inward tax (ITC)</span><span className="v">{fmtMoney(g3.purchases.totalTax)}</span></div>
        </div>

        <div className="card bento-card full">
          <div className="bento-head">
            <h3>Receivable aging</h3>
            <span className="badge badge-unpaid">₹{fmtMoney(aging.totalOutstanding)} outstanding</span>
          </div>
          <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 16 }}>
            {Object.entries(aging.buckets).map(([bucket, list]) => (
              <div className="card" key={bucket} style={{ padding: 14, textAlign: 'center', background: 'var(--bg)' }}>
                <div className="label">{bucket} days</div>
                <div className="money" style={{ fontSize: 20, fontWeight: 600, marginTop: 6 }}>
                  {fmtMoney(list.reduce((s, i) => s + Number(i.outstanding || 0), 0))}
                </div>
                <div style={{ color: 'var(--muted)', fontSize: 12 }}>{list.length} invoices</div>
              </div>
            ))}
          </div>
          {aging.overdue.length === 0 ? (
            <p style={{ color: 'var(--muted)' }}>No overdue receivables. All clear.</p>
          ) : (
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Customer</th>
                    <th>Due date</th>
                    <th style={{ textAlign: 'right' }}>Days overdue</th>
                    <th style={{ textAlign: 'right' }}>Outstanding</th>
                  </tr>
                </thead>
                <tbody>
                  {aging.overdue.map((i) => (
                    <tr key={i.id}>
                      <td className="mono" style={{ fontWeight: 600 }}>{i.invoice_no}</td>
                      <td>{i.customer_name}</td>
                      <td className="mono">{fmtDate(i.due_date)}</td>
                      <td className="money" style={{ textAlign: 'right', color: 'var(--danger)' }}>{i.days_overdue}d</td>
                      <td className="money" style={{ textAlign: 'right' }}>{fmtMoney(i.outstanding)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
