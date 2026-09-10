import React, { useEffect, useState } from 'react';
import { BookOpen, Search, CloudOff } from 'lucide-react';
import { api, fmtMoney, fmtDate } from '../api';
import { useAutoRefresh } from '../useAutoSync';
import { Empty, Skeleton, ErrorState, PageHead, Pager, usePager, OfflineBar, useOnline } from '../components/ui';

export default function Ledger() {
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState(null);
  const [balances, setBalances] = useState(null);
  const [search, setSearch] = useState('');
  const [customerId, setCustomerId] = useState('');
  const online = useOnline();
  const pager = usePager(entries || [], 25);

  const load = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (customerId) params.set('customer_id', customerId);
    api.get(`/data/ledger?${params.toString()}`)
      .then((res)=>{ setEntries(res.entries); setError(null); })
      .catch((e)=>{
        if (e.status === 404) { setEntries([]); setError(null); }
        else { setEntries([]); setError(e); }
      });
    api.get('/data/ledger/balances').then((res)=>setBalances(res.balances)).catch(()=>{});
  };

  useEffect(()=>{ const t=setTimeout(load,350); return()=>clearTimeout(t); },[search,customerId]);
  useAutoRefresh(load);

  const totalDebit=(entries||[]).reduce((s,e)=>s+Number(e.debit||0),0);
  const totalCredit=(entries||[]).reduce((s,e)=>s+Number(e.credit||0),0);

  return (
    <div>
      <PageHead
        title="Ledger"
        sub="Running balances, set in ink."
      />

      {!online && <OfflineBar />}

      <div className="filter-bar">
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 14, top: 14, color: 'var(--stone-light)' }} />
          <input className="input" style={{ paddingLeft: 38, minWidth: 260, borderRadius: 12 }} placeholder="Search particulars…" value={search} onChange={(e)=>setSearch(e.target.value)} aria-label="Search ledger" />
        </div>
        <select className="input" style={{ borderRadius: 12, minWidth: 180 }} value={customerId} onChange={(e)=>setCustomerId(e.target.value)} aria-label="Filter by customer">
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
        {error ? (
          <ErrorState
            icon={<CloudOff size={22} />}
            title={api.isNetworkError(error) ? "Can't reach the server" : 'Ledger would not load'}
            sub={error.message}
            network={api.isNetworkError(error)}
            onRetry={load}
            backTo="/app"
          />
        ) : entries === null ? (
          <Skeleton variant="table" rows={8} />
        ) : entries.length === 0 ? (
          <Empty
            icon={<BookOpen size={22} />}
            title={search || customerId ? 'No entries match' : 'No entries yet'}
            sub={search || customerId ? 'Loosen the filters to see more of the book.' : 'Ledger entries pressed in the desktop will be set here, line by line.'}
            action={search || customerId ? undefined : { label: 'See sync steps on the dashboard', to: '/app' }}
          />
        ) : (
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
                {pager.slice.map((e)=>(
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
      {!error && entries !== null && (
        <Pager page={pager.page} pages={pager.pages} total={pager.total} perPage={pager.perPage} setPage={pager.setPage} label="entries" />
      )}
    </div>
  );
}
