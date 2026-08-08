const TOKEN_KEY = 'eip_token';
const USER_KEY = 'eip_user';

export const api = {
  get token() {
    return localStorage.getItem(TOKEN_KEY);
  },
  get user() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch {
      return null;
    }
  },
  setSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
  async request(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    const res = await fetch(`/api${path}`, { ...options, headers });
    let body = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    if (!res.ok) {
      const err = new Error((body && body.error) || `Request failed (${res.status})`);
      err.status = res.status;
      throw err;
    }
    return body;
  },
  get(path) {
    return this.request(path);
  },
  post(path, data) {
    return this.request(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },
  upload(path, file, field = 'db') {
    const fd = new FormData();
    fd.append(field, file);
    return this.request(path, { method: 'POST', body: fd });
  },
};

export const fmtMoney = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(n) || 0);

export const fmtDate = (d) => {
  if (!d) return '—';
  const date = new Date(String(d).slice(0, 10));
  if (isNaN(date)) return String(d);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const fmtDateTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return String(iso);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const fmtBytes = (n) => {
  if (n == null) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let v = Number(n);
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 100 ? 0 : 1)} ${units[i]}`;
};

export const invoiceStatus = (inv) => {
  const total = Number(inv.grand_total) || 0;
  const paid = Number(inv.paid_amount) || 0;
  if (paid >= total && total > 0) return { key: 'paid', label: 'Paid' };
  if (paid > 0) return { key: 'partial', label: 'Partial' };
  if (inv.due_date && inv.due_date < new Date().toISOString().slice(0, 10) && total > 0)
    return { key: 'overdue', label: 'Overdue' };
  return { key: 'unpaid', label: 'Unpaid' };
};
