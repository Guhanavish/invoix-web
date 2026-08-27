import React, { useEffect, useState } from 'react';
import { BarChart3, Download } from 'lucide-react';
import { api, fmtMoney, fmtDate } from '../api';
import { useAutoRefresh } from '../useAutoSync';
import { Empty, Loading } from '../components/ui';

const MONTHS = Array.from({ length: 6 }, (_, i) => { const d=new Date(); d.setMonth(d.getMonth()-i); return d.toISOString().slice(0,7); });

export default function Reports() {
  const [g1,setG1]=useState(null);
  const [g3,setG3]=useState(null);
  const [aging,setAging]=useState(null);
  const [month,setMonth]=useState(MONTHS[0]);
  const [error,setError]=useState('');

  const load=()=>{
    const from=`${month}-01`;
    const to=new Date(new Date(from).setMonth(new Date(from).getMonth()+1)).toISOString().slice(0,10);
    Promise.all([api.get(`/data/reports/gstr1?from=${from}&to=${to}`), api.get(`/data/reports/gstr3b?from=2000-01-01&to=2999-12-31`), api.get(`/data/reports/aging`)]).then(([a,b,c])=>{setG1(a); setG3(b); setAging(c);}).catch((e)=>setError(e.message));
  };
  useEffect(()=>{ load(); },[month]);
  useAutoRefresh(load);
  if(error) return <Empty icon={<BarChart3 size={22} />} title="No data to report" sub={error} />;
  if(!g1||!g3||!aging) return <Loading />;

  const exportG1=()=>{
    const rows=[['Invoice No','Date','Customer','GSTIN','Supply','Taxable','CGST','SGST','IGST','Total'], ...g1.sales.map((s)=>[s.invoice_no,s.invoice_date,s.customer_name,s.customer_gstin,s.supply_type,s.sub_total,s.cgst_total,s.sgst_total,s.igst_total,s.grand_total])];
    const csv=rows.map((r)=>r.map((c)=>`"${String(c??'').replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`gstr1-${month}.csv`; a.click();
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
        <h1 style={{ fontSize: 36 }}>Reports</h1>
        <span style={{ fontFamily: 'var(--font-editorial)', fontStyle: 'italic', color: 'var(--stone)' }}>GSTR &amp; aging — set from your figures.</span>
      </div>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--stone-light)', marginBottom: 18 }}>GST summaries, net liability, receivable aging.</p>

      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <select className="input" style={{ borderRadius: 999, minWidth: 160 }} value={month} onChange={(e)=>setMonth(e.target.value)}>
          {MONTHS.map((m)=>(<option key={m} value={m}>{m}</option>))}
        </select>
        <button className="btn btn-ghost btn-sm" onClick={exportG1} disabled={!g1.sales.length} style={{ borderRadius: 999 }}><Download size={14}/> Export GSTR-1</button>
      </div>

      <div className="bento">
        <div className="card bento-card">
          <div className="bento-head">
            <h3 style={{ fontFamily: 'var(--font-display)' }}>GSTR-1 <span style={{ fontWeight: 300, color: 'var(--stone)' }}>· {month}</span></h3>
            <span className="badge badge-sales">{g1.count} invoices</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 0 }}>
            {[
              ['Taxable',fmtMoney(g1.totalTaxable)],
              ['CGST',fmtMoney(g1.totalCgst)],
              ['SGST',fmtMoney(g1.totalSgst)],
              ['IGST',fmtMoney(g1.totalIgst)],
              ['Invoice value',fmtMoney(g1.totalInvoiceValue)],
              ['B2B / B2C',`${g1.b2b.length} / ${g1.b2c.length}`],
            ].map(([k,v])=>(
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px dashed var(--line-faint)' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--stone)' }}>{k}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 13 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card bento-card" style={{ background: 'var(--ink)', color: '#fdfcf8', borderColor: 'var(--ink)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ color: '#fdfcf8' }}>GSTR-3B <span style={{ fontWeight: 300, color: '#9a9590' }}>· all time</span></h3>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9a9590' }}>Net</span>
          </div>
          <div style={{ textAlign: 'center', padding: '12px 0 18px', border: '1px dashed rgba(253,252,248,0.15)', borderRadius: 12 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 700, color: g3.netTaxLiability>0 ? '#f0a390' : '#a8d5a2' }}>{fmtMoney(g3.netTaxLiability)}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9a9590' }}>{g3.netTaxLiability>0 ? 'Payable' : 'Refundable / Nil'}</div>
          </div>
          <div style={{ marginTop: 16, display: 'grid', gap: 8, fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed rgba(253,252,248,0.1)' }}><span style={{ color: '#9a9590', fontFamily: 'var(--font-mono)', fontSize: 11 }}>Outward taxable</span><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{fmtMoney(g3.sales.taxable)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed rgba(253,252,248,0.1)' }}><span style={{ color: '#9a9590', fontFamily: 'var(--font-mono)', fontSize: 11 }}>Outward tax</span><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{fmtMoney(g3.sales.totalTax)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed rgba(253,252,248,0.1)' }}><span style={{ color: '#9a9590', fontFamily: 'var(--font-mono)', fontSize: 11 }}>Inward taxable</span><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{fmtMoney(g3.purchases.taxable)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}><span style={{ color: '#9a9590', fontFamily: 'var(--font-mono)', fontSize: 11 }}>Inward tax (ITC)</span><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{fmtMoney(g3.purchases.totalTax)}</span></div>
          </div>
        </div>

        <div className="card bento-card full">
          <div className="bento-head">
            <h3 style={{ fontFamily: 'var(--font-display)' }}>Aging <span style={{ fontWeight: 300, color: 'var(--stone)' }}>· receivables</span></h3>
            <span className="badge badge-unpaid">{fmtMoney(aging.totalOutstanding)} outstanding</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
            {Object.entries(aging.buckets).map(([bucket,list])=>(
              <div key={bucket} style={{ padding: 16, textAlign: 'center', background: 'var(--paper-2)', border: '1px solid var(--line)', borderRadius: 12 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--stone-light)' }}>{bucket} days</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, marginTop: 6 }}>{fmtMoney(list.reduce((s,i)=>s+Number(i.outstanding||0),0))}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--stone)', marginTop: 2 }}>{list.length} invoices</div>
              </div>
            ))}
          </div>
          {aging.overdue.length===0 ? <p style={{ fontFamily: 'var(--font-editorial)', fontStyle: 'italic', color: 'var(--stone)' }}>No overdue receivables. The book is clean.</p> : (
            <div className="table-wrap">
              <table className="tbl">
                <thead><tr><th>Invoice</th><th>Customer</th><th>Due date</th><th style={{textAlign:'right'}}>Overdue</th><th style={{textAlign:'right'}}>Outstanding</th></tr></thead>
                <tbody>{aging.overdue.map((i)=>(<tr key={i.id}><td className="mono" style={{fontWeight:700}}>{i.invoice_no}</td><td style={{fontFamily:'var(--font-display)',fontWeight:600}}>{i.customer_name}</td><td className="mono" style={{fontSize:11}}>{fmtDate(i.due_date)}</td><td className="money" style={{textAlign:'right',color:'var(--oxide)'}}>{i.days_overdue}d</td><td className="money" style={{textAlign:'right',fontWeight:700}}>{fmtMoney(i.outstanding)}</td></tr>))}</tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
