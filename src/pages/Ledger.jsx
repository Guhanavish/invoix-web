import React, { useEffect, useState } from 'react';
import { BookOpen, Search } from 'lucide-react';
import { api, fmtMoney, fmtDate } from '../api';
import { useAutoRefresh } from '../useAutoSync';
import { Empty, Loading } from '../components/ui';

export default function Ledger() {
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState('');
  const [balances, setBalances] = useState(null);
  const [search, setSearch] = useState('');
  const [customerId, setCustomerId] = useState('');

  const load = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (customerId) params.set('customer_id', customerId);
    api.get(`/data/ledger?${params.toString()}`).then((res)=>{ setEntries(res.entries); setError(''); }).catch((e)=>{ setEntries([]); setError(e.message); });
    api.get('/data/ledger/balances').then((res)=>setBalances(res.balances)).catch(()=>{});
  };

  useEffect(()=>{ const t=setTimeout(load,350); return()=>clearTimeout(t); },[search,customerId]);
  useAutoRefresh(load);

  const totalDebit=(entries||[]).reduce((s,e)=>s+Number(e.debit||0),0);
  const totalCredit=(entries||[]).reduce((s,e)=>s+Number(e.credit||0),0);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
        <h1 style={{ fontSize: 36 }}>Ledger</h1>
        <span style={{ fontFamily: 'var(--font-editorial)', fontStyle: 'italic', color: 'var(--stone)' }}>Running balances, set in ink.</span>
      </div>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--stone-light)', marginBottom: 18 }}>Per customer — pressed from the app.</p>

      <div className="filter-bar">
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 14, top: 14, color: 'var(--stone-light)' }} />
          <input className="input" style={{ paddingLeft: 38, minWidth: 260, borderRadius: 999 }} placeholder="Search particulars…" value={search} onChange={(e)=>setSearch(e.target.value)} />
        </div>
        <select className="input" style={{ borderRadius: 999, minWidth: 180 }} value={customerId} onChange={(e)=>setCustomerId(e.target.value)}>
          <option value="">All customers</option>
          {(balances||[]).map((b)=>(<option key={b.id} value={b.id}>{b.name}</option>))}
        </select>
      </div>

      {balances && balances.length>0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))', gap: 12, marginBottom: 16 }}>
          {balances.slice(0,4).map((b)=>(
            <div key={b.id} className="card" style={{ padding: 18, borderLeft: `3px solid ${Number(b.balance)>0 ? 'var(--sage)' : Number(b.balance)<0 ? 'var(--oxide)' : 'var(--line-strong)'}` }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--stone-light)' }}>{b.name}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, marginTop: 6, color: Number(b.balance)>0 ? 'var(--sage)' : Number(b.balance)<0 ? 'var(--oxide)' : 'var(--ink)' }}>{fmtMoney(b.balance)}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--stone)', marginTop: 4 }}>Dr {fmtMoney(b.total_debit)} · Cr {fmtMoney(b.total_credit)}</div>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ overflow: 'hidden' }}>
        {error ? <Empty icon={<BookOpen size={22} />} title="Couldn't load ledger" sub={error} /> : entries===null ? <Loading /> : entries.length===0 ? <Empty icon={<BookOpen size={22} />} title="No entries" sub="Ledger entries from the desktop will be set here." /> : (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Particulars</th>
                  <th>Ref</th>
                  <th style={{ textAlign: 'right' }}>Debit</th>
                  <th style={{ textAlign: 'right' }}>Credit</th>
                  <th style={{ textAlign: 'right' }}>Balance</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e)=>(
                  <tr key={e.id}>
                    <td className="mono" style={{ fontSize: 11 }}>{fmtDate(e.entry_date)}</td>
                    <td style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>{e.customer_name}</td>
                    <td style={{ fontFamily: 'var(--font-body)', fontSize: 13 }}>{e.particulars || '—'}</td>
                    <td className="mono" style={{ fontSize: 11 }}>{e.reference_type || '—'}</td>
                    <td className="money" style={{ textAlign: 'right', color: Number(e.debit)?'var(--oxide)':'var(--stone-light)' }}>{Number(e.debit)?fmtMoney(e.debit):'—'}</td>
                    <td className="money" style={{ textAlign: 'right', color: Number(e.credit)?'var(--sage)':'var(--stone-light)' }}>{Number(e.credit)?fmtMoney(e.credit):'—'}</td>
                    <td className="money" style={{ textAlign: 'right', fontWeight: 700 }}>{fmtMoney(e.balance)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--ink)', background: 'var(--paper-2)' }}>
                  <td colSpan={4} style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>Totals</td>
                  <td className="money" style={{ textAlign: 'right', fontWeight: 700 }}>{fmtMoney(totalDebit)}</td>
                  <td className="money" style={{ textAlign: 'right', fontWeight: 700 }}>{fmtMoney(totalCredit)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
