import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, WifiOff } from 'lucide-react';

// Tracks browser connectivity (submit buttons + banners react to this)
export function useOnline() {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

export function OfflineBar() {
  const online = useOnline();
  if (online) return null;
  return (
    <div className="offline-bar" role="alert">
      <WifiOff size={15} />
      You are offline. Reconnect before submitting — nothing will be sent until then.
    </div>
  );
}

// Client-side pager: "Showing 1–25 of 132"
export function usePager(items, perPage = 25) {
  const [page, setPage] = useState(1);
  const total = (items || []).length;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const safe = Math.min(Math.max(page, 1), pages);
  const slice = useMemo(() => (items || []).slice((safe - 1) * perPage, safe * perPage), [items, safe, perPage]);
  useEffect(() => { setPage(1); }, [total]);
  return { slice, page: safe, pages, total, setPage, perPage };
}

export function Pager({ page, pages, total, perPage, setPage, label = 'items' }) {
  if (!total || pages <= 1) {
    return (
      <div style={{ marginTop: 12, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--stone-light)' }}>
        {total} {label}
      </div>
    );
  }
  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);
  return (
    <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--stone-light)' }}>
        Showing {from}–{to} of {total} {label}
      </span>
      <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button type="button" className="btn btn-ghost btn-sm" style={{ borderRadius: 10, padding: '6px 10px' }} disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Previous page">
          <ChevronLeft size={14} /> Prev
        </button>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--stone)' }}>{page} / {pages}</span>
        <button type="button" className="btn btn-ghost btn-sm" style={{ borderRadius: 10, padding: '6px 10px' }} disabled={page >= pages} onClick={() => setPage(page + 1)} aria-label="Next page">
          Next <ChevronRight size={14} />
        </button>
      </span>
    </div>
  );
}

export function Badge({ status, children }) {
  const cls = {
    paid: 'badge-paid',
    partial: 'badge-partial',
    unpaid: 'badge-unpaid',
    overdue: 'badge-overdue',
    neutral: 'badge-neutral',
    sales: 'badge-sales',
    purchase: 'badge-purchase',
  }[status] || 'badge-neutral';
  return <span className={`badge ${cls}`}>{children || status}</span>;
}

export function StatCard({ label, value, sub, icon, tone = 'blue' }) {
  const accent = {
    blue: 'var(--ink)',
    green: 'var(--sage)',
    amber: '#b45309',
    red: 'var(--oxide)',
  }[tone] || 'var(--ink)';
  return (
    <div className="card stat-card">
      <span className="accent-line" style={{ background: accent }} />
      <div className="label">
        <span className="stat-icon" style={{ color: accent, borderColor: 'var(--line)' }}>{icon}</span>
        {label}
      </div>
      <h2>{value}</h2>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export function Empty({ icon, title, sub, action }) {
  return (
    <div className="empty">
      <div className="ico">{icon}</div>
      <h3>{title}</h3>
      <p>{sub}</p>
      {action && (
        <div style={{ marginTop: 18 }}>
          {action.to ? (
            <a href={action.to} onClick={action.onClick} className={`btn ${action.kind || 'btn-primary'} btn-sm`} style={{ borderRadius: 12 }}>{action.label}</a>
          ) : (
            <button type="button" onClick={action.onClick} className={`btn ${action.kind || 'btn-primary'} btn-sm`} style={{ borderRadius: 12 }}>{action.label}</button>
          )}
        </div>
      )}
    </div>
  );
}

// Layout-matched skeleton loaders (no layout shift when data arrives)
function Bar({ w = '100%', h = 14 }) {
  return <span className="skel" style={{ display: 'block', width: w, height: h, borderRadius: 6 }} aria-hidden="true" />;
}

export function Skeleton({ variant = 'lines', rows = 5 }) {
  if (variant === 'cards') {
    return (
      <div className="stat-grid" role="status" aria-label="Loading">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card stat-card" aria-hidden="true">
            <Bar w="45%" h={11} />
            <div style={{ marginTop: 12 }}><Bar w="70%" h={26} /></div>
            <div style={{ marginTop: 8 }}><Bar w="55%" h={11} /></div>
          </div>
        ))}
      </div>
    );
  }
  if (variant === 'table') {
    return (
      <div role="status" aria-label="Loading" style={{ padding: '6px 0' }} aria-hidden="true">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 0.8fr', gap: 16, padding: '14px 18px', borderBottom: '1px solid var(--line-faint)' }}>
            <Bar w="80%" /><Bar w="55%" /><Bar w="65%" /><Bar w="40%" />
          </div>
        ))}
      </div>
    );
  }
  if (variant === 'paper') {
    return (
      <div role="status" aria-label="Loading" aria-hidden="true">
        <Bar w="35%" h={26} />
        <div style={{ marginTop: 14 }}><Bar w="100%" h={120} /></div>
        <div style={{ marginTop: 14 }}><Bar w="100%" h={180} /></div>
        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}><Bar w={180} h={36} /></div>
      </div>
    );
  }
  return (
    <div role="status" aria-label="Loading" aria-hidden="true" style={{ display: 'grid', gap: 10 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <Bar key={i} w={i % 3 === 2 ? '65%' : '100%'} />
      ))}
    </div>
  );
}

// Dedicated server/network failure panel: human message, retry, safe exit
export function ErrorState({ icon, title = 'Something went wrong', sub, onRetry, retryLabel = 'Try again', backTo = '/app', backLabel = 'Back to workspace', network = false }) {
  return (
    <div className="card" style={{ padding: 40, textAlign: 'center', borderStyle: 'dashed', maxWidth: 560, margin: '24px auto' }} role="alert">
      <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--oxide-soft)', border: '1px solid #f0c9b8', display: 'grid', placeItems: 'center', margin: '0 auto 16px', color: 'var(--oxide-dark)' }}>{icon}</div>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 8 }}>{title}</h3>
      <p style={{ fontFamily: 'var(--font-editorial)', fontStyle: 'italic', color: 'var(--stone)', lineHeight: 1.6 }}>
        {sub || (network
          ? "Can't reach the server. Check your internet connection, then try again."
          : 'Our side hiccuped while pressing this page. Nothing you did caused it.')}
      </p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' }}>
        {onRetry && <button type="button" className="btn btn-primary btn-sm" style={{ borderRadius: 12 }} onClick={onRetry}>{retryLabel}</button>}
        <a href={backTo} className="btn btn-ghost btn-sm" style={{ borderRadius: 12 }}>{backLabel}</a>
      </div>
    </div>
  );
}

// Field wrapper with helper hint + inline error (used by forms)
export function FieldError({ error, hint }) {
  if (error) return <div className="field-err" role="alert">{error}</div>;
  if (hint) return <div className="hint">{hint}</div>;
  return null;
}

export function Loading() {
  return (
    <div className="loading-wrap">
      <span className="spinner dark" />
      <span style={{ marginTop: 12, fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--stone-light)' }}>Loading ledger…</span>
    </div>
  );
}

export function PageHead({ title, sub, children }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {children && <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>{children}</div>}
    </div>
  );
}
