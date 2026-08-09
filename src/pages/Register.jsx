import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Receipt, UserPlus, ShieldCheck } from 'lucide-react';
import { api } from '../api';
import GoogleButton from '../components/GoogleButton';

export default function Register() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  const onGoogleSuccess = () => navigate('/app', { replace: true });
  const onGoogleError = (err) => {
    setGoogleBusy(false);
    setError(err.message || 'Google sign-in failed');
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setBusy(true);
    try {
      const res = await api.post('/auth/register', { userId, password });
      setOk(`Account "${res.user.userId}" created. Signing you in…`);
      const login = await api.post('/auth/login', { userId, password });
      api.setSession(login.token, login.user);
      setTimeout(() => navigate('/app', { replace: true }), 600);
    } catch (err) {
      setError(err.message);
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
          <span className="eyebrow light">One account, two worlds</span>
          <h2>Create your portal account.</h2>
          <p>
            Use the same user id and password in the desktop app's
            <b style={{ color: '#fff' }}> Settings → Web Sync </b>
            section so your invoices flow from the app to the web automatically.
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
          <span className="eyebrow">Create workspace</span>
          <h1>Register</h1>
          <p>Pick a user id and password. Data syncs to this account.</p>

          {error && <div className="err-box">{error}</div>}
          {ok && <div className="ok-box">{ok}</div>}

          <form onSubmit={submit}>
            <GoogleButton
              onSuccess={onGoogleSuccess}
              onError={onGoogleError}
              label="Create an account with the same Google account you use in the Invoix desktop app"
            />
            <div className="divider"><span>or create with user id</span></div>
            <div className="field">
              <label htmlFor="rUserId">User ID</label>
              <input
                id="rUserId"
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
              <label htmlFor="rPassword">Password</label>
              <input
                id="rPassword"
                className="input"
                type="password"
                placeholder="At least 4 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="rConfirm">Confirm password</label>
              <input
                id="rConfirm"
                className="input"
                type="password"
                placeholder="Repeat your password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            <button className="btn btn-primary" style={{ width: '100%', marginTop: 6 }} disabled={busy}>
              {busy ? <span className="spinner" /> : <UserPlus size={16} />}
              {busy ? 'Creating…' : 'Create account'}
            </button>
          </form>

          <div className="auth-foot">
            Already registered? <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
