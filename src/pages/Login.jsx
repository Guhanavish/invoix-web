import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Receipt, LogIn, ShieldCheck } from 'lucide-react';
import { api } from '../api';
import GoogleButton from '../components/GoogleButton';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  const onGoogleSuccess = (res) => {
    const from = location.state?.from?.pathname?.startsWith('/app') ? location.state.from.pathname : '/app';
    navigate(from, { replace: true });
  };
  const onGoogleError = (err) => {
    setGoogleBusy(false);
    setError(err.message || 'Google sign-in failed');
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await api.post('/auth/login', { userId, password });
      api.setSession(res.token, res.user);
      const from = location.state?.from?.pathname?.startsWith('/app') ? location.state.from.pathname : '/app';
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <div className="auth-brand">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="brand" style={{ paddingBottom: 0 }}>
            <div className="brand-mark"><Receipt size={18} /></div>
            <div>
              <div className="brand-name">Invoix</div>
              <div className="brand-sub">Billing · GST · E-Way</div>
            </div>
          </div>
        </div>
        <div className="inner">
          <span className="eyebrow light">Your business, mirrored</span>
          <h2>Every entry from your desktop app.<br />Right here on the web.</h2>
          <p>
            Sign in with the user id and password you created — the same credentials you use
            to connect the desktop app in Settings → Web Sync.
          </p>
          <div className="auth-quote">
            <div className="mini-av"><ShieldCheck size={17} /></div>
            <blockquote>
              “I invoice from the office and check reports from home. The web portal
              is my business in my pocket.”
            </blockquote>
          </div>
        </div>
      </div>

      <div className="auth-form-side">
        <div className="auth-box">
          <span className="eyebrow">Workspace access</span>
          <h1>Sign in</h1>
          <p>Enter your user id and password to view synced business data.</p>

          {error && <div className="err-box">{error}</div>}

          <form onSubmit={submit}>
            <GoogleButton
              onSuccess={onGoogleSuccess}
              onError={onGoogleError}
              label="Sign in with the same Google account you use in the Invoix desktop app"
            />
            <div className="divider"><span>or use your user id</span></div>
            <div className="field">
              <label htmlFor="userId">User ID</label>
              <input
                id="userId"
                className="input"
                placeholder="e.g. yourbusiness"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                autoComplete="username"
                required
                autoFocus
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                className="input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <button className="btn btn-primary" style={{ width: '100%', marginTop: 6 }} disabled={busy}>
              {busy ? <span className="spinner" /> : <LogIn size={16} />}
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="auth-foot">
            New here? <Link to="/register">Create an account</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
