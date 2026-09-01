import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Receipt, UserPlus, ShieldCheck, ArrowRight } from 'lucide-react';
import { api } from '../api';
import GoogleButton from '../components/GoogleButton';

export default function Register() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [needsVerify, setNeedsVerify] = useState(false);
  const [verifyUserId, setVerifyUserId] = useState('');
  const [verifyCode, setVerifyCode] = useState('');

  const onGoogleSuccess = () => navigate('/app', { replace: true });
  const onGoogleError = (err) => {
    setGoogleBusy(false);
    setError(err.message || 'Google sign-in failed');
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setOk('');
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setBusy(true);
    try {
      const res = await api.post('/auth/register', { userId, password, email });
      if (res.requiresVerification) {
        setOk(res.message || `Account created. Code sent to ${email}. Enter it below.`);
        setNeedsVerify(true);
        setVerifyUserId(res.userId || userId);
        setBusy(false);
        return;
      }
      setOk(`Account "${res.userId || userId}" set. Opening folio…`);
      if (res.token) {
        api.setSession(res.token, res.user);
        setTimeout(() => navigate('/app', { replace: true }), 600);
        return;
      }
      let login = null;
      for (let i = 0; i < 5 && !login; i++) {
        try {
          login = await api.post('/auth/login', { userId, password });
        } catch (err) {
          if (err.status === 403 && err.message.includes('Email not verified')) {
            setNeedsVerify(true);
            setVerifyUserId(userId);
            setOk('Account created. Verification code sent to ' + email);
            setBusy(false);
            return;
          }
          if (i < 4) await new Promise((r) => setTimeout(r, 800 * (i + 1)));
          else throw err;
        }
      }
      api.setSession(login.token, login.user);
      setTimeout(() => navigate('/app', { replace: true }), 600);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const confirmVerify = async (e) => {
    e.preventDefault();
    setError(''); setOk('');
    setBusy(true);
    try {
      const res = await api.confirmEmailVerification(verifyUserId, verifyCode);
      api.setSession(res.token, res.user);
      setOk('Email verified! Opening folio…');
      setTimeout(() => navigate('/app', { replace: true }), 600);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const resendCode = async () => {
    setError(''); setOk('');
    try {
      await api.requestEmailVerification(verifyUserId);
      setOk('Code resent to your email.');
    } catch (err) { setError(err.message); }
  };

  return (
    <div className="auth">
      <div className="auth-brand">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="brand" style={{ paddingBottom: 0, border: 'none' }}>
            <div className="brand-mark"><Receipt size={18} /></div>
            <div>
              <div className="brand-name" style={{ color: '#fdfcf8' }}>Invoix</div>
              <div className="brand-sub" style={{ color: '#9a9590' }}>Ledger · Billing · GST</div>
            </div>
          </div>
        </div>
        <div className="inner">
          <span className="eyebrow light" style={{ color: '#c4a99a' }}>One account, two presses</span>
          <h2>Create your <i>folio.</i></h2>
          <p>
            The same user id you set here goes into the desktop app's
            <b style={{ color: '#fdfcf8', fontWeight: 600 }}> Settings → Web Sync</b>. Your invoices are then pressed to the web automatically.
          </p>
          <div className="auth-quote">
            <div className="mini-av"><ShieldCheck size={17} /></div>
            <blockquote>
              "I set the ledger once in the shop; the portal kept it. My books, always set."
            </blockquote>
          </div>
        </div>
      </div>

      <div className="auth-form-side">
        <div className="auth-box">
          <span className="eyebrow">Create workspace</span>
          <h1>Register</h1>
          <p style={{ fontFamily: 'var(--font-editorial)', fontStyle: 'italic' }}>Pick a user id — your ledger's name.</p>

          {error && <div className="err-box">{error}</div>}
          {ok && <div className="ok-box">{ok}</div>}

          {!needsVerify ? (
            <form onSubmit={submit}>
              <GoogleButton
                onSuccess={onGoogleSuccess}
                onError={onGoogleError}
                label="Create with the same Google account you use in the desktop app"
              />
              <div className="divider"><span>or create with user id</span></div>
              <div className="field">
                <label htmlFor="rUserId">User ID</label>
                <input
                  id="rUserId"
                  className="input"
                  placeholder="e.g. mehta-fabrics"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  autoComplete="username"
                  required
                  autoFocus
                />
              </div>
              <div className="field">
                <label htmlFor="rEmail">Email</label>
                <input
                  id="rEmail"
                  className="input"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
                <small style={{ color: 'var(--stone)', fontFamily: 'var(--font-editorial)', fontStyle: 'italic', fontSize: 12, display: 'block', marginTop: 4 }}>
                  We'll send a verification code to this email. Required for password recovery.
                </small>
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
              <button className="btn btn-primary" style={{ width: '100%', marginTop: 6, borderRadius: 12, padding: '13px' }} disabled={busy}>
                {busy ? <span className="spinner" /> : <UserPlus size={16} />}
                {busy ? 'Setting…' : 'Create folio'}
                {!busy && <ArrowRight size={14} style={{ opacity: 0.7 }} />}
              </button>
            </form>
          ) : (
            <form onSubmit={confirmVerify}>
              <div style={{ border: '1px solid var(--line)', background: 'var(--paper-2)', borderRadius: 10, padding: 12, marginBottom: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Verify your email</div>
                <div style={{ fontSize: 13, color: 'var(--stone)' }}>Code sent to <b style={{ color: 'var(--ink)' }}>{email}</b> for <b>{verifyUserId}</b>. Enter it below.</div>
              </div>
              <div className="field">
                <label htmlFor="verifyCode">Verification code</label>
                <input id="verifyCode" className="input" placeholder="6-digit code" value={verifyCode} onChange={(e) => setVerifyCode(e.target.value)} style={{ letterSpacing: '0.2em', fontFamily: 'var(--font-mono)' }} required autoFocus />
              </div>
              <button className="btn btn-primary" style={{ width: '100%', marginTop: 6, borderRadius: 12, padding: '13px' }} disabled={busy}>
                {busy ? <span className="spinner" /> : <ShieldCheck size={16} />}
                {busy ? 'Verifying…' : 'Verify email'}
              </button>
              <button type="button" className="btn btn-ghost" style={{ width: '100%', marginTop: 10, borderRadius: 12 }} onClick={resendCode} disabled={busy}>Resend code</button>
            </form>
          )}

          <div className="auth-foot">
            Already set? <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
