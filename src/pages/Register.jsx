import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Receipt, UserPlus, ShieldCheck, ArrowRight, WifiOff } from 'lucide-react';
import { api } from '../api';
import GoogleButton from '../components/GoogleButton';
import { FieldError, OfflineBar, useOnline } from '../components/ui';

const USER_ID_RE = /^[a-z0-9][a-z0-9._-]{1,31}$/i;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,253}\.[^\s@]{2,}$/;

export default function Register() {
  const navigate = useNavigate();
  const online = useOnline();
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [touched, setTouched] = useState({});
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

  const idError = !userId.trim()
    ? 'Pick a user id for your ledger.'
    : !USER_ID_RE.test(userId.trim())
      ? 'Use 2-32 characters: letters, numbers, dots, dashes or underscores.'
      : '';
  const emailError = !email.trim()
    ? 'Enter the email where we should send the code.'
    : !EMAIL_RE.test(email.trim())
      ? 'That email does not look complete. Check for typos.'
      : '';
  const pwError = !password
    ? 'Choose a password.'
    : password.length < 4
      ? `Add ${4 - password.length} more character${4 - password.length === 1 ? '' : 's'} (minimum 4).`
      : password.length > 128
        ? 'Keep it under 128 characters.'
        : '';
  const confirmError = !confirm
    ? 'Repeat the password.'
    : confirm !== password
      ? 'The two passwords do not match yet.'
      : '';
  const formValid = !idError && !emailError && !pwError && !confirmError;

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setOk('');
    setTouched({ userId: true, email: true, password: true, confirm: true });
    if (!formValid || !online) return;
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
            <form onSubmit={submit} noValidate>
              <OfflineBar />
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
                  className={`input ${touched.userId && idError ? 'invalid' : ''}`}
                  placeholder="e.g. mehta-fabrics"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, userId: true }))}
                  autoComplete="username"
                  autoFocus
                  aria-invalid={!!(touched.userId && idError)}
                />
                <FieldError error={touched.userId ? idError : ''} hint="This becomes your ledger's address. Letters, numbers, dots, dashes, underscores." />
              </div>
              <div className="field">
                <label htmlFor="rEmail">Email</label>
                <input
                  id="rEmail"
                  className={`input ${touched.email && emailError ? 'invalid' : ''}`}
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                  autoComplete="email"
                  aria-invalid={!!(touched.email && emailError)}
                />
                <FieldError error={touched.email ? emailError : ''} hint="We'll send a verification code here. Required for password recovery." />
              </div>
              <div className="field">
                <label htmlFor="rPassword">Password</label>
                <input
                  id="rPassword"
                  className={`input ${touched.password && pwError ? 'invalid' : ''}`}
                  type="password"
                  placeholder="At least 4 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                  autoComplete="new-password"
                  aria-invalid={!!(touched.password && pwError)}
                />
                <FieldError error={touched.password ? pwError : ''} hint="At least 4 characters. Longer is stronger." />
              </div>
              <div className="field">
                <label htmlFor="rConfirm">Confirm password</label>
                <input
                  id="rConfirm"
                  className={`input ${touched.confirm && confirmError ? 'invalid' : ''}`}
                  type="password"
                  placeholder="Repeat your password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
                  autoComplete="new-password"
                  aria-invalid={!!(touched.confirm && confirmError)}
                />
                {touched.confirm && confirmError && <FieldError error={confirmError} />}
              </div>
              <button className="btn btn-primary" style={{ width: '100%', marginTop: 6, borderRadius: 12, padding: '13px' }} disabled={busy || !formValid || !online} title={!online ? 'You are offline' : !formValid ? 'Fix the highlighted fields first' : ''}>
                {busy ? <span className="spinner" /> : !online ? <WifiOff size={16} /> : <UserPlus size={16} />}
                {busy ? 'Setting…' : !online ? 'Offline — reconnect to register' : 'Create folio'}
                {!busy && online && <ArrowRight size={14} style={{ opacity: 0.7 }} />}
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
                <input id="verifyCode" className="input" placeholder="6-digit code" value={verifyCode} onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 8))} style={{ letterSpacing: '0.2em', fontFamily: 'var(--font-mono)' }} inputMode="numeric" autoComplete="one-time-code" autoFocus />
                <FieldError hint="Digits only. Check spam if it has not arrived within a minute." />
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
