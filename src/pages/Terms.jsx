import React from 'react';
import { Link } from 'react-router-dom';
import { Receipt, ArrowLeft } from 'lucide-react';

function Section({ n, title, children }) {
  return (
    <section style={{ marginBottom: 26 }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>{n}. {title}</h2>
      <div style={{ color: 'var(--stone)', fontSize: 14.5, lineHeight: 1.7 }}>{children}</div>
    </section>
  );
}

export default function Terms() {
  return (
    <div style={{ background: 'var(--paper)', minHeight: '100vh' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px 80px' }}>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--stone)', fontSize: 13, fontWeight: 600, marginBottom: 24 }}>
          <ArrowLeft size={14} /> Back home
        </Link>
        <div className="brand" style={{ border: 'none', paddingBottom: 0, marginBottom: 16 }}>
          <div className="brand-mark"><Receipt size={18} /></div>
          <div>
            <div className="brand-name">Invoix</div>
            <div className="brand-sub">Ledger · Billing · GST</div>
          </div>
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 800, color: 'var(--ink)', marginBottom: 6 }}>Terms and Conditions</h1>
        <p style={{ color: 'var(--stone-light)', fontSize: 13, marginBottom: 32, fontFamily: 'var(--font-mono)' }}>Last updated: September 2026</p>

        <Section n="1" title="What Invoix is">
          <p>Invoix provides a Windows desktop application for GST billing (invoices, customers, products, ledger, GSTR reports) and a companion web portal that mirrors data you choose to sync. The desktop app works offline. The web portal only shows data after you sign in and sync from the app.</p>
        </Section>
        <Section n="2" title="Your account">
          <p>You register with a user id, a password and an email address you verify. You are responsible for keeping your password secret and for everything synced under your account. One account per business is recommended.</p>
        </Section>
        <Section n="3" title="Your data">
          <p>Your invoices and ledger remain yours. The desktop database lives on your own computer. Synced copies are stored under your account to render the web portal. You can stop syncing at any time from the app. See the <Link to="/privacy" style={{ color: 'var(--ink)', fontWeight: 600 }}>Privacy Policy</Link> for details.</p>
        </Section>
        <Section n="4" title="Correctness of tax figures">
          <p>Invoix computes GST the way you configure it (rates, HSN codes, place of supply). Tax law changes and filing remain your responsibility. Verify critical filings with your chartered accountant before submitting them to the GST portal.</p>
        </Section>
        <Section n="5" title="Acceptable use">
          <p>Do not attempt to access other users accounts, probe or overload the service, upload unlawful content, or misrepresent the software as your own product. Accounts used abusively may be suspended.</p>
        </Section>
        <Section n="6" title="Availability">
          <p>The desktop app works without the internet. The web portal depends on hosting and storage providers and may occasionally be unavailable. No uptime is guaranteed for the free service.</p>
        </Section>
        <Section n="7" title="Liability">
          <p>To the maximum extent permitted by law, Invoix is provided as is, without warranties. Liability for any claim is limited to the amount you paid for the service in the preceding 12 months (zero for the free tier).</p>
        </Section>
        <Section n="8" title="Changes and contact">
          <p>These terms may change; continued use after changes take effect means acceptance. Questions: write to the developer through the profiles linked on the <Link to="/#profile" style={{ color: 'var(--ink)', fontWeight: 600 }}>home page</Link>.</p>
        </Section>
      </div>
    </div>
  );
}
