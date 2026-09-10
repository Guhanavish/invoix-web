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

export default function Privacy() {
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
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 800, color: 'var(--ink)', marginBottom: 6 }}>Privacy Policy</h1>
        <p style={{ color: 'var(--stone-light)', fontSize: 13, marginBottom: 32, fontFamily: 'var(--font-mono)' }}>Last updated: September 2026</p>

        <Section n="1" title="What we store">
          <p>Account data: your user id, a salted-and-hashed password (never the password itself), your verified email, and optional profile details you provide. Billing data: only what you sync from the desktop app (companies, invoices, customers, products, ledger entries, pending drafts, profile-change approvals). The desktop database on your own computer is never uploaded unless you press sync.</p>
        </Section>
        <Section n="2" title="What never leaves your computer unless you sync">
          <p>Everything in the desktop app stays local until you configure Web Sync and authenticate. Unsynced invoices, PDFs on your disk, and app settings are never transmitted.</p>
        </Section>
        <Section n="3" title="Google sign-in">
          <p>If you use Google sign-in, Google shares your name, email address and profile picture with us to create your account. We do not receive your Google password and never ask for it.</p>
        </Section>
        <Section n="4" title="How data is kept">
          <p>Passwords are hashed with scrypt and a unique salt. Sessions use signed, expiring tokens. Synced data is stored in private cloud storage under your account id. Downloads are served as attachments with strict content-type handling.</p>
        </Section>
        <Section n="5" title="What we never do">
          <p>We do not sell your data, show third-party ads, or share your ledger with anyone except the storage and email providers required to run the service. We do not track you across other sites.</p>
        </Section>
        <Section n="6" title="Your rights">
          <p>You may review your profile in the workspace, request corrections through profile approvals, stop syncing at any time, and ask for deletion of your web account and synced data by writing to the developer through the profiles linked on the <Link to="/#profile" style={{ color: 'var(--ink)', fontWeight: 600 }}>home page</Link>.</p>
        </Section>
        <Section n="7" title="Cookies and local storage">
          <p>The portal keeps your session token and profile in your browsers local storage so you stay signed in. No advertising or tracking cookies are used.</p>
        </Section>
        <Section n="8" title="Changes">
          <p>Material changes to this policy will be noted here with a new date. Continued use after changes means acceptance.</p>
        </Section>
      </div>
    </div>
  );
}
