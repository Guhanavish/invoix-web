import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Users, Package, BookOpen, BarChart3,
  Download, LogOut, Receipt, Inbox, FilePlus2,
} from 'lucide-react';
import { api, fmtDateTime } from '../api';
import { useSyncStatus, forceSyncCheck } from '../useAutoSync';

const NAV = [
  { to: '/app', label: 'Atelier', icon: LayoutDashboard, end: true },
  { to: '/app/invoices', label: 'Invoices', icon: FileText, end: true },
  { to: '/app/invoices/new', label: 'New Bill', icon: FilePlus2, end: true },
  { to: '/app/pending', label: 'Pending', icon: Inbox },
  { to: '/app/customers', label: 'Customers', icon: Users },
  { to: '/app/products', label: 'Products', icon: Package },
  { to: '/app/ledger', label: 'Ledger', icon: BookOpen },
  { to: '/app/reports', label: 'Reports', icon: BarChart3 },
];

export default function Layout() {
  const navigate = useNavigate();
  const sync = useSyncStatus();

  const logout = () => {
    api.clearSession();
    navigate('/login');
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Receipt size={19} /></div>
          <div>
            <div className="brand-name">Invoix <em>web</em></div>
            <div className="brand-sub">Ledger — Est. 2024</div>
          </div>
        </div>

        <div className="nav-sec">Workspace</div>
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Icon size={16} />
            {label}
          </NavLink>
        ))}

        <div className="nav-sec">Archive</div>
        <a className="nav-link" href="/api/download/installer/Invoix%20Setup%201.0.0.exe" download>
          <Download size={16} />
          Download app
        </a>

        <div className="sidebar-foot">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px' }}>
            <div
              style={{
                width: 36, height: 36, borderRadius: 10, background: 'var(--oxide)',
                display: 'grid', placeItems: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, flexShrink: 0, color: '#fff',
              }}
            >
              {(api.user?.userId || 'U').slice(0, 1).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: '#fdfcf8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {api.user?.userId || '—'}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9a9590' }}>Signed in</div>
            </div>
          </div>
          <button className="btn btn-ghost-light btn-sm" style={{ width: '100%', marginTop: 10, borderRadius: 10 }} onClick={logout}>
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: sync.synced ? 'var(--sage)' : '#d4c4b0', flexShrink: 0 }} />
            <span className="label" style={{ letterSpacing: '0.14em' }}>
              {sync.synced ? 'Live from desktop' : 'Awaiting sync'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className={`sync-pill ${sync.synced ? 'on' : sync.loading ? '' : 'off'}`} title="Last data sync from your desktop app">
              <span className="dot" />
              {sync.loading ? 'Checking…' : sync.synced ? `Synced ${fmtDateTime(sync.lastSync)}` : 'No data yet'}
            </div>
            <button className="icon-btn" title="Refresh" onClick={forceSyncCheck} aria-label="Refresh sync">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 12a9 9 0 1 1-9-9c2.5 0 4.7 1 6.3 2.7L21 8V3h-5l2.3 2.3A7 7 0 1 0 21 12z" /></svg>
            </button>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
