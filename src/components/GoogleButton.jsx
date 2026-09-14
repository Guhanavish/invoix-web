import React, { useEffect, useRef, useState } from 'react';
import { api, getConfig } from '../api';
import { useConsent } from './CookieConsent';

// Loads the Google Identity Services script once.
let gsiScriptPromise = null;
function loadGsiScript() {
  if (gsiScriptPromise) return gsiScriptPromise;
  gsiScriptPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return gsiScriptPromise;
}

const USER_ID_RE = /^[a-z0-9][a-z0-9._-]{1,31}$/i;

export default function GoogleButton({ onSuccess, onError, onBusyChange, label = 'Continue with Google' }) {
  const btnRef = useRef(null);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const onBusyRef = useRef(onBusyChange);
  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;
  onBusyRef.current = onBusyChange;

  const [clientId, setClientId] = useState(null);
  const [failed, setFailed] = useState(false);
  const [errorDetail, setErrorDetail] = useState('');
  const [busy, setBusy] = useState(false);
  // First-time Google signup: server asks the user to pick their backup/sync user id.
  const [pendingCredential, setPendingCredential] = useState(null);
  const [pendingProfile, setPendingProfile] = useState(null); // { email, name }
  const [chosenId, setChosenId] = useState('');
  const [chooserError, setChooserError] = useState('');
  const [chooserBusy, setChooserBusy] = useState(false);
  const consent = useConsent();
  const declined = consent === 'declined';

  useEffect(() => {
    let active = true;
    getConfig().then((cfg) => {
      if (active) setClientId(cfg.googleClientId || null);
    });
    return () => { active = false; };
  }, []);

  const setAllBusy = (v) => {
    setBusy(v);
    onBusyRef.current && onBusyRef.current(v);
  };

  const fail = (err) => {
    const msg = err && err.message ? err.message : 'Google sign-in failed';
    setFailed(true);
    setErrorDetail(msg);
    onErrorRef.current && onErrorRef.current(err);
  };

  const handleCredential = async (credential) => {
    setAllBusy(true);
    setFailed(false);
    setErrorDetail('');
    try {
      const res = await api.googleLogin(credential);
      onSuccessRef.current && onSuccessRef.current(res);
    } catch (err) {
      if (err && (err.code === 'NEEDS_USER_ID' || err.status === 409 && /user id/i.test(err.message || ''))) {
        // New Google account: pause here and ask for a user id BEFORE creating anything.
        setPendingCredential(credential);
        setPendingProfile({ email: err.email || null, name: err.name || null });
        // Server may send a suggestion on the error payload (suggestedUserId).
        const suggestion = (err && err.suggestedUserId) || '';
        setChosenId(suggestion);
        setChooserError('');
      } else {
        fail(err);
      }
    } finally {
      setAllBusy(false);
    }
  };

  // Wire up the GIS button once we have a client id and the DOM node.
  // Google scripts only load when third-party cookies were not declined.
  useEffect(() => {
    if (!clientId || !btnRef.current || declined) return;
    let active = true;
    setFailed(false);
    setErrorDetail('');
    loadGsiScript()
      .then(async () => {
        if (!active || !window.google?.accounts?.id) return;
        await new Promise((r) => setTimeout(r, 0));
        if (!active) return;
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (response) => { handleCredential(response.credential); },
            auto_select: false,
          });
          window.google.accounts.id.renderButton(btnRef.current, {
            theme: 'outline',
            size: 'large',
            width: btnRef.current.clientWidth || 320,
            text: 'continue_with',
            logo_alignment: 'left',
          });
        } catch (e) {
          setFailed(true);
          setErrorDetail(e && e.message ? e.message : 'Could not initialize Google sign-in. If this is a new deployment, make sure https://invoixweb.vercel.app is listed as an Authorized JavaScript origin in Google Cloud Console.');
        }
      })
      .catch((e) => {
        setFailed(true);
        setErrorDetail(e && e.message ? e.message : 'Could not load https://accounts.google.com/gsi/client — check network or adblocker.');
      });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, declined]);

  const chooserIdError = !chosenId.trim()
    ? 'Pick a user id — you will need it for backup and desktop sync.'
    : !USER_ID_RE.test(chosenId.trim())
      ? 'Use 2-32 characters: letters, numbers, dots, dashes or underscores.'
      : /^g_/i.test(chosenId.trim())
        ? 'Ids starting with "g_" are reserved. Pick another.'
        : '';

  const confirmChooser = async (e) => {
    e && e.preventDefault();
    setChooserError('');
    if (chooserIdError || !pendingCredential) return;
    setChooserBusy(true);
    try {
      const res = await api.googleLogin(pendingCredential, chosenId.trim().toLowerCase());
      setPendingCredential(null);
      onSuccessRef.current && onSuccessRef.current(res);
    } catch (err) {
      // Stay on the chooser so the user can fix the id and retry.
      setChooserError(err.message || 'Could not create your account. Try another user id.');
    } finally {
      setChooserBusy(false);
    }
  };

  const cancelChooser = () => {
    setPendingCredential(null);
    setPendingProfile(null);
    setChosenId('');
    setChooserError('');
  };

  if (declined) {
    return (
      <div className="google-unavailable">
        <div className="google-unavailable-title">Google sign-in is off for you.</div>
        <div className="google-unavailable-sub">
          You declined third-party cookies, so Google scripts are not loaded. Sign in with a user id and password below instead.
        </div>
      </div>
    );
  }

  if (!clientId) {
    return (
      <div className="google-unavailable">
        <div className="google-unavailable-title">Google sign-in is not enabled on this portal yet.</div>
        <div className="google-unavailable-sub">
          The site owner needs to add a <code>GOOGLE_CLIENT_ID</code> in the Vercel settings, then redeploy.
          You can still sign in with a user id and password below.
        </div>
      </div>
    );
  }

  // ── Step 2 of Google signup: pick the permanent user id first ──
  if (pendingCredential) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', border: '1px solid var(--line-strong)', borderRadius: 12, padding: 14, background: 'var(--paper-2)' }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>Pick your User ID to finish</div>
        <div style={{ fontSize: 13, color: 'var(--stone)', lineHeight: 1.5 }}>
          {pendingProfile?.email ? <>Signed in with Google as <b style={{ color: 'var(--ink)' }}>{pendingProfile.email}</b>. </> : null}
          Choose the permanent <b style={{ color: 'var(--ink)' }}>User ID</b> for this account — you will need it for
          backup and for <b style={{ color: 'var(--ink)' }}>desktop app → Settings → Web Sync</b>. This cannot be changed later.
        </div>
        <form onSubmit={confirmChooser}>
          <div className="field" style={{ marginBottom: 8 }}>
            <label htmlFor="google-userid">User ID</label>
            <input
              id="google-userid"
              className={`input ${chooserIdError ? 'invalid' : ''}`}
              placeholder="e.g. mehta-fabrics"
              value={chosenId}
              onChange={(e) => setChosenId(e.target.value)}
              autoComplete="username"
              autoFocus
              aria-invalid={!!chooserIdError}
            />
            {chooserIdError
              ? <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>{chooserIdError}</div>
              : <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Letters, numbers, dots, dashes or underscores. Save it somewhere safe.</div>}
          </div>
          {chooserError && <div className="err-box" style={{ marginBottom: 8 }}>{chooserError}</div>}
          <button className="btn btn-primary" style={{ width: '100%', borderRadius: 10, padding: '11px' }} disabled={chooserBusy || !!chooserIdError}>
            {chooserBusy ? <span className="spinner" /> : null}
            {chooserBusy ? 'Creating…' : 'Create account and continue'}
          </button>
          <button type="button" className="btn btn-ghost" style={{ width: '100%', marginTop: 8, borderRadius: 10 }} onClick={cancelChooser} disabled={chooserBusy}>
            Use a different Google account
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
      <div ref={btnRef} style={{ width: '100%', minHeight: 44, opacity: busy ? 0.6 : 1, pointerEvents: busy ? 'none' : 'auto' }} />
      {busy && <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>Signing in with Google…</div>}
      {failed && (
        <div className="err-box" style={{ marginBottom: 0 }}>
          <div>Couldn’t complete Google sign-in.</div>
          {errorDetail && <div style={{ marginTop: 6, fontSize: 12, opacity: 0.9 }}>{errorDetail}</div>}
          <div style={{ marginTop: 6, fontSize: 11, color: 'var(--muted)' }}>If you are the owner and just configured Google, ensure <code>https://invoixweb.vercel.app</code> is an <b>Authorized JavaScript origin</b> in Google Cloud Console &gt; APIs & Credentials &gt; OAuth 2.0 Client. First-time Google users will be asked to pick a user id before the account is created.</div>
        </div>
      )}
      <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
        {label}
      </div>
    </div>
  );
}
