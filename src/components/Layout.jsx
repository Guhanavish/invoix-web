import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Users, Package, BookOpen, BarChart3,
  Download, LogOut, Receipt, ShieldCheck, RefreshCw,
} from 'lucide-react';
import { api, fmtDateTime } from '../api';

const NAV = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/invoices', label: 'Invoices', icon: FileText },
  { to: '/app/customers', label: 'Customers', icon: Users },
  { to: '/app/products', label: 'Products', icon: Package },
  { to: '/app/ledger', label: 'Ledger', icon: BookOpen },
  { to: '/app/reports', label: 'Reports', icon: BarChart3 },
];

export default function Layout() {
  const navigate = useNavigate();
  const [sync, setSync] = useState({ loading: true, synced: null, lastSync: null });

  const loadSync = async () => {
    try {
      const res = await api.get('/sync/status');
      setSync({ loading: false, synced: res.synced, lastSync: res.lastSync });
    } catch {
      setSync({ loading: false, synced: false, lastSync: null });
    }
  };

  useEffect(() => {
    loadSync();
  }, []);

  const logout = () => {
    api.clearSession();
    navigate('/login');
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Receipt size={18} /></div>
          <div>
            <div className="brand-name">Invoix</div>
            <div className="brand-sub">Web Portal</div>
          </div>
        </div>

        <div className="nav-sec">Workspace</div>
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Icon size={17} />
            {label}
          </NavLink>
        ))}

        <div className="nav-sec">Resources</div>
        <a className="nav-link" href="/api/download/installer/Invoix%20Setup%201.0.0.exe" download>
          <Download size={17} />
          Download Setup
        </a>

        <div className="sidebar-foot">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 4px' }}>
            <div
              style={{
                width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#1d4ed8,#3ba4f2)',
                display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0,
              }}
            >
              {(api.user?.userId || 'U').slice(0, 1).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {api.user?.userId || 'user'}
              </div>
              <div style={{ fontSize: 11, color: '#6f84a5' }}>Signed in</div>
            </div>
          </div>
          <button className="btn btn-ghost-light btn-sm" style={{ width: '100%', marginTop: 8 }} onClick={logout}>
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={14} />
            Secure workspace
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className={`sync-pill ${sync.synced ? 'on' : sync.loading ? '' : 'off'}`} title="Last data sync from your desktop app">
              <span className="dot" />
              {sync.loading ? 'Checking…' : sync.synced ? `Synced ${fmtDateTime(sync.lastSync)}` : 'No data synced'}
            </div>
            <button className="icon-btn" title="Refresh sync status" onClick={loadSync}>
              <RefreshCw size={14} />
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
