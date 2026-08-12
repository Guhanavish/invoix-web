import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, CheckCircle2, Download, Receipt, ShieldCheck, BarChart3,
  BookOpen, FileText, MonitorDown, RefreshCw, Sparkles, Lock,
} from 'lucide-react';
import { api, fmtBytes } from '../api';

const INSTALLER_NAME = 'Invoix Setup 1.0.0.exe';

export default function Landing() {
  const [installer, setInstaller] = useState(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    api.get('/download/installer/info')
      .then((res) => {
        const exe = res.files.find((f) => f.isExe);
        setInstaller(exe || res.files.find((f) => f.name === INSTALLER_NAME) || res.files[0]);
      })
      .catch(() => {});
  }, []);

  const downloadUrl = installer
    ? `/api/download/installer/${encodeURIComponent(installer.name)}`
    : `/api/download/installer/${INSTALLER_NAME}`;

  return (
    <div>
      <nav className={`land-nav dark ${scrolled ? 'scrolled' : ''}`} style={scrolled ? { background: '#ffffff' } : {}}>
        <div className="brand" style={{ paddingBottom: 0 }}>
          <div className="brand-mark"><Receipt size={18} /></div>
          <div>
            <div className="brand-name" style={{ color: scrolled ? 'var(--ink)' : '#fff' }}>Invoix</div>
            <div className="brand-sub" style={{ color: scrolled ? 'var(--muted)' : '#6f84a5' }}>Billing · GST · Sync</div>
          </div>
        </div>
        <div className="land-links" style={scrolled ? {} : {}}>
          <a href="#features" style={{ color: scrolled ? 'var(--muted)' : '#aebdd2' }}>Features</a>
          <a href="#how" style={{ color: scrolled ? 'var(--muted)' : '#aebdd2' }}>How it works</a>
          <a href="#download" style={{ color: scrolled ? 'var(--muted)' : '#aebdd2' }}>Download</a>
          <Link to="/login" className="btn btn-primary btn-sm">Sign in</Link>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-inner">
          <div>
            <span className="eyebrow light">GST-Compliant Business Software</span>
            <h1>
              Your business data,<br />
              <span className="grad">live on the web.</span>
            </h1>
            <p className="lead">
              Every invoice, customer and ledger entry you create in the Invoix desktop app
              syncs to this portal automatically. View reports from anywhere, securely.
            </p>
            <div className="hero-cta">
              <a className="btn btn-primary btn-lg" href={downloadUrl} download={installer ? installer.name : INSTALLER_NAME}>
                <Download size={18} />
                Download Setup
              </a>
              <Link className="btn btn-ghost-light btn-lg" to="/login">
                Sign in to your workspace
                <ArrowRight size={17} />
              </Link>
            </div>
            <div className="hero-stats">
              <div className="hero-stat">
                <div className="num">{installer ? fmtBytes(installer.size) : '136 MB'}</div>
                <div className="lbl">Installer</div>
              </div>
              <div className="hero-stat">
                <div className="num">100%</div>
                <div className="lbl">Offline-first</div>
              </div>
              <div className="hero-stat">
                <div className="num">24/7</div>
                <div className="lbl">Web access</div>
              </div>
              <div className="hero-stat">
                <div className="num">SSL</div>
                <div className="lbl">Encrypted</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="sec" id="features">
        <div className="sec-head">
          <span className="eyebrow">Everything in one place</span>
          <h2>Built for serious GST billing.</h2>
          <p>
            The desktop app handles creation — GST tax invoices, PDFs and ledger.
            The web portal gives you a live, read-only mirror of it all.
          </p>
        </div>
        <div className="feat-grid">
          {[
            { icon: FileText, title: 'GST Tax Invoices', desc: 'CGST / SGST / IGST computed automatically, with PDF export built in.' },
            { icon: BarChart3, title: 'GSTR-1 & GSTR-3B', desc: 'Export-ready summaries with B2B / B2C splits and net tax liability at a glance.' },
            { icon: BookOpen, title: 'Customer Ledger', desc: 'Running balances per customer with debit, credit and aging buckets.' },
            { icon: ShieldCheck, title: 'Protected by login', desc: 'Your workspace is gated by a user id and password. Only you see the data.' },
            { icon: MonitorDown, title: 'One-click install', desc: 'The Windows setup is hosted right here — download and install in minutes.' },
            { icon: RefreshCw, title: 'Automatic sync', desc: 'The desktop app pushes its database to this portal on every save.' },
            { icon: Sparkles, title: 'Clean, focused UI', desc: 'A Swiss-inspired design with data-first typography. No clutter, no noise.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div className="card feat-card" key={title}>
              <div className="feat-num">FEATURE</div>
              <div className="feat-ico"><Icon size={19} /></div>
              <h3>{title}</h3>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="sec" id="how" style={{ background: 'var(--surface)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
        <div className="sec-head">
          <span className="eyebrow">Three steps</span>
          <h2>How the sync works.</h2>
          <p>No manual exports, no CSV fiddling. The app and the web stay in lockstep.</p>
        </div>
        <div className="steps">
          <div className="step">
            <div className="step-dot">01</div>
            <h3>Install the desktop app</h3>
            <p>Download the Windows setup below, install and start creating invoices, products and customers.</p>
          </div>
          <div className="step">
            <div className="step-dot">02</div>
            <h3>Connect it to this portal</h3>
            <p>In the app's Settings → Web Sync, enter your user id and password. One time, done.</p>
          </div>
          <div className="step">
            <div className="step-dot">03</div>
            <h3>Watch it appear on the web</h3>
            <p>Every entry syncs automatically. Sign in here anytime to view dashboards, reports and records.</p>
          </div>
        </div>
      </section>

      <section className="sec" id="download" style={{ paddingBottom: 90 }}>
        <div className="download-card">
          <div>
            <span className="eyebrow light">Get started</span>
            <h2>Download Invoix setup.</h2>
            <p>
              The complete GST billing suite for Windows — tax invoices, GSTR reports,
              customer ledger, PDF generation and automatic web sync.
            </p>
            <div className="dl-meta">
              <div className="m">Version<b>v1.0.0</b></div>
              <div className="m">Size<b>{installer ? fmtBytes(installer.size) : '~136 MB'}</b></div>
              <div className="m">Platform<b>Windows x64</b></div>
              <div className="m">Format<b>{installer?.isExe !== false ? 'Installer (EXE)' : 'Portable (ZIP)'}</b></div>
            </div>
            <a className="btn btn-primary btn-lg" href={downloadUrl} download={installer ? installer.name : INSTALLER_NAME}>
              <Download size={18} />
              Download Setup
            </a>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 16, color: '#8fa3c0', fontSize: 13 }}>
              <Lock size={13} /> Free for your business
            </span>
          </div>
          <div>
            <div className="dl-list">
              {[
                'GST tax invoices with automatic CGST / SGST / IGST',
                'GSTR-1 and GSTR-3B export-ready reports',
                'Customer ledger with running balances',
                'PDF invoice printing and Excel import / export',
                'Automatic two-way sync with the web portal',
              ].map((t) => (
                <div className="dl-item" key={t}>
                  <CheckCircle2 size={16} />
                  {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="land-foot">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="brand-mark" style={{ width: 26, height: 26, borderRadius: 7 }}><Receipt size={14} /></div>
          <b style={{ color: 'var(--ink)' }}>Invoix</b>
        </div>
        <div>GST-compliant billing · Desktop + Web</div>
        <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Sign in →</Link>
      </footer>
    </div>
  );
}
