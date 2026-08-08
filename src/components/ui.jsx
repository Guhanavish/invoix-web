import React from 'react';

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
  return (
    <div className="card stat-card">
      <span className={`accent-line ${tone}`} />
      <div className="label">
        <span className="stat-icon">{icon}</span>
        {label}
      </div>
      <h2>{value}</h2>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export function Empty({ icon, title, sub }) {
  return (
    <div className="empty">
      <div className="ico">{icon}</div>
      <h3>{title}</h3>
      <p>{sub}</p>
    </div>
  );
}

export function Loading() {
  return (
    <div className="loading-wrap">
      <span className="spinner dark" />
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
      {children && <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>{children}</div>}
    </div>
  );
}
