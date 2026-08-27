import React, { useRef } from 'react';
import { fmtMoney, fmtDate } from '../api';

function formatNum(n) {
  if (n == null) return '0.00';
  return Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function InvoicePaper({ invoice, company }) {
  const ref = useRef(null);
  if (!invoice) return null;
  const isPurchase = invoice.type === 'Purchase';
  const title = isPurchase ? 'PURCHASE BILL' : 'TAX INVOICE';
  const supplier = isPurchase ? {
    name: invoice.customer_name,
    gstin: invoice.customer_gstin,
    address: invoice.customer_address,
    city: invoice.customer_city,
    state: invoice.customer_state,
    stateCode: invoice.customer_state_code,
    phone: invoice.customer_phone,
    pincode: invoice.customer_pincode,
  } : {
    name: company?.name || '—',
    gstin: company?.gstin,
    address: company?.address,
    city: company?.city,
    state: company?.state,
    stateCode: company?.state_code,
    pincode: company?.pincode,
    phone: company?.phone,
    email: company?.email,
  };
  const buyer = isPurchase ? {
    name: company?.name || '—',
    gstin: company?.gstin,
    city: company?.city,
    state: company?.state,
  } : {
    name: invoice.customer_name,
    gstin: invoice.customer_gstin,
    address: invoice.customer_address,
    city: invoice.customer_city,
    state: invoice.customer_state,
    stateCode: invoice.customer_state_code,
    pincode: invoice.customer_pincode,
  };

  const handlePrint = () => {
    const el = ref.current;
    if (!el) return;
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) return;
    const styles = Array.from(document.styleSheets).map(s => {
      try { return Array.from(s.cssRules).map(r => r.cssText).join('\n'); } catch { return ''; }
    }).join('\n');
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${invoice.invoice_no}</title><style>${styles} body{ background:#fff; } @media print { body { background:#fff; } .no-print{ display:none!important; } }</style></head><body>${el.outerHTML}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 400);
  };

  const items = invoice.items || [];
  const totalQty = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginBottom: 16 }} className="no-print">
        <button className="btn btn-ghost btn-sm" onClick={handlePrint} style={{ borderRadius: 999 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M6 9V2h12v7" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M6 14h12v8H6z" /></svg>
          Print / Save as PDF
        </button>
      </div>

      <div ref={ref} className="invoice-paper" id="invoice-paper">
        {/* Masthead */}
        <div style={{ padding: '28px 32px', borderBottom: '1px solid var(--line)', background: 'var(--paper)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, alignItems: 'flex-start' }}>
            <div>
              <div style={{ width: 36, height: 36, background: 'var(--ink)', borderRadius: 10, display: 'grid', placeItems: 'center', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, marginBottom: 10 }}>I</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1 }}>{supplier.name}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--stone)', marginTop: 6, lineHeight: 1.6 }}>
                {supplier.address && <div>{supplier.address}</div>}
                <div>{[supplier.city, supplier.pincode].filter(Boolean).join(' — ')}</div>
                <div>GSTIN: {supplier.gstin || '—'} {supplier.state ? `· ${supplier.state} (${supplier.stateCode || ''})` : ''}</div>
                {supplier.phone && <div>Tel: {supplier.phone}</div>}
              </div>
            </div>
            <div style={{ textAlign: 'right', minWidth: 180 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--oxide)', fontWeight: 700, border: '1px solid var(--oxide)', display: 'inline-block', padding: '4px 10px', borderRadius: 999 }}>{title}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginTop: 12 }}>{invoice.invoice_no}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--stone)', marginTop: 4 }}>{fmtDate(invoice.invoice_date)} {invoice.is_reverse_charge ? '· RCM: Yes' : ''}</div>
              <div style={{ marginTop: 12, display: 'inline-flex', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                <span style={{ background: 'var(--ink)', color: '#fff', padding: '3px 8px', borderRadius: 999 }}>{invoice.type}</span>
                <span style={{ border: '1px solid var(--line-strong)', padding: '3px 8px', borderRadius: 999 }}>{invoice.supply_type || 'B2B'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bill to */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, borderBottom: '1px solid var(--line)' }}>
          <div style={{ padding: '20px 32px', borderRight: '1px solid var(--line)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--stone-light)', marginBottom: 8 }}>Bill to</div>
            {invoice.bill_to_address ? (
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{invoice.bill_to_address.replace(/, /g, '\n')}</div>
            ) : (
              <>
                <div style={{ fontWeight: 700, fontFamily: 'var(--font-display)', fontSize: 15 }}>{buyer.name}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--stone)', marginTop: 4, lineHeight: 1.6 }}>
                  {invoice.customer_address && <div>{invoice.customer_address}</div>}
                  <div>{[invoice.customer_city, invoice.customer_pincode].filter(Boolean).join(' — ')}</div>
                  <div>{invoice.customer_state} {invoice.customer_state_code ? `(${invoice.customer_state_code})` : ''}</div>
                  <div>GSTIN: {invoice.customer_gstin || 'URP'}</div>
                </div>
              </>
            )}
          </div>
          <div style={{ padding: '20px 32px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--stone-light)', marginBottom: 8 }}>Details</div>
            <div style={{ display: 'grid', gap: 6, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--stone)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>Place of supply</span><span style={{ fontWeight: 600 }}>{invoice.place_of_supply || '—'}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--stone)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>Due date</span><span style={{ fontWeight: 600 }}>{invoice.due_date ? fmtDate(invoice.due_date) : '—'}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--stone)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>Vehicle</span><span style={{ fontWeight: 600 }}>{invoice.vehicle_no || '—'}</span></div>
              {invoice.ship_to_address && <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed var(--line)' }}><div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--stone-light)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Ship to</div><div style={{ fontSize: 12, marginTop: 4, whiteSpace: 'pre-wrap' }}>{invoice.ship_to_address.replace(/, /g, '\n')}</div></div>}
            </div>
          </div>
        </div>

        {/* Items */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--ink)', color: '#fff' }}>
                <th style={{ textAlign: 'center', padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>#</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>Description</th>
                <th style={{ textAlign: 'center', padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>HSN</th>
                <th style={{ textAlign: 'right', padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>Qty</th>
                <th style={{ textAlign: 'right', padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>Rate</th>
                <th style={{ textAlign: 'right', padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>Taxable</th>
                <th style={{ textAlign: 'right', padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={it.id} style={{ borderBottom: '1px solid var(--line-faint)' }}>
                  <td style={{ textAlign: 'center', padding: '12px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--stone-light)' }}>{idx + 1}</td>
                  <td style={{ padding: '12px', fontWeight: 600, fontFamily: 'var(--font-body)' }}>{it.description}</td>
                  <td style={{ textAlign: 'center', padding: '12px', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{it.hsn_code || '—'}</td>
                  <td style={{ textAlign: 'right', padding: '12px', fontFamily: 'var(--font-mono)' }}>{formatNum(it.quantity)} {it.unit}</td>
                  <td style={{ textAlign: 'right', padding: '12px', fontFamily: 'var(--font-mono)' }}>{fmtMoney(it.rate)}</td>
                  <td style={{ textAlign: 'right', padding: '12px', fontFamily: 'var(--font-mono)' }}>{formatNum(it.taxable_value)}</td>
                  <td style={{ textAlign: 'right', padding: '12px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{fmtMoney(it.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 0, borderTop: '1px solid var(--ink)' }}>
          <div style={{ padding: '20px 32px', borderRight: '1px solid var(--line)', background: 'var(--paper)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--stone-light)', marginBottom: 8 }}>Amount in words</div>
            <div style={{ fontFamily: 'var(--font-editorial)', fontStyle: 'italic', fontSize: 15, lineHeight: 1.5 }}>{invoice.amount_in_words || '—'}</div>
            {invoice.notes && <><div style={{ marginTop: 16, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--stone-light)' }}>Notes</div><div style={{ fontSize: 13, marginTop: 4, color: 'var(--stone)' }}>{invoice.notes}</div></>}
          </div>
          <div style={{ padding: '20px 24px', background: '#fff' }}>
            <div style={{ display: 'grid', gap: 8, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--stone)' }}>Sub total</span><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{fmtMoney(invoice.sub_total)}</span></div>
              {Number(invoice.discount_total) > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--oxide)' }}><span>Discount</span><span style={{ fontFamily: 'var(--font-mono)' }}>-{fmtMoney(invoice.discount_total)}</span></div>}
              {Number(invoice.cgst_total) > 0 && <><div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--stone)' }}>CGST</span><span style={{ fontFamily: 'var(--font-mono)' }}>{fmtMoney(invoice.cgst_total)}</span></div><div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--stone)' }}>SGST</span><span style={{ fontFamily: 'var(--font-mono)' }}>{fmtMoney(invoice.sgst_total)}</span></div></>}
              {Number(invoice.igst_total) > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--stone)' }}>IGST</span><span style={{ fontFamily: 'var(--font-mono)' }}>{fmtMoney(invoice.igst_total)}</span></div>}
              {Number(invoice.cess_total) > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--stone)' }}>Cess</span><span style={{ fontFamily: 'var(--font-mono)' }}>{fmtMoney(invoice.cess_total)}</span></div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid var(--ink)', paddingTop: 12, marginTop: 4 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>Grand total</span>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18 }}>{fmtMoney(invoice.grand_total)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span style={{ color: 'var(--stone)' }}>Paid</span><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--sage)', fontWeight: 600 }}>{fmtMoney(invoice.paid_amount)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span style={{ color: 'var(--stone)' }}>Balance</span><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: Number(invoice.paid_amount) >= Number(invoice.grand_total) ? 'var(--sage)' : 'var(--oxide)' }}>{fmtMoney(Math.max(0, Number(invoice.grand_total) - Number(invoice.paid_amount)))}</span></div>
            </div>
            <div style={{ marginTop: 12, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--stone-light)', textAlign: 'right' }}>Qty: {formatNum(totalQty)}</div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 32px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', fontSize: 11 }}>
          <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--stone-light)', lineHeight: 1.6 }}>
            <div>Bank: {company?.bank_name || '—'} · A/c {company?.bank_account || '—'} · {company?.bank_ifsc || ''}</div>
            <div>Declaration: We declare that this invoice shows the actual price of goods and all particulars are true.</div>
          </div>
          <div style={{ textAlign: 'right', fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--stone)', fontSize: 12 }}>
            for {supplier.name}<br />
            <span style={{ display: 'inline-block', marginTop: 24, borderTop: '1px solid var(--ink)', paddingTop: 6, fontFamily: 'var(--font-mono)', fontStyle: 'normal', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Authorised signatory</span>
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '10px', background: 'var(--paper-2)', borderTop: '1px solid var(--line)', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--stone-light)' }}>
          This is a computer generated invoice · Subject to {company?.city || 'local'} jurisdiction
        </div>
      </div>
    </div>
  );
}
