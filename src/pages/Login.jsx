import React, { useState } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Receipt, LogIn, ShieldCheck, ArrowRight, WifiOff, KeyRound } from 'lucide-react';
import { api } from '../api';
import GoogleButton from '../components/GoogleButton';
import { FieldError, OfflineBar, useOnline } from '../components/ui';

const USER_ID_RE = /^[a-z0-9][a-z0-9._-]{1,31}$/i;

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const online = useOnline();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState({});
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [needVerify, setNeedVerify] = useState(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [honey, setHoney] = useState('');

  const expired = params.get('expired') === '1';
  const nextParam = params.get('next');
  const safeNext = nextParam && nextParam.startsWith('/app') ? nextParam : null;
  const destination = () => {
    if (safeNext) return safeNext;
    const from = location.state?.from?.pathname?.startsWith('/app') ? location.state.from.pathname : '/app';
    return from;
  };

  const idError = !userId.trim()
    ? 'Enter your user id.'
    : !USER_ID_RE.test(userId.trim())
      ? 'User ids use letters, numbers, dots, dashes or underscores (2-32 characters).'
      : '';
  const pwError = !password ? 'Enter your password.' : '';
  const formValid = !idError && !pwError;

  const onGoogleSuccess = () => {
    setError('');
    setGoogleBusy(false);
    navigate(destination(), { replace: true });
  };
  const onGoogleError = (err) => {
    setGoogleBusy(false);
    const msg = err && err.message ? err.message : 'Google sign-in failed';
    setError(msg);
  };

  const submit = async (e) => {
    e.preventDefault();
    setTouched({ userId: true, password: true });
    if (!formValid || !online) return;
    setError(''); setOk('');
    setBusy(true);
    try {
      const res = await api.post('/auth/login', { userId: userId.trim(), password, website: honey || undefined });
      api.setSession(res.token, res.user);
      navigate(destination(), { replace: true });
    } catch (err) {
      if (err.status === 403 && err.message && err.message.includes('Email not verified')) {
        setNeedVerify({ userId: userId.trim(), email: err.email || '' });
        try { await api.requestEmailVerification(userId.trim()); setOk('Verification code sent to your registered email. Enter it below.'); } catch (e2) { setError(e2.message); }
      } else {
        setError(err.network ? err.message : 'Those details did not match. Check the user id and password, then try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  const confirmVerify = async (e) => {
    e.preventDefault();
    setError(''); setOk('');
    setBusy(true);
    try {
      const res = await api.confirmEmailVerification(needVerify.userId, verifyCode);
      api.setSession(res.token, res.user);
      setOk('Email verified! Opening…');
      setTimeout(() => navigate(destination(), { replace: true }), 600);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
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
          <span className="eyebrow light" style={{ color: '#c4a99a' }}>Your business, kept</span>
          <h2>Every entry from<br />your <i>desktop atelier.</i></h2>
          <p>
            Sign in with the user id you set — the same one you entered in the desktop app's
            <b style={{ color: '#fdfcf8', fontFamily: 'var(--font-body)', fontWeight: 600 }}> Settings → Web Sync</b>. Your ledger appears, typeset.
          </p>
          <div className="auth-quote">
            <div className="mini-av"><ShieldCheck size={17} /></div>
            <blockquote>
              "The portal is my second shop — I check the day's invoices from the train. Same figures, same ink."
            </blockquote>
          </div>
          <div style={{ marginTop: 24, display: 'flex', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6b6560' }}>
            <span>◆ Offline-first</span>
            <span>◆ Encrypted</span>
            <span>◆ GST-ready</span>
          </div>
        </div>
      </div>

      <div className="auth-form-side">
        <div className="auth-box">
          <span className="eyebrow" style={{ color: 'var(--oxide)' }}>Workspace access</span>
          <h1>Sign <i style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 300 }}>in</i></h1>
          <p>Enter your user id and password to open the folio.</p>

          {expired && !needVerify && (
            <div className="ok-box" style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <KeyRound size={15} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>Your session expired, please sign in again{safeNext ? ' — you will return right where you left off' : ''}.</span>
            </div>
          )}
          {error && <div className="err-box">{error}</div>}
          {ok && <div className="ok-box">{ok}</div>}

          {!needVerify ? (
            <form onSubmit={submit} noValidate>
              <OfflineBar />
              <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', top: 'auto', width: 1, height: 1, overflow: 'hidden' }}>
                <label>Website<input type="text" name="website" value={honey} onChange={(e) => setHoney(e.target.value)} tabIndex={-1} autoComplete="off" /></label>
              </div>
              <GoogleButton
                onSuccess={onGoogleSuccess}
                onError={onGoogleError}
                onBusyChange={setGoogleBusy}
                label="Sign in with the same Google account you use in the desktop app"
              />
              {googleBusy && <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>Contacting Google…</div>}
              <div className="divider"><span>or use your user id</span></div>
              <div className="field">
                <label htmlFor="userId">User ID</label>
                <input
                  id="userId"
                  className={`input ${touched.userId && idError ? 'invalid' : ''}`}
                  placeholder="e.g. mehta-fabrics"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, userId: true }))}
                  autoComplete="username"
                  autoFocus
                  aria-invalid={!!(touched.userId && idError)}
                  aria-describedby="userId-hint"
                />
                <span id="userId-hint"><FieldError error={touched.userId ? idError : ''} hint="Letters, numbers, dots, dashes or underscores." /></span>
              </div>
              <div className="field">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  className={`input ${touched.password && pwError ? 'invalid' : ''}`}
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                  autoComplete="current-password"
                  aria-invalid={!!(touched.password && pwError)}
                />
                {touched.password && pwError && <FieldError error={pwError} />}
              </div>
              <div style={{ textAlign: 'right', marginTop: 2, marginBottom: 6 }}>
                <Link to="/forgot" style={{ color: 'var(--ink)', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, borderBottom: '1px solid var(--line-strong)', paddingBottom: 1 }}>Forgot password?</Link>
              </div>
              <button className="btn btn-primary" style={{ width: '100%', marginTop: 6, borderRadius: 12, padding: '13px' }} disabled={busy || !formValid || !online} title={!online ? 'You are offline' : !formValid ? 'Fix the highlighted fields first' : ''}>
                {busy ? <span className="spinner" /> : !online ? <WifiOff size={16} /> : <LogIn size={16} />}
                {busy ? 'Opening…' : !online ? 'Offline — reconnect to sign in' : 'Open workspace'}
                {!busy && online && <ArrowRight size={14} style={{ opacity: 0.7 }} />}
              </button>
            </form>
          ) : (
            <form onSubmit={confirmVerify}>
              <div style={{ border: '1px solid #fde68a', background: '#fffbeb', borderRadius: 10, padding: 12, marginBottom: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Verify your email</div>
                <div style={{ fontSize: 13, color: 'var(--stone)' }}>Your email is not yet verified. Code sent to <b style={{ color: 'var(--ink)' }}>{needVerify.email || 'your email'}</b>. Enter it below to continue.</div>
              </div>
              <div className="field">
                <label htmlFor="verifyCode">Verification code</label>
                <input id="verifyCode" className="input" placeholder="6-digit code" value={verifyCode} onChange={(e) => setVerifyCode(e.target.value)} style={{ letterSpacing: '0.2em', fontFamily: 'var(--font-mono)' }} required autoFocus />
              </div>
              <button className="btn btn-primary" style={{ width: '100%', marginTop: 6, borderRadius: 12, padding: '13px' }} disabled={busy}>
                {busy ? <span className="spinner" /> : <ShieldCheck size={16} />}
                {busy ? 'Verifying…' : 'Verify email'}
              </button>
              <button type="button" className="btn btn-ghost" style={{ width: '100%', marginTop: 10, borderRadius: 12 }} onClick={async () => { setError(''); try { await api.requestEmailVerification(needVerify.userId); setOk('Code resent'); } catch (e) { setError(e.message); } }} disabled={busy}>Resend code</button>
              <button type="button" className="btn btn-ghost" style={{ width: '100%', marginTop: 6, borderRadius: 12 }} onClick={() => { setNeedVerify(null); setVerifyCode(''); setError(''); setOk(''); }} disabled={busy}>Back to sign in</button>
            </form>
          )}

          <div className="auth-foot">
            New to the press? <Link to="/register">Create account</Link>
          </div>
          <div style={{ marginTop: 18, textAlign: 'center', fontFamily: 'var(--font-editorial)', fontStyle: 'italic', color: 'var(--stone)', fontSize: 13 }}>
            Ink on paper, now on the web.
          </div>
        </div>
      </div>
    </div>
  );
}
