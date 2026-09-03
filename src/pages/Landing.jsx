import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, CheckCircle2, Download, Receipt, ShieldCheck, BarChart3,
  BookOpen, FileText, MonitorDown, RefreshCw, Sparkles, Lock, ArrowUpRight, Quote,
  Package, FolderOpen, AlertCircle, HardDrive, Info, ExternalLink,
  Github, Linkedin, Instagram,
} from 'lucide-react';
import { api, fmtBytes } from '../api';

const ZIP_NAME = 'Invoix-v1.0.0.zip';
const EXE_NAME = 'Invoix Setup 1.0.0.exe';

export default function Landing() {
  const [zipFile, setZipFile] = useState(null);
  const [exeFile, setExeFile] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    api.get('/download/installer/info')
      .then((res) => {
        const zip = res.files.find((f) => f.name.toLowerCase().endsWith('.zip')) || res.files.find((f) => !f.isExe);
        const exe = res.files.find((f) => f.isExe);
        if (zip) setZipFile(zip);
        if (exe) setExeFile(exe);
        // fallback if API uses different naming
        if (!zip && res.files[0]) setZipFile(res.files.find((f) => f.name === ZIP_NAME) || res.files[0]);
      })
      .catch(() => {});
  }, []);

  const zipUrl = zipFile ? `/api/download/installer/${encodeURIComponent(zipFile.name)}` : `/api/download/installer/${ZIP_NAME}`;
  const exeUrl = exeFile ? `/api/download/installer/${encodeURIComponent(exeFile.name)}` : `/api/download/installer/${EXE_NAME}`;

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
          <a href="#profile">Profile</a>
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
            <div className="hero-cta" style={{ flexWrap: 'wrap' }}>
              <a className="btn btn-oxide btn-lg" href={zipUrl} download={zipFile ? zipFile.name : ZIP_NAME}>
                <Package size={18} />
                Download portable
              </a>
              <Link className="btn btn-ghost btn-lg" to="/login">
                Open workspace
                <ArrowRight size={16} />
              </Link>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 13, color: '#9a9590', fontFamily: 'var(--font-mono)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><HardDrive size={13} /> ZIP · {zipFile ? fmtBytes(zipFile.size) : '141 MB'} · Windows x64 · No install</span>
              <span style={{ opacity: 0.5 }}>·</span>
              <a href={exeUrl} download={exeFile ? exeFile.name : EXE_NAME} style={{ color: '#9a9590', textDecoration: 'underline', textUnderlineOffset: 3 }}>
                installer exe {exeFile ? `· ${fmtBytes(exeFile.size)}` : ''}
              </a>
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: '#9a9590', display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={12} /> Recommended: ZIP avoids the “Unknown publisher / virus” warning. All packages included — no Node required.
            </div>
            <div className="hero-stats">
              <div className="hero-stat">
                <div className="num">{zipFile ? fmtBytes(zipFile.size) : '141 MB'}</div>
                <div className="lbl">Portable · ZIP</div>
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
            <div style={{ marginTop: 20, padding: '14px 16px', background: '#fff', border: '1px solid var(--line)', borderRadius: 12, display: 'inline-flex', flexDirection: 'column', gap: 8, boxShadow: 'var(--shadow-soft)' }}>
              <div style={{ fontWeight: 800, fontSize: 18, fontFamily: 'var(--font-display)', color: 'var(--ink)', letterSpacing: '-0.02em' }}>Built By <span style={{ color: 'var(--oxide)' }}>Guhanavish</span></div>
              <div style={{ fontSize: 12, color: 'var(--stone)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>Developer · Designer · Invoix Atelier</div>
              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <a href="https://github.com/Guhanavish" target="_blank" rel="noopener noreferrer" title="GitHub" aria-label="GitHub" style={{ width: 36, height: 36, borderRadius: 999, background: 'var(--ink)', border: '1px solid var(--ink)', display: 'grid', placeItems: 'center', color: '#fff' }}>
                  <Github size={18} />
                </a>
                <a href="https://www.linkedin.com/in/guhanavish-ss-12a328256" target="_blank" rel="noopener noreferrer" title="LinkedIn" aria-label="LinkedIn" style={{ width: 36, height: 36, borderRadius: 999, background: '#0a66c2', border: '1px solid #0a66c2', display: 'grid', placeItems: 'center', color: '#fff' }}>
                  <Linkedin size={18} />
                </a>
                <a href="https://www.instagram.com/guha._.1416/?__pwa=1" target="_blank" rel="noopener noreferrer" title="Instagram" aria-label="Instagram" style={{ width: 36, height: 36, borderRadius: 999, background: 'linear-gradient(135deg,#feda75,#fa7e1e,#d62976,#962fbf,#4f5bd5)', border: '1px solid #e5e7eb', display: 'grid', placeItems: 'center', color: '#fff' }}>
                  <Instagram size={18} />
                </a>
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

      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '40px', scrollMarginTop: 80 }} id="profile">
        <div style={{ border: '1px solid var(--line)', borderRadius: 16, background: '#fff', padding: 28, display: 'grid', gridTemplateColumns: '96px 1fr auto', gap: 20, alignItems: 'center', boxShadow: 'var(--shadow-card)' }}>
          <div style={{ width: 96, height: 96, borderRadius: 16, background: 'linear-gradient(135deg,#0f172a,#334155)', display: 'grid', placeItems: 'center', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 32, letterSpacing: '-0.03em' }}>G</div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'var(--ink)' }}>Guhanavish</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'var(--paper-2)', border: '1px solid var(--line)', padding: '4px 8px', borderRadius: 999, color: 'var(--stone)' }}>Built By</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', background: '#fef3c7', border: '1px solid #fde68a', padding: '4px 8px', borderRadius: 999, color: '#92400e' }}>Invoix Atelier</span>
            </div>
            <div style={{ marginTop: 8, fontSize: 14, lineHeight: 1.6, color: 'var(--stone)' }}>
              Builder of Invoix — heritage-grade GST billing for Windows + live web mirror. Crafting offline-first ledger, typeset invoices, and GSTR-ready workflows. Open to collaborations.
            </div>
            <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--stone-light)' }}>
              <span>Ledger · Billing · GST</span><span>·</span><span>Electron · React · SQLite</span><span>·</span><span>Surat · India</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'stretch', minWidth: 220 }}>
            <a href="https://github.com/Guhanavish" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: 'var(--ink)', color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: 13 }}>
              <Github size={16} /> GitHub · Guhanavish <ExternalLink size={12} style={{ marginLeft: 'auto', opacity: 0.7 }} />
            </a>
            <a href="https://www.linkedin.com/in/guhanavish-ss-12a328256" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: '#0a66c2', color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: 13 }}>
              <Linkedin size={16} /> LinkedIn · Guhanavish <ExternalLink size={12} style={{ marginLeft: 'auto', opacity: 0.7 }} />
            </a>
            <a href="https://www.instagram.com/guha._.1416/?__pwa=1" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: 'linear-gradient(135deg,#feda75,#fa7e1e,#d62976,#962fbf,#4f5bd5)', color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: 13 }}>
              <Instagram size={16} /> Instagram · guha._.1416 <ExternalLink size={12} style={{ marginLeft: 'auto', opacity: 0.7 }} />
            </a>
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
              ledger, PDFs and live web sync. Portable ZIP is recommended to avoid the Windows “Unknown publisher” warning.
            </p>
            <div className="dl-meta">
              <div className="m">Version<b>v1.0.0</b></div>
              <div className="m">Platform<b>Windows x64</b></div>
              <div className="m">Primary<b>ZIP portable</b></div>
              <div className="m">Also<b>EXE installer</b></div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
              <a className="btn btn-oxide btn-lg" href={zipUrl} download={zipFile ? zipFile.name : ZIP_NAME} style={{ justifyContent: 'center' }}>
                <Package size={18} />
                Download portable — ZIP {zipFile ? `· ${fmtBytes(zipFile.size)}` : ''}
              </a>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <a href={exeUrl} download={exeFile ? exeFile.name : EXE_NAME} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#fdfcf8', fontSize: 13, borderBottom: '1px solid rgba(253,252,248,0.25)', paddingBottom: 2 }}>
                  <Download size={14} /> Or download installer (EXE {exeFile ? `· ${fmtBytes(exeFile.size)}` : ''})
                </a>
                <button onClick={() => setShowHelp((v) => !v)} style={{ background: 'rgba(253,252,248,0.1)', border: '1px solid rgba(253,252,248,0.2)', color: '#fdfcf8', borderRadius: 999, padding: '6px 12px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <Info size={12} /> {showHelp ? 'Hide help' : 'Why does Windows warn?'}
                </button>
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#9a9590', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                <Lock size={12} /> Free for your ledger · Works offline · All packages bundled
              </span>
            </div>

            {showHelp && (
              <div style={{ marginTop: 16, background: 'rgba(253,252,248,0.06)', border: '1px solid rgba(253,252,248,0.12)', borderRadius: 12, padding: 16 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', color: '#fdfcf8' }}>
                  <AlertCircle size={16} style={{ marginTop: 2, color: '#f59e0b', flexShrink: 0 }} />
                  <div style={{ fontSize: 13, lineHeight: 1.6, color: '#e8e6e1' }}>
                    <div style={{ fontWeight: 700, marginBottom: 6, color: '#fdfcf8' }}>The “virus / Unknown publisher” warning is a false positive.</div>
                    The app is not signed with a paid Microsoft certificate yet (requires a registered business). Windows shows this for every new unsigned app, even when clean.
                    <div style={{ marginTop: 10, fontWeight: 600 }}>How to run the portable ZIP:</div>
                    <ol style={{ margin: '6px 0 0 18px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <li>Download the ZIP → Right-click → <b>Extract All…</b> → choose Desktop or Documents.</li>
                      <li>Open the extracted <b>Invoix</b> folder → double-click <b>Invoix.exe</b>.</li>
                      <li>If SmartScreen appears: click <b>More info</b> → <b>Run anyway</b>. This is Windows confirming you trust the file.</li>
                    </ol>
                    <div style={{ marginTop: 10 }}>The ZIP already contains every package (Electron, database, PDF engine) — no Node.js install needed. Next time, just double-click <b>Invoix.exe</b> again.</div>
                    <div style={{ marginTop: 8, fontSize: 12, color: '#9a9590' }}>Installer EXE does the same but copies to Program Files and creates a Start Menu entry. Same warning applies.</div>
                  </div>
                </div>
              </div>
            )}
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
            <div style={{ marginTop: 16, background: 'rgba(253,252,248,0.06)', border: '1px solid rgba(253,252,248,0.1)', borderRadius: 10, padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fdfcf8', fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
                <FolderOpen size={14} /> What’s inside the ZIP?
              </div>
              <div style={{ fontSize: 12, lineHeight: 1.6, color: '#c8c5c0' }}>
                All 240 files, same as the installer — <b style={{ color: '#fdfcf8' }}>Invoix.exe</b>, <b style={{ color: '#fdfcf8' }}>resources/</b> (app code), <b style={{ color: '#fdfcf8' }}>locales/</b>. Just extracted. No packages to install, works on a clean Windows PC offline.
              </div>
            </div>
            <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 16, color: '#fdfcf8', fontWeight: 600, fontSize: 14, borderBottom: '1px solid rgba(253,252,248,0.2)', paddingBottom: 2 }}>
              Already have an account? Sign in <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 40px 40px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 20, background: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, marginBottom: 8 }}><HardDrive size={16} /> Portable ZIP — how to update</div>
          <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--stone)' }}>Download the new ZIP and extract over the old folder, or keep versioned folders (<code style={{ background: 'var(--paper-2)', padding: '1px 6px', borderRadius: 4 }}>Invoix-v1.0.0</code>). Your data lives in <code style={{ background: 'var(--paper-2)', padding: '1px 6px', borderRadius: 4 }}>%AppData%\invoix-app\</code> so it survives re-extracts.</div>
        </div>
        <div style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 20, background: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, marginBottom: 8 }}><ShieldCheck size={16} /> Is it safe? <span style={{ fontWeight: 400, color: 'var(--stone)', fontSize: 12 }}>(submitted to Microsoft)</span></div>
          <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--stone)' }}>We submit every release to Microsoft Defender analysis for review. The warning fades as more users run it. ZIP is preferred exactly because it avoids the installer reputation gate.</div>
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
