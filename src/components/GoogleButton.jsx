import React, { useEffect, useRef, useState } from 'react';
import { api, getConfig } from '../api';

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

export default function GoogleButton({ onSuccess, onError, onBusyChange, label = 'Continue with Google' }) {
  const btnRef = useRef(null);
  const [clientId, setClientId] = useState(null);
  const [failed, setFailed] = useState(false);
  const [errorDetail, setErrorDetail] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    getConfig().then((cfg) => {
      if (active) setClientId(cfg.googleClientId || null);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!clientId || !btnRef.current) return;
  }, [clientId]);

  // Wire up the GIS button once we have a client id and the DOM node.
  useEffect(() => {
    if (!clientId || !btnRef.current) return;
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
            callback: async (response) => {
              setBusy(true);
              onBusyChange && onBusyChange(true);
              try {
                const res = await api.googleLogin(response.credential);
                onSuccess && onSuccess(res);
              } catch (err) {
                const msg = err && err.message ? err.message : 'Google sign-in failed';
                setFailed(true);
                setErrorDetail(msg);
                onError && onError(err);
              } finally {
                setBusy(false);
                onBusyChange && onBusyChange(false);
              }
            },
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
  }, [clientId, onSuccess, onError]);

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
      <div ref={btnRef} style={{ width: '100%', minHeight: 44, opacity: busy ? 0.6 : 1, pointerEvents: busy ? 'none' : 'auto' }} />
      {busy && <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>Signing in with Google…</div>}
      {failed && (
        <div className="err-box" style={{ marginBottom: 0 }}>
          <div>Couldn’t complete Google sign-in.</div>
          {errorDetail && <div style={{ marginTop: 6, fontSize: 12, opacity: 0.9 }}>{errorDetail}</div>}
          <div style={{ marginTop: 6, fontSize: 11, color: 'var(--muted)' }}>If you are the owner and just configured Google, ensure <code>https://invoixweb.vercel.app</code> is an <b>Authorized JavaScript origin</b> in Google Cloud Console &gt; APIs & Credentials &gt; OAuth 2.0 Client. A new Google account without a profile will be auto-created.</div>
        </div>
      )}
      <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
        {label}
      </div>
    </div>
  );
}
