import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { IndianRupee, FileText, Users, Package, ArrowUpRight, CloudUpload, BarChart3 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api, fmtMoney, fmtDate, fmtDateTime, invoiceStatus } from '../api';
import { useAutoRefresh } from '../useAutoSync';
import { StatCard, Badge, Empty, Loading, PageHead } from '../components/ui';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [sync, setSync] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    api.get('/data/dashboard').then(setData).catch((e) => setError(e.message));
    api.get('/sync/status').then(setSync).catch(() => {});
  };

  useEffect(() => { load(); }, []);
  useAutoRefresh(load);

  if (error) {
    return (
      <div style={{ maxWidth: 640, margin: '40px auto' }}>
        <div className="card" style={{ padding: 40, textAlign: 'center', borderStyle: 'dashed' }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--paper-2)', border: '1px solid var(--line)', display: 'grid', placeItems: 'center', margin: '0 auto 16px', color: 'var(--stone)' }}><CloudUpload size={22} /></div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 8 }}>Your folio is empty</h3>
          <p style={{ fontFamily: 'var(--font-editorial)', fontStyle: 'italic', color: 'var(--stone)', lineHeight: 1.6 }}>Open the Invoix desktop atelier → Settings → Web Sync, enter your user id, and press Sync. Your figures will be set here.</p>
          <Link to="/app/invoices/new" className="btn btn-primary" style={{ marginTop: 18, borderRadius: 999 }}>Create a draft on the web</Link>
        </div>
      </div>
    );
  }
  if (!data) return <Loading />;

  const { company, totalRevenue, totalInvoices, totalCustomers, totalProducts, totalDue, totalPending, monthlyRevenue, recentInvoices, monthlyData, dueInvoices } = data;
  const chartData = (monthlyData || []).map((m) => ({ label: m.month.slice(5) + '/' + m.month.slice(2, 4), revenue: Number(m.total) || 0 }));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap', marginBottom: 6 }}>
        <h1 style={{ fontSize: 42, letterSpacing: '-0.04em' }}>{company?.name || 'Atelier'}</h1>
        <span style={{ fontFamily: 'var(--font-editorial)', fontStyle: 'italic', color: 'var(--stone)', fontSize: 16 }}>— live folio</span>
      </div>
      <p style={{ fontFamily: 'var(--font-editorial)', fontStyle: 'italic', color: 'var(--stone)', marginBottom: 24, fontSize: 15 }}>
        {sync?.lastSync ? `Last pressed ${fmtDateTime(sync.lastSync)} · ${sync?.tables?.length || 0} tables` : 'Awaiting first press from the desktop.'}
      </p>

      <div className="stat-grid">
        <StatCard tone="blue" icon={<IndianRupee size={16} />} label="Total revenue" value={fmtMoney(totalRevenue)} sub={`${fmtMoney(monthlyRevenue)} this month`} />
        <StatCard tone="green" icon={<FileText size={16} />} label="Invoices" value={String(totalInvoices)} sub={`${dueInvoices} overdue · ${fmtMoney(totalDue)} due`} />
        <StatCard tone="amber" icon={<Users size={16} />} label="Customers" value={String(totalCustomers)} sub="In the book" />
        <StatCard tone="red" icon={<Package size={16} />} label="Products" value={String(totalProducts)} sub={`${fmtMoney(totalPending)} receivable`} />
      </div>

      <div className="bento">
        <div className="card bento-card two">
          <div className="bento-head">
            <h3>Revenue <i style={{ fontWeight: 300, fontStyle: 'italic', color: 'var(--stone)' }}>press</i></h3>
            <span className="label">12 months · INR</span>
          </div>
          {chartData.length === 0 ? (
            <Empty icon={<BarChart3 size={20} />} title="No invoices yet" sub="Revenue will be set here once invoices are pressed." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c45a3c" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#c45a3c" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e0d5" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fontFamily: 'JetBrains Mono', fill: '#9a9590' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fontFamily: 'JetBrains Mono', fill: '#9a9590' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`} width={48} />
                <Tooltip formatter={(v) => [fmtMoney(v), 'Revenue']} contentStyle={{ borderRadius: 12, border: '1px solid #e8e0d5', fontFamily: 'JetBrains Mono', fontSize: 12, background: '#fdfcf8' }} />
                <Area type="monotone" dataKey="revenue" stroke="#c45a3c" strokeWidth={2.2} fill="url(#rev2)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card bento-card" style={{ background: 'var(--ink)', color: '#fdfcf8', borderColor: '#1a1a18' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <h3 style={{ color: '#fdfcf8', fontSize: 17 }}>Sync <i style={{ fontWeight: 300, color: '#c4a99a' }}>status</i></h3>
            <span className="badge" style={{ background: sync?.synced ? '#7a8450' : '#3a3a38', color: '#fff', borderColor: 'transparent' }}>{sync?.synced ? 'LIVE' : 'EMPTY'}</span>
          </div>
          <div style={{ display: 'grid', gap: 12, fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px dashed rgba(253,252,248,0.12)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9a9590' }}>Desktop → Web</span>
              <span style={{ fontWeight: 600, color: sync?.synced ? '#a8d5a2' : '#c4a99a' }}>{sync?.synced ? 'Connected' : 'Not connected'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px dashed rgba(253,252,248,0.12)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9a9590' }}>Last press</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{fmtDateTime(sync?.lastSync)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px dashed rgba(253,252,248,0.12)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9a9590' }}>Tables</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textAlign: 'right', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(sync?.tables || []).join(', ') || '—'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9a9590' }}>Records</span>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>{sync?.counts ? Object.values(sync.counts).reduce((a, b) => a + b, 0) : 0}</span>
            </div>
            <Link to="/app/invoices" className="btn btn-ghost-light btn-sm" style={{ marginTop: 8, borderRadius: 999 }}>
              Open folio <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>

        <div className="card bento-card full">
          <div className="bento-head">
            <h3>Recent <i style={{ fontWeight: 300, color: 'var(--stone)' }}>invoices</i></h3>
            <Link to="/app/invoices" className="label" style={{ color: 'var(--ink)', borderBottom: '1px solid var(--line-strong)', paddingBottom: 1 }}>View all →</Link>
          </div>
          {recentInvoices.length === 0 ? (
            <Empty icon={<FileText size={20} />} title="No invoices" sub="Invoices pressed in the app will appear here, set in type." />
          ) : (
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Type</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                    <th style={{ textAlign: 'right' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentInvoices.map((inv) => {
                    const st = invoiceStatus(inv);
                    return (
                      <tr key={inv.id}>
                        <td><Link to={`/app/invoices/${inv.id}`} className="mono" style={{ color: 'var(--ink)', fontWeight: 700, borderBottom: '1px solid var(--line-strong)', paddingBottom: 1 }}>{inv.invoice_no}</Link></td>
                        <td className="mono" style={{ fontSize: 12 }}>{fmtDate(inv.invoice_date)}</td>
                        <td style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>{inv.customer_name}</td>
                        <td><Badge status={inv.type === 'Purchase' ? 'purchase' : 'sales'}>{inv.type}</Badge></td>
                        <td className="money" style={{ textAlign: 'right', fontWeight: 600 }}>{fmtMoney(inv.grand_total)}</td>
                        <td style={{ textAlign: 'right' }}><Badge status={st.key}>{st.label}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
