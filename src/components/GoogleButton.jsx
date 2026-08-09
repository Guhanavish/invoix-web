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

export default function GoogleButton({ onSuccess, onError, label = 'Continue with Google' }) {
  const btnRef = useRef(null);
  const [clientId, setClientId] = useState(null);
  const [failed, setFailed] = useState(false);

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
    loadGsiScript()
      .then(async () => {
        if (!active || !window.google?.accounts?.id) return;
        await new Promise((r) => setTimeout(r, 0));
        if (!active) return;
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: async (response) => {
              try {
                const res = await api.googleLogin(response.credential);
                onSuccess && onSuccess(res);
              } catch (err) {
                setFailed(true);
                onError && onError(err);
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
        }
      })
      .catch(() => setFailed(true));
    return () => { active = false; };
  }, [clientId, onSuccess, onError]);

  if (!clientId) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
      <div ref={btnRef} style={{ width: '100%', minHeight: 44 }} />
      {failed && (
        <div className="err-box" style={{ marginBottom: 0 }}>
          Couldn’t load Google sign-in. Use your user id and password below.
        </div>
      )}
      <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
        {label}
      </div>
    </div>
  );
}
