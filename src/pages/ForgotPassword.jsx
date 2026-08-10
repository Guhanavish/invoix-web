import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Receipt, ShieldCheck, KeyRound, MailCheck } from 'lucide-react';
import { api } from '../api';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [step, setStep] = useState(1); // 1 = request OTP, 2 = verify OTP + new password
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);

  const sendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await api.forgotPassword(userId, email);
      setOk(res.message || 'OTP sent to your email.');
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
      setOk('Password updated. Redirecting to sign in…');
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
          <div className="brand" style={{ paddingBottom: 0 }}>
            <div className="brand-mark"><Receipt size={18} /></div>
            <div>
              <div className="brand-name">Invoix</div>
              <div className="brand-sub">Billing · GST · E-Way</div>
            </div>
          </div>
        </div>
        <div className="inner">
          <span className="eyebrow light">Account recovery</span>
          <h2>Lost your password?<br />We'll email you a code.</h2>
          <p>
            Enter the user id and the email address linked to your account.
            An OTP will be emailed to you to set a new password.
          </p>
          <div className="auth-quote">
            <div className="mini-av"><ShieldCheck size={17} /></div>
            <blockquote>
              “A one-time code, sent only to your registered email, keeps
              your business data protected.”
            </blockquote>
          </div>
        </div>
      </div>

      <div className="auth-form-side">
        <div className="auth-box">
          <span className="eyebrow">Reset password</span>
          <h1>{step === 1 ? 'Request a code' : 'Enter the code'}</h1>
          {step === 1 && <p>We'll send a one-time code to your registered email.</p>}
          {step === 2 && <p>Enter the 6-digit code and choose a new password.</p>}

          {error && <div className="err-box">{error}</div>}
          {ok && <div className="ok-box">{ok}</div>}

          {step === 1 ? (
            <form onSubmit={sendOtp}>
              <div className="field">
                <label htmlFor="fpUserId">User ID</label>
                <input
                  id="fpUserId"
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
              <button className="btn btn-primary" style={{ width: '100%', marginTop: 6 }} disabled={busy}>
                {busy ? <span className="spinner" /> : <MailCheck size={16} />}
                {busy ? 'Sending…' : 'Send OTP'}
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
                <label htmlFor="fpConfirm">Confirm new password</label>
                <input
                  id="fpConfirm"
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
                {busy ? <span className="spinner" /> : <KeyRound size={16} />}
                {busy ? 'Resetting…' : 'Set new password'}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ width: '100%', marginTop: 8 }}
                onClick={() => { setStep(1); setError(''); setOk(''); }}
                disabled={busy}
              >
                Request a new code
              </button>
            </form>
          )}

          <div className="auth-foot">
            Remembered it? <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
