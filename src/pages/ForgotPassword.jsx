import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Receipt, ShieldCheck, KeyRound, MailCheck, ArrowRight } from 'lucide-react';
import { api } from '../api';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);

  const sendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await api.forgotPassword(userId, email);
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
    if (newPassword !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }
    setBusy(true);
    try {
      await api.resetPassword(userId, email, otp, newPassword);
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
            <form onSubmit={sendOtp}>
              <div className="field">
                <label htmlFor="fpUserId">User ID</label>
                <input
                  id="fpUserId"
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
                <label htmlFor="fpEmail">Email</label>
                <input
                  id="fpEmail"
                  className="input"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
              <button className="btn btn-primary" style={{ width: '100%', marginTop: 6, borderRadius: 12, padding: '13px' }} disabled={busy}>
                {busy ? <span className="spinner" /> : <MailCheck size={16} />}
                {busy ? 'Sending…' : 'Send code'}
                {!busy && <ArrowRight size={14} style={{ opacity: 0.7 }} />}
              </button>
            </form>
          ) : (
            <form onSubmit={reset}>
              <div className="field">
                <label htmlFor="fpOtp">One-time code</label>
                <input
                  id="fpOtp"
                  className="input"
                  placeholder="6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  autoComplete="one-time-code"
                  required
                  autoFocus
                  style={{ letterSpacing: '0.2em', fontFamily: 'var(--font-mono)' }}
                />
              </div>
              <div className="field">
                <label htmlFor="fpPass">New password</label>
                <input
                  id="fpPass"
                  className="input"
                  type="password"
                  placeholder="At least 4 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="fpConfirm">Confirm</label>
                <input
                  id="fpConfirm"
                  className="input"
                  type="password"
                  placeholder="Repeat password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
              <button className="btn btn-primary" style={{ width: '100%', marginTop: 6, borderRadius: 12, padding: '13px' }} disabled={busy}>
                {busy ? <span className="spinner" /> : <KeyRound size={16} />}
                {busy ? 'Setting…' : 'Set password'}
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
