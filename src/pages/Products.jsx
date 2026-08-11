import React, { useEffect, useState } from 'react';
import { Package, Search, Download } from 'lucide-react';
import { api, fmtMoney } from '../api';
import { Empty, Loading, PageHead } from '../components/ui';

export default function Products() {
  const [products, setProducts] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    const t = setTimeout(() => {
      api
        .get(`/data/products?${params.toString()}`)
        .then((res) => {
          setProducts(res.products);
          setError('');
        })
        .catch((e) => {
          setProducts([]);
          setError(e.message);
        });
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const exportCsv = () => {
    if (!products) return;
    const rows = [
      ['Name', 'Description', 'HSN', 'Unit', 'Price', 'GST %', 'Stock', 'Service'],
      ...products.map((p) => [p.name, p.description, p.hsn_code, p.unit, p.price, p.gst_rate, p.stock_quantity, p.is_service ? 'Yes' : 'No']),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `products-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const stockValue = (products || []).reduce((s, p) => s + Number(p.stock_quantity || 0) * Number(p.price || 0), 0);

  return (
    <div>
      <PageHead
        title="Products & services"
        sub={`${products?.length ?? 0} items · inventory value ${fmtMoney(stockValue)}`}
      >
        <button className="btn btn-ghost btn-sm" onClick={exportCsv} disabled={!products?.length}>
          <Download size={14} /> Export CSV
        </button>
      </PageHead>

      <div className="filter-bar">
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--muted)' }} />
          <input
            className="input"
            style={{ paddingLeft: 34 }}
            placeholder="Search name or HSN…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="card">
        {error ? (
          <Empty icon={<Package size={22} />} title="Couldn't load products" sub={error} />
        ) : products === null ? (
          <Loading />
        ) : products.length === 0 ? (
          <Empty icon={<Package size={22} />} title="No products found" sub="Products added in the desktop app will appear here." />
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
                  <th style={{ textAlign: 'right' }}>Stock value</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      {p.description && <div style={{ color: 'var(--muted)', fontSize: 12.5 }}>{p.description}</div>}
                    </td>
                    <td className="mono">{p.hsn_code || '—'}</td>
                    <td>{p.unit || 'Nos'}</td>
                    <td className="money" style={{ textAlign: 'right' }}>{fmtMoney(p.price)}</td>
                    <td className="money" style={{ textAlign: 'right' }}>{Number(p.gst_rate) || 0}%</td>
                    <td className="money" style={{ textAlign: 'right' }}>
                      {Number(p.stock_quantity || 0) === 0
                        ? <span style={{ color: 'var(--danger)' }}>Out of stock</span>
                        : p.stock_quantity}
                    </td>
                    <td className="money" style={{ textAlign: 'right' }}>{fmtMoney(Number(p.stock_quantity || 0) * Number(p.price || 0))}</td>
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
