import React, { useEffect, useState } from 'react';
import { BookOpen, Search } from 'lucide-react';
import { api, fmtMoney, fmtDate } from '../api';
import { Empty, Loading, PageHead } from '../components/ui';

export default function Ledger() {
  const [entries, setEntries] = useState(null);
  const [balances, setBalances] = useState(null);
  const [search, setSearch] = useState('');
  const [customerId, setCustomerId] = useState('');

  useEffect(() => {
    api.get('/data/ledger/balances').then((res) => setBalances(res.balances)).catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (customerId) params.set('customer_id', customerId);
    const t = setTimeout(() => {
      api.get(`/data/ledger?${params.toString()}`).then((res) => setEntries(res.entries));
    }, 350);
    return () => clearTimeout(t);
  }, [search, customerId]);

  const totalDebit = (entries || []).reduce((s, e) => s + Number(e.debit || 0), 0);
  const totalCredit = (entries || []).reduce((s, e) => s + Number(e.credit || 0), 0);

  return (
    <div>
      <PageHead title="Ledger" sub="Running balances and entries per customer — synced live from the app." />

      <div className="filter-bar">
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--muted)' }} />
          <input
            className="input"
            style={{ paddingLeft: 34 }}
            placeholder="Search particulars or customer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
          <option value="">All customers</option>
          {(balances || []).map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      {balances && balances.length > 0 && (
        <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', marginBottom: 16 }}>
          {balances.slice(0, 4).map((b) => (
            <div className="card stat-card" key={b.id} style={{ padding: 16 }}>
              <div className="label">{b.name}</div>
              <h2 style={{ fontSize: 22, color: Number(b.balance) > 0 ? 'var(--success)' : Number(b.balance) < 0 ? 'var(--danger)' : 'var(--ink)' }}>
                {fmtMoney(b.balance)}
              </h2>
              <div className="stat-sub">Balance</div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        {entries === null ? (
          <Loading />
        ) : entries.length === 0 ? (
          <Empty icon={<BookOpen size={22} />} title="No ledger entries" sub="Ledger entries made in the desktop app will appear here." />
        ) : (
          <>
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
                  {entries.map((e) => (
                    <tr key={e.id}>
                      <td className="mono">{fmtDate(e.entry_date)}</td>
                      <td style={{ fontWeight: 500 }}>{e.customer_name}</td>
                      <td>{e.particulars || '—'}</td>
                      <td className="mono">{e.reference_type || '—'}</td>
                      <td className="money" style={{ textAlign: 'right', color: Number(e.debit) ? 'var(--danger)' : 'var(--muted)' }}>{Number(e.debit) ? fmtMoney(e.debit) : '—'}</td>
                      <td className="money" style={{ textAlign: 'right', color: Number(e.credit) ? 'var(--success)' : 'var(--muted)' }}>{Number(e.credit) ? fmtMoney(e.credit) : '—'}</td>
                      <td className="money" style={{ textAlign: 'right' }}>{fmtMoney(e.balance)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--ink)' }}>
                    <td colSpan={4} style={{ fontWeight: 700 }}>Totals</td>
                    <td className="money" style={{ textAlign: 'right' }}>{fmtMoney(totalDebit)}</td>
                    <td className="money" style={{ textAlign: 'right' }}>{fmtMoney(totalCredit)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
