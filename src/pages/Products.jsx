import React, { useEffect, useState } from 'react';
import { Package, Search, Download, CloudOff } from 'lucide-react';
import { api, fmtMoney } from '../api';
import { useAutoRefresh } from '../useAutoSync';
import { Empty, Skeleton, ErrorState, PageHead, Pager, usePager, OfflineBar, useOnline } from '../components/ui';

export default function Products() {
  const [products, setProducts] = useState(null);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const online = useOnline();
  const pager = usePager(products || [], 25);

  const load = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    api.get(`/data/products?${params.toString()}`)
      .then((res)=>{setProducts(res.products); setError(null);})
      .catch((e)=>{
        if (e.status === 404) { setProducts([]); setError(null); }
        else { setProducts([]); setError(e); }
      });
  };

  useEffect(()=>{ const t=setTimeout(load,350); return()=>clearTimeout(t); },[search]);
  useAutoRefresh(load);

  const exportCsv = () => {
    if(!products) return;
    const rows=[['Name','Description','HSN','Unit','Price','GST %','Stock','Service'], ...products.map((p)=>[p.name,p.description,p.hsn_code,p.unit,p.price,p.gst_rate,p.stock_quantity,p.is_service?'Yes':'No'])];
    const csv=rows.map((r)=>r.map((c)=>`"${String(c??'').replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`products-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  };

  const stockValue=(products||[]).reduce((s,p)=>s+Number(p.stock_quantity||0)*Number(p.price||0),0);

  return (
    <div>
      <PageHead
        title="Products"
        sub="Inventory, pressed and priced."
      >
        <span style={{ fontFamily: 'var(--font-editorial)', fontStyle: 'italic', color: 'var(--stone)' }}>{products?.length ?? 0} items · {fmtMoney(stockValue)} in stock</span>
      </PageHead>

      {!online && <OfflineBar />}

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 14, top: 14, color: 'var(--stone-light)' }} />
          <input className="input" style={{ paddingLeft: 38, minWidth: 300, borderRadius: 12 }} placeholder="Search name or HSN…" value={search} onChange={(e)=>setSearch(e.target.value)} aria-label="Search products" />
        </div>
        <button className="btn btn-ghost btn-sm" onClick={exportCsv} disabled={!products?.length} style={{ borderRadius: 12 }}><Download size={14}/> Export</button>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {error ? (
          <ErrorState
            icon={<CloudOff size={22} />}
            title={api.isNetworkError(error) ? "Can't reach the server" : 'Products would not load'}
            sub={error.message}
            network={api.isNetworkError(error)}
            onRetry={load}
            backTo="/app"
          />
        ) : products === null ? (
          <Skeleton variant="table" rows={8} />
        ) : products.length === 0 ? (
          <Empty
            icon={<Package size={22} />}
            title={search ? 'No products match' : 'No products yet'}
            sub={search ? 'Try a shorter search, or clear it to see everything in stock.' : 'Add products in the desktop atelier and they will be priced here automatically.'}
            action={search ? undefined : { label: 'See sync steps on the dashboard', to: '/app' }}
          />
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>HSN</th>
                  <th>Unit</th>
                  <th style={{ textAlign: 'right' }}>Price</th>
                  <th style={{ textAlign: 'right' }}>GST</th>
                  <th style={{ textAlign: 'right' }}>Stock</th>
                  <th style={{ textAlign: 'right' }}>Value</th>
                </tr>
              </thead>
              <tbody>
                {pager.slice.map((p)=>(
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>{p.name}</div>
                      {p.description && <div style={{ fontFamily: 'var(--font-editorial)', fontStyle: 'italic', color: 'var(--stone)', fontSize: 12 }}>{p.description}</div>}
                    </td>
                    <td className="mono" style={{ fontSize: 11 }}>{p.hsn_code || '—'}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{p.unit || 'Nos'}</td>
                    <td className="money" style={{ textAlign: 'right' }}>{fmtMoney(p.price)}</td>
                    <td className="money" style={{ textAlign: 'right' }}>{Number(p.gst_rate)||0}%</td>
                    <td className="money" style={{ textAlign: 'right' }}>{Number(p.stock_quantity||0)===0 ? <span style={{ color:'var(--oxide)', fontWeight:700 }}>Out</span> : p.stock_quantity}</td>
                    <td className="money" style={{ textAlign: 'right', fontWeight: 700 }}>{fmtMoney(Number(p.stock_quantity||0)*Number(p.price||0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {!error && products !== null && (
        <Pager page={pager.page} pages={pager.pages} total={pager.total} perPage={pager.perPage} setPage={pager.setPage} label="products" />
      )}
    </div>
  );
}
