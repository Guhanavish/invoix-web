import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  IndianRupee, FileText, Users, Package, ArrowUpRight,
  CloudUpload, BarChart3,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { api, fmtMoney, fmtDate, fmtDateTime, invoiceStatus } from '../api';
import { StatCard, Badge, Empty, Loading, PageHead } from '../components/ui';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [sync, setSync] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/data/dashboard').then(setData).catch((e) => setError(e.message));
    api.get('/sync/status').then(setSync).catch(() => {});
  }, []);

  if (error) {
    return (
      <Empty
        icon={<CloudUpload size={24} />}
        title="No business data yet"
        sub="Open the Invoix desktop app, go to Settings → Web Sync, enter this user id and sync. Your dashboard will appear here."
      />
    );
  }
  if (!data) return <Loading />;

  const { company, totalRevenue, totalInvoices, totalCustomers, totalProducts, totalDue, totalPending, monthlyRevenue, recentInvoices, monthlyData, dueInvoices } = data;

  const chartData = (monthlyData || []).map((m) => ({
    name: m.month,
    label: m.month.slice(5) + '/' + m.month.slice(2, 4),
    revenue: Number(m.total) || 0,
  }));

  return (
    <div>
      <PageHead
        title={company?.name || 'Dashboard'}
        sub={`Live view of your Invoix desktop data${sync?.lastSync ? ` · last synced ${fmtDateTime(sync.lastSync)}` : ''}`}
      />

      <div className="stat-grid">
        <StatCard
          tone="blue"
          icon={<IndianRupee size={17} />}
          label="Total Revenue"
          value={fmtMoney(totalRevenue)}
          sub={`₹${fmtMoney(monthlyRevenue)} this month`}
        />
        <StatCard
          tone="green"
          icon={<FileText size={17} />}
          label="Invoices"
          value={totalInvoices}
          sub={`${dueInvoices} overdue · ₹${fmtMoney(totalDue)} due`}
        />
        <StatCard
          tone="amber"
          icon={<Users size={17} />}
          label="Customers"
          value={totalCustomers}
          sub="In your customer book"
        />
        <StatCard
          tone="red"
          icon={<Package size={17} />}
          label="Products"
          value={totalProducts}
          sub={`₹${fmtMoney(totalPending)} outstanding receivables`}
        />
      </div>

      <div className="bento">
        <div className="card bento-card two">
          <div className="bento-head">
            <h3>Revenue trend</h3>
            <span className="label">Last 12 months · INR</span>
          </div>
          {chartData.length === 0 ? (
            <Empty icon={<BarChart3 size={22} />} title="No invoices yet" sub="Revenue appears here once you create invoices in the app." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1d4ed8" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e7ec" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fontFamily: 'JetBrains Mono', fill: '#5b6b7f' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fontFamily: 'JetBrains Mono', fill: '#5b6b7f' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`} width={44} />
                <Tooltip
                  formatter={(v) => [fmtMoney(v), 'Revenue']}
                  labelFormatter={(l) => `Month ${l}`}
                  contentStyle={{ borderRadius: 10, border: '1px solid #e4e7ec', fontFamily: 'JetBrains Mono', fontSize: 12 }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#1d4ed8" strokeWidth={2.2} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card bento-card">
          <div className="bento-head">
            <h3>Sync status</h3>
            <span className="badge badge-neutral">{sync?.synced ? 'LIVE' : 'EMPTY'}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="dl">
              <span className="k">Desktop → Web</span>
              <span className="v" style={{ color: sync?.synced ? 'var(--success)' : 'var(--danger)' }}>
                {sync?.synced ? 'Connected' : 'Not connected'}
              </span>
            </div>
            <div className="dl">
              <span className="k">Last sync</span>
              <span className="v">{fmtDateTime(sync?.lastSync)}</span>
            </div>
            <div className="dl">
              <span className="k">Tables</span>
              <span className="v">{(sync?.tables || []).join(', ')}</span>
            </div>
            <div className="dl">
              <span className="k">Records</span>
              <span className="v">{sync?.counts ? Object.values(sync.counts).reduce((a, b) => a + b, 0) : 0}</span>
            </div>
            <Link to="/app/invoices" className="btn btn-ghost btn-sm" style={{ marginTop: 4 }}>
              Open workspace <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>

        <div className="card bento-card full">
          <div className="bento-head">
            <h3>Recent invoices</h3>
            <Link to="/app/invoices" className="label" style={{ color: 'var(--primary)' }}>View all →</Link>
          </div>
          {recentInvoices.length === 0 ? (
            <Empty icon={<FileText size={22} />} title="No invoices" sub="Invoices created in the app will show up here." />
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
                        <td><Link to={`/app/invoices/${inv.id}`} className="mono" style={{ color: 'var(--primary)', fontWeight: 600 }}>{inv.invoice_no}</Link></td>
                        <td className="mono">{fmtDate(inv.invoice_date)}</td>
                        <td style={{ fontWeight: 500 }}>{inv.customer_name}</td>
                        <td><Badge status={inv.type === 'Purchase' ? 'purchase' : 'sales'}>{inv.type}</Badge></td>
                        <td className="money" style={{ textAlign: 'right' }}>{fmtMoney(inv.grand_total)}</td>
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
