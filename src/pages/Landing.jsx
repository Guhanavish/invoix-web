import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, CheckCircle2, Download, Receipt, ShieldCheck, BarChart3,
  BookOpen, FileText, MonitorDown, RefreshCw, Sparkles, Lock, ArrowUpRight, Quote,
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
    <div style={{ background: 'var(--paper)' }}>
      <nav className={`land-nav ${scrolled ? 'scrolled' : 'dark'}`}>
        <div className="brand" style={{ paddingBottom: 0, border: 'none', margin: 0 }}>
          <div className="brand-mark"><Receipt size={18} /></div>
          <div>
            <div className="brand-name" style={{ color: scrolled ? 'var(--ink)' : '#fdfcf8' }}>Invoix</div>
            <div className="brand-sub" style={{ color: scrolled ? 'var(--stone)' : '#9a9590' }}>Ledger · Billing · GST</div>
          </div>
        </div>
        <div className="land-links">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#download">Download</a>
          <Link to="/login" className="btn btn-primary btn-sm">Sign in</Link>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-inner">
          <div>
            <span className="eyebrow">Heritage-grade GST billing</span>
            <h1>
              Your business,<br />
              <span className="grad">bound in paper.</span>
              <span className="line2">live on the web.</span>
            </h1>
            <p className="lead">
              Every invoice, customer and ledger entry you set in the Invoix desktop atelier
              appears here — typeset, balanced, and ready to present. No exports. No drift.
            </p>
            <div className="hero-cta">
              <a className="btn btn-oxide btn-lg" href={downloadUrl} download={installer ? installer.name : INSTALLER_NAME}>
                <Download size={18} />
                Download app
              </a>
              <Link className="btn btn-ghost btn-lg" to="/login">
                Open workspace
                <ArrowRight size={16} />
              </Link>
            </div>
            <div className="hero-stats">
              <div className="hero-stat">
                <div className="num">{installer ? fmtBytes(installer.size) : '130 MB'}</div>
                <div className="lbl">Windows · x64</div>
              </div>
              <div className="hero-stat">
                <div className="num">Offline</div>
                <div className="lbl">First</div>
              </div>
              <div className="hero-stat">
                <div className="num">Live</div>
                <div className="lbl">Web mirror</div>
              </div>
              <div className="hero-stat">
                <div className="num">GST</div>
                <div className="lbl">Compliant</div>
              </div>
            </div>
          </div>

          <div className="mock-wrap">
            <div className="mock">
              <div className="mock-top">
                <div className="mock-title">TAX INVOICE <span>· INV-2026/184</span></div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', color: '#9a9590', border: '1px solid rgba(253,252,248,0.15)', padding: '4px 8px', borderRadius: 999 }}>PAID</span>
              </div>
              <div className="mock-row"><span className="k">Bill to</span><span className="v">Mehta Fabrics · Surat</span></div>
              <div className="mock-row"><span className="k">GSTIN</span><span className="v">24AAACM1234M1Z9</span></div>
              <div className="mock-row"><span className="k">HSN</span><span className="v">5208 · Cotton</span></div>
              <div className="mock-row"><span className="k">Qty × Rate</span><span className="v">120 × ₹ 850</span></div>
              <div className="mock-row"><span className="k">Taxable</span><span className="v">₹ 1,02,000</span></div>
              <div className="mock-row"><span className="k">CGST 9% / SGST 9%</span><span className="v">₹ 9,180 / ₹ 9,180</span></div>
              <div className="mock-total"><span className="k">Grand total</span><span className="v">₹ 1,20,360</span></div>
            </div>
            <div className="float-chip chip-1">
              <span className="ico" style={{ color: 'var(--sage)' }}><CheckCircle2 size={16} /></span>
              <div><div>Synced to web</div><small>2 min ago · Encrypted</small></div>
            </div>
            <div className="float-chip chip-2">
              <span className="ico" style={{ color: 'var(--oxide)' }}><BarChart3 size={16} /></span>
              <div><div>GSTR-1 ready</div><small>B2B · 12 invoices</small></div>
            </div>
          </div>
        </div>
      </section>

      <section className="sec" id="features">
        <div className="sec-head">
          <span className="eyebrow">Everything in one ledger</span>
          <h2>Built for serious <i>billing.</i></h2>
          <p>
            The desktop composes — GST invoices, PDFs and ledger. The web preserves — a live, read-only
            folio you can open from anywhere.
          </p>
        </div>
        <div className="feat-grid">
          {[
            { icon: FileText, n: '01', title: 'GST Tax Invoices', desc: 'CGST / SGST / IGST auto-computed, HSN-aware, with print-ready PDFs.' },
            { icon: BarChart3, n: '02', title: 'GSTR-1 & 3B', desc: 'B2B/B2C splits, outward & inward tax, net liability — export CSV.' },
            { icon: BookOpen, n: '03', title: 'Customer Ledger', desc: 'Running balances, debit/credit, aging buckets by customer.' },
            { icon: ShieldCheck, n: '04', title: 'Private workspace', desc: 'Gated by your user id. Only you see the figures.' },
            { icon: MonitorDown, n: '05', title: 'One download', desc: 'Windows setup hosted here — install in minutes, work offline.' },
            { icon: RefreshCw, n: '06', title: 'Automatic sync', desc: 'The app pushes its SQLite ledger on every save. No CSV.' },
          ].map(({ icon: Icon, n, title, desc }) => (
            <div className="card feat-card" key={title}>
              <div className="feat-num">{n} — FEATURE</div>
              <div className="feat-ico"><Icon size={20} /></div>
              <h3>{title}</h3>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="sec" id="how" style={{ background: '#fff', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
        <div className="sec-head">
          <span className="eyebrow">Three impressions</span>
          <h2>How the <i>press</i> works.</h2>
          <p>No exports, no drift. Ink once in the app, read everywhere.</p>
        </div>
        <div className="steps">
          <div className="step">
            <div className="step-dot">01</div>
            <h3>Set type in the app</h3>
            <p>Download the Windows atelier, compose invoices, products and customers. It works entirely offline.</p>
          </div>
          <div className="step">
            <div className="step-dot">02</div>
            <h3>Lock the folio</h3>
            <p>In Settings → Web Sync, enter your portal user id and password. One impression, done.</p>
          </div>
          <div className="step">
            <div className="step-dot">03</div>
            <h3>Read anywhere</h3>
            <p>Every entry is pressed to the web. Sign in here to view dashboards, reports and the full ledger.</p>
          </div>
        </div>
      </section>

      {/* Quote */}
      <section style={{ padding: '56px 40px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'center', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: 32, background: 'var(--paper-2)' }}>
          <div>
            <Quote size={18} style={{ color: 'var(--oxide)', marginBottom: 12 }} />
            <p style={{ fontFamily: 'var(--font-editorial)', fontStyle: 'italic', fontSize: 20, lineHeight: 1.5, color: 'var(--ink)' }}>
              "I set invoices in the shop and check the ledger from home. The portal is my business, kept."
            </p>
            <div style={{ marginTop: 12, fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--stone)' }}>— Merchant, Surat · uses Invoix daily</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <span className="badge badge-neutral">Offline-first</span>
            <span className="badge badge-neutral">Encrypted</span>
          </div>
        </div>
      </section>

      <section className="download-sec" id="download">
        <div className="download-card">
          <div>
            <span className="eyebrow light">Atelier download</span>
            <h2>Take the press <i style={{ fontWeight: 300 }}>home.</i></h2>
            <p>
              The complete GST billing atelier for Windows — invoices, GSTR reports,
              ledger, PDFs and live web sync.
            </p>
            <div className="dl-meta">
              <div className="m">Version<b>v1.0.0</b></div>
              <div className="m">Size<b>{installer ? fmtBytes(installer.size) : '130 MB'}</b></div>
              <div className="m">Platform<b>Windows x64</b></div>
              <div className="m">Format<b>{installer?.isExe !== false ? 'EXE installer' : 'ZIP'}</b></div>
            </div>
            <a className="btn btn-oxide btn-lg" href={downloadUrl} download={installer ? installer.name : INSTALLER_NAME}>
              <Download size={18} />
              Download app
            </a>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 16, color: '#9a9590', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
              <Lock size={13} /> Free for your ledger
            </span>
          </div>
          <div>
            <div className="dl-list">
              {[
                'GST invoices with CGST / SGST / IGST, auto-balanced',
                'GSTR-1 and GSTR-3B, export-ready CSV',
                'Customer ledger with running balances',
                'PDF printing and Excel import / export',
                'Live sync — desktop to web, no hands',
              ].map((t) => (
                <div className="dl-item" key={t}>
                  <CheckCircle2 size={16} />
                  {t}
                </div>
              ))}
            </div>
            <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 20, color: '#fdfcf8', fontWeight: 600, fontSize: 14, borderBottom: '1px solid rgba(253,252,248,0.2)', paddingBottom: 2 }}>
              Already have an account? Sign in <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      <footer className="land-foot">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="brand-mark" style={{ width: 28, height: 28, borderRadius: 8 }}><Receipt size={14} /></div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--ink)' }}>Invoix</span>
          <span style={{ color: 'var(--line-strong)' }}>—</span>
          <span>GST billing · Desktop + Web</span>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <Link to="/login" style={{ color: 'var(--ink)', fontWeight: 600, borderBottom: '1px solid var(--line-strong)' }}>Sign in →</Link>
        </div>
      </footer>
    </div>
  );
}
