import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Search, Download, CloudOff } from 'lucide-react';
import { api } from '../api';
import { useAutoRefresh } from '../useAutoSync';
import { Empty, Skeleton, ErrorState, PageHead, Pager, usePager, OfflineBar, useOnline } from '../components/ui';

export default function Customers() {
  const [customers, setCustomers] = useState(null);
  const [error, setError] = useState(null);
  const [counts, setCounts] = useState({});
  const [search, setSearch] = useState('');
  const online = useOnline();
  const pager = usePager(customers || [], 25);

  const load = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    api.get(`/data/customers?${params.toString()}`)
      .then((res) => { setCustomers(res.customers); setError(null); })
      .catch((e) => {
        if (e.status === 404) { setCustomers([]); setError(null); }
        else { setCustomers([]); setError(e); }
      });
    api.get('/data/invoices').then((res) => { const c={}; res.invoices.forEach((inv)=>{ c[inv.customer_id]=(c[inv.customer_id]||0)+1; }); setCounts(c); }).catch(()=>{});
  };

  useEffect(() => { load(); }, []);
  useAutoRefresh(load);

  const exportCsv = () => {
    if (!customers) return;
    const rows = [['Name','GSTIN','City','State','Phone','Email','Address'], ...customers.map((c) => [c.name,c.gstin,c.city,c.state,c.phone,c.email,c.address])];
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff'+csv], {type:'text/csv;charset=utf-8'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`customers-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  };

  return (
    <div>
      <PageHead
        title="Customers"
        sub="Your customer book, pressed from the desktop. Each name set in type."
      >
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--stone-light)', border: '1px solid var(--line)', padding: '4px 10px', borderRadius: 999 }}>{customers ? `${customers.length} in book` : ''}</span>
      </PageHead>

      {!online && <OfflineBar />}

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 14, top: 14, color: 'var(--stone-light)' }} />
          <input className="input" style={{ paddingLeft: 38, minWidth: 300, borderRadius: 12 }} placeholder="Search name, GSTIN or phone…" value={search} onChange={(e)=>setSearch(e.target.value)} aria-label="Search customers" />
        </div>
        <button className="btn btn-ghost btn-sm" onClick={exportCsv} disabled={!customers?.length} style={{ borderRadius: 12 }}><Download size={14} /> Export</button>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {error ? (
          <ErrorState
            icon={<CloudOff size={22} />}
            title={api.isNetworkError(error) ? "Can't reach the server" : 'Customers would not load'}
            sub={error.message}
            network={api.isNetworkError(error)}
            onRetry={load}
            backTo="/app"
          />
        ) : customers === null ? (
          <Skeleton variant="table" rows={8} />
        ) : customers.length === 0 ? (
          <Empty
            icon={<Users size={22} />}
            title={search ? 'No customers match' : 'No customers yet'}
            sub={search ? 'Try a shorter search, or clear it to see the whole book.' : 'Add customers in the desktop atelier and they will be set here automatically.'}
            action={search ? undefined : { label: 'See sync steps on the dashboard', to: '/app' }}
          />
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>GSTIN</th>
                  <th>City · State</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th style={{ textAlign: 'right' }}>Invoices</th>
                </tr>
              </thead>
              <tbody>
                {pager.slice.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, letterSpacing: '-0.01em' }}>{c.name}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--stone-light)' }}>{c.address ? c.address.slice(0,40) : ''}</div>
                    </td>
                    <td className="mono" style={{ fontSize: 11 }}>{c.gstin || '—'}</td>
                    <td style={{ fontFamily: 'var(--font-body)', fontSize: 13 }}>{[c.city,c.state].filter(Boolean).join(' · ') || '—'}</td>
                    <td className="mono" style={{ fontSize: 12 }}>{c.phone || '—'}</td>
                    <td style={{ fontSize: 13, color: 'var(--stone)' }}>{c.email || '—'}</td>
                    <td className="money" style={{ textAlign: 'right', fontWeight: 700, fontSize: 16, fontFamily: 'var(--font-display)' }}>{counts[c.id] || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {!error && customers !== null && (
        <Pager page={pager.page} pages={pager.pages} total={pager.total} perPage={pager.perPage} setPage={pager.setPage} label="customers" />
      )}
    </div>
  );
}
