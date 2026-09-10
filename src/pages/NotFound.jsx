import React from 'react';
import { Link } from 'react-router-dom';
import { Receipt, ArrowLeft, LayoutDashboard } from 'lucide-react';

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 520, textAlign: 'center' }}>
        <div className="brand" style={{ justifyContent: 'center', border: 'none', paddingBottom: 0, marginBottom: 20 }}>
          <div className="brand-mark"><Receipt size={18} /></div>
          <div>
            <div className="brand-name">Invoix</div>
            <div className="brand-sub">Ledger · Billing · GST</div>
          </div>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.2em', color: 'var(--oxide)', marginBottom: 8 }}>ERROR 404</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 700, color: 'var(--ink)', marginBottom: 12 }}>This page is not in the ledger.</h1>
        <p style={{ color: 'var(--stone)', fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>
          The address you typed does not match any page. Check the spelling, or pick a destination below.
        </p>
        <nav style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }} aria-label="Not found navigation">
          <Link className="btn btn-primary" to="/"><ArrowLeft size={15} /> Back home</Link>
          <Link className="btn btn-ghost" to="/app"><LayoutDashboard size={15} /> Open workspace</Link>
          <Link className="btn btn-ghost" to="/login">Sign in</Link>
        </nav>
      </div>
    </div>
  );
}
