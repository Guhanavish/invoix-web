import React, { useEffect, useState } from 'react';
import { Users, Search, Download } from 'lucide-react';
import { api, fmtMoney } from '../api';
import { useAutoRefresh } from '../useAutoSync';
import { Empty, Loading, PageHead } from '../components/ui';

export default function Customers() {
  const [customers, setCustomers] = useState(null);
  const [error, setError] = useState('');
  const [counts, setCounts] = useState({});
  const [search, setSearch] = useState('');

  const load = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    api
      .get(`/data/customers?${params.toString()}`)
      .then((res) => {
        setCustomers(res.customers);
        setError('');
      })
      .catch((e) => {
        setCustomers([]);
        setError(e.message);
      });
    api.get('/data/invoices').then((res) => {
      const c = {};
      res.invoices.forEach((inv) => {
        c[inv.customer_id] = (c[inv.customer_id] || 0) + 1;
      });
      setCounts(c);
    }).catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  useAutoRefresh(load);

  const exportCsv = () => {
    if (!customers) return;
    const rows = [
      ['Name', 'GSTIN', 'City', 'State', 'Phone', 'Email', 'Address'],
      ...customers.map((c) => [c.name, c.gstin, c.city, c.state, c.phone, c.email, c.address]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div>
      <PageHead title="Customers" sub="Your customer book, synced from the desktop app.">
        <button className="btn btn-ghost btn-sm" onClick={exportCsv} disabled={!customers?.length}>
          <Download size={14} /> Export CSV
        </button>
      </PageHead>

      <div className="filter-bar">
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--muted)' }} />
          <input
            className="input"
            style={{ paddingLeft: 34 }}
            placeholder="Search name, GSTIN or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="card">
        {error ? (
          <Empty icon={<Users size={22} />} title="Couldn't load customers" sub={error} />
        ) : customers === null ? (
          <Loading />
        ) : customers.length === 0 ? (
          <Empty icon={<Users size={22} />} title="No customers found" sub="Customers added in the desktop app will appear here." />
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>GSTIN</th>
                  <th>City / State</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th style={{ textAlign: 'right' }}>Invoices</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td className="mono">{c.gstin || '—'}</td>
                    <td>{[c.city, c.state].filter(Boolean).join(', ') || '—'}</td>
                    <td className="mono">{c.phone || '—'}</td>
                    <td>{c.email || '—'}</td>
                    <td className="money" style={{ textAlign: 'right' }}>
                      {counts[c.id] || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
