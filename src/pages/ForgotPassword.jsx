import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Receipt, ShieldCheck, KeyRound, MailCheck, ArrowRight, WifiOff } from 'lucide-react';
import { api } from '../api';
import { FieldError, OfflineBar, useOnline } from '../components/ui';

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,253}\.[^\s@]{2,}$/;

export default function ForgotPassword() {
  const navigate = useNavigate();
  const online = useOnline();
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [step, setStep] = useState(1);
  const [touched, setTouched] = useState({});
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);

  const idError = !userId.trim() ? 'Enter your user id.' : '';
  const emailError = !email.trim()
    ? 'Enter the email on your account.'
    : !EMAIL_RE.test(email.trim())
      ? 'That email does not look complete. Check for typos.'
      : '';
  const stepValid = !idError && !emailError;

  const otpError = !otp.trim()
    ? 'Enter the 6-digit code from your email.'
    : !/^\d{4,8}$/.test(otp.trim())
      ? 'Codes are digits only. Check the email again.'
      : '';
  const pwError = !newPassword
    ? 'Choose a new password.'
    : newPassword.length < 4
      ? `Add ${4 - newPassword.length} more character${4 - newPassword.length === 1 ? '' : 's'} (minimum 4).`
      : '';
  const confirmError = confirm !== newPassword ? 'The two passwords do not match yet.' : '';
  const resetValid = !otpError && !pwError && !confirmError;

  const sendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setTouched({ userId: true, email: true });
    if (!stepValid || !online) return;
    setBusy(true);
    try {
      const res = await api.forgotPassword(userId.trim(), email.trim());
      setOk(res.message || 'Code sent to your email.');
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const reset = async (e) => {
    e.preventDefault();
    setError('');
    setTouched((t) => ({ ...t, otp: true, newPassword: true, confirm: true }));
    if (!resetValid || !online) return;
    setBusy(true);
    try {
      await api.resetPassword(userId.trim(), email.trim(), otp.trim(), newPassword);
      setOk('Password set. Opening sign in…');
      setTimeout(() => navigate('/login', { replace: true }), 1200);
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
          <div className="brand" style={{ paddingBottom: 0, border: 'none' }}>
            <div className="brand-mark"><Receipt size={18} /></div>
            <div>
              <div className="brand-name" style={{ color: '#fdfcf8' }}>Invoix</div>
              <div className="brand-sub" style={{ color: '#9a9590' }}>Ledger · Billing · GST</div>
            </div>
          </div>
        </div>
        <div className="inner">
          <span className="eyebrow light" style={{ color: '#c4a99a' }}>Account recovery</span>
          <h2>Lost your <i>key?</i></h2>
          <p>
            Enter the user id and the email on file. A one-time code will be pressed
            to your inbox to set a new password.
          </p>
          <div className="auth-quote">
            <div className="mini-av"><ShieldCheck size={17} /></div>
            <blockquote>
              "A single code, to your registered email only. Your folio stays shut to others."
            </blockquote>
          </div>
        </div>
      </div>

      <div className="auth-form-side">
        <div className="auth-box">
          <span className="eyebrow">Reset</span>
          <h1>{step === 1 ? 'Request code' : 'Set new key'}</h1>
          {step === 1 && <p style={{ fontFamily: 'var(--font-editorial)', fontStyle: 'italic' }}>We'll press a code to your email.</p>}
          {step === 2 && <p style={{ fontFamily: 'var(--font-editorial)', fontStyle: 'italic' }}>Enter the 6-digit code and choose a new password.</p>}

          {error && <div className="err-box">{error}</div>}
          {ok && <div className="ok-box">{ok}</div>}

          {step === 1 ? (
            <form onSubmit={sendOtp} noValidate>
              <OfflineBar />
              <div className="field">
                <label htmlFor="fpUserId">User ID</label>
                <input
                  id="fpUserId"
                  className={`input ${touched.userId && idError ? 'invalid' : ''}`}
                  placeholder="e.g. mehta-fabrics"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, userId: true }))}
                  autoComplete="username"
                  autoFocus
                  aria-invalid={!!(touched.userId && idError)}
                />
                {touched.userId && idError && <FieldError error={idError} />}
              </div>
              <div className="field">
                <label htmlFor="fpEmail">Email</label>
                <input
                  id="fpEmail"
                  className={`input ${touched.email && emailError ? 'invalid' : ''}`}
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                  autoComplete="email"
                  aria-invalid={!!(touched.email && emailError)}
                />
                <FieldError error={touched.email ? emailError : ''} hint="The verified email on your account." />
              </div>
              <button className="btn btn-primary" style={{ width: '100%', marginTop: 6, borderRadius: 12, padding: '13px' }} disabled={busy || !stepValid || !online} title={!online ? 'You are offline' : !stepValid ? 'Fix the highlighted fields first' : ''}>
                {busy ? <span className="spinner" /> : !online ? <WifiOff size={16} /> : <MailCheck size={16} />}
                {busy ? 'Sending…' : !online ? 'Offline — reconnect to continue' : 'Send code'}
                {!busy && online && <ArrowRight size={14} style={{ opacity: 0.7 }} />}
              </button>
            </form>
          ) : (
            <form onSubmit={reset} noValidate>
              <OfflineBar />
              <div className="field">
                <label htmlFor="fpOtp">One-time code</label>
                <input
                  id="fpOtp"
                  className={`input ${touched.otp && otpError ? 'invalid' : ''}`}
                  placeholder="6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  onBlur={() => setTouched((t) => ({ ...t, otp: true }))}
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  autoFocus
                  style={{ letterSpacing: '0.2em', fontFamily: 'var(--font-mono)' }}
                  aria-invalid={!!(touched.otp && otpError)}
                />
                <FieldError error={touched.otp ? otpError : ''} hint="Digits only. Valid for 10 minutes." />
              </div>
              <div className="field">
                <label htmlFor="fpPass">New password</label>
                <input
                  id="fpPass"
                  className={`input ${touched.newPassword && pwError ? 'invalid' : ''}`}
                  type="password"
                  placeholder="At least 4 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, newPassword: true }))}
                  autoComplete="new-password"
                  aria-invalid={!!(touched.newPassword && pwError)}
                />
                <FieldError error={touched.newPassword ? pwError : ''} hint="At least 4 characters. Longer is stronger." />
              </div>
              <div className="field">
                <label htmlFor="fpConfirm">Confirm</label>
                <input
                  id="fpConfirm"
                  className={`input ${touched.confirm && confirmError ? 'invalid' : ''}`}
                  type="password"
                  placeholder="Repeat password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
                  autoComplete="new-password"
                  aria-invalid={!!(touched.confirm && confirmError)}
                />
                {touched.confirm && confirmError && <FieldError error={confirmError} />}
              </div>
              <button className="btn btn-primary" style={{ width: '100%', marginTop: 6, borderRadius: 12, padding: '13px' }} disabled={busy || !resetValid || !online} title={!online ? 'You are offline' : !resetValid ? 'Fix the highlighted fields first' : ''}>
                {busy ? <span className="spinner" /> : !online ? <WifiOff size={16} /> : <KeyRound size={16} />}
                {busy ? 'Setting…' : !online ? 'Offline — reconnect to continue' : 'Set password'}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ width: '100%', marginTop: 10, borderRadius: 12 }}
                onClick={() => { setStep(1); setError(''); setOk(''); }}
                disabled={busy}
              >
                Request new code
              </button>
            </form>
          )}

          <div className="auth-foot">
            Remembered? <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
