import React, { useEffect, useState } from 'react';
import { Users, Search, Download } from 'lucide-react';
import { api } from '../api';
import { useAutoRefresh } from '../useAutoSync';
import { Empty, Loading } from '../components/ui';

export default function Customers() {
  const [customers, setCustomers] = useState(null);
  const [error, setError] = useState('');
  const [counts, setCounts] = useState({});
  const [search, setSearch] = useState('');

  const load = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    api.get(`/data/customers?${params.toString()}`).then((res) => { setCustomers(res.customers); setError(''); }).catch((e) => { setCustomers([]); setError(e.message); });
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
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
        <h1 style={{ fontSize: 36 }}>Customers</h1>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--stone-light)', border: '1px solid var(--line)', padding: '4px 10px', borderRadius: 999 }}>{customers ? `${customers.length} in book` : ''}</span>
      </div>
      <p style={{ fontFamily: 'var(--font-editorial)', fontStyle: 'italic', color: 'var(--stone)', marginBottom: 20 }}>Your customer book, pressed from the desktop. Each name set in type.</p>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 14, top: 14, color: 'var(--stone-light)' }} />
          <input className="input" style={{ paddingLeft: 38, minWidth: 300, borderRadius: 999 }} placeholder="Search name, GSTIN or phone…" value={search} onChange={(e)=>setSearch(e.target.value)} />
        </div>
        <button className="btn btn-ghost btn-sm" onClick={exportCsv} disabled={!customers?.length} style={{ borderRadius: 999 }}><Download size={14} /> Export</button>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {error ? <Empty icon={<Users size={22} />} title="Couldn't load customers" sub={error} /> : customers===null ? <Loading /> : customers.length===0 ? <Empty icon={<Users size={22} />} title="No customers" sub="Add customers in the desktop atelier — they appear here, set." /> : (
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
                {customers.map((c) => (
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
    </div>
  );
}
